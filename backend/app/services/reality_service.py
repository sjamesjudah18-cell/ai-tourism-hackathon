"""
The Reality Engine.

Composes the TravelReality object: overall readiness, confidence, and the eight
category sections, plus the alerts derived from them.

Two properties matter more than anything else here:

  1. **Per-section isolation.** Every category is built inside its own guard. A
     failure in one - a timeout, a malformed payload, a bug - degrades that
     section to "unavailable" and leaves the other seven intact. One broken
     external API can never take down the trip page.

  2. **Deterministic composition.** Overall status and confidence are derived
     in code from the sections, never asked of the language model.
"""

from __future__ import annotations

import traceback
from datetime import date
from typing import Any, Callable

from sqlalchemy.orm import Session

from app.core.reality import (
    Confidence,
    Severity,
    Status,
    derive_overall_confidence,
    derive_overall_status,
    iso,
    now_utc,
    section_unavailable,
)
from app.services import (
    alert_service,
    cost_service,
    culture_service,
    food_service,
    hotel_reality,
    news_service,
    traffic_service,
    weather_reality,
)
from app.services.geo_service import resolve_destination

# The eight categories, in the order the Reality Check presents them.
SECTION_ORDER = [
    "weather",
    "traffic",
    "local_updates",
    "cost_reality",
    "transport",
    "hotel_reality",
    "food_reality",
    "local_culture",
]

SECTION_TITLES = {
    "weather": "Weather",
    "traffic": "Traffic",
    "local_updates": "Local Updates",
    "cost_reality": "Cost Reality",
    "transport": "Transport",
    "hotel_reality": "Accommodation",
    "food_reality": "Food",
    "local_culture": "Things To Know",
}


def _safe_section(key: str, builder: Callable[[], dict]) -> dict:
    """
    Runs one section builder in isolation.

    Any exception becomes an unavailable section rather than a failed request -
    this is the guarantee that one broken service cannot crash the page.
    """
    try:
        return builder()
    except Exception:
        # Logged for the developer, never surfaced to the traveller.
        print(f"[reality] section '{key}' failed:\n{traceback.format_exc()}")
        return section_unavailable(
            key,
            SECTION_TITLES.get(key, key.replace("_", " ").title()),
            "Live data for this section is temporarily unavailable.",
        )


def build_travel_reality(
    db: Session,
    destination: str,
    number_of_days: int,
    number_of_travelers: int = 1,
    total_budget: float = 0.0,
    accommodation_preference: str | None = "Comfort",
    itinerary: list[dict] | None = None,
    hotels: list[dict] | None = None,
    start_date: date | None = None,
    origin: str | None = None,
    include_alerts: bool = True,
) -> dict[str, Any]:
    """
    Builds the full TravelReality object for a trip.

    `itinerary` is optional - without it the destination-level categories still
    work, and the itinerary-dependent ones (traffic, news relevance) degrade
    gracefully rather than failing.
    """
    itinerary = itinerary or []

    location = resolve_destination(db, destination)
    if not location:
        return _unresolvable(destination, number_of_days)

    latitude = location["latitude"]
    longitude = location["longitude"]

    # A coastal destination's centroid is often inland, so sample marine
    # conditions at an actual beach stop in the plan when there is one.
    marine_coords, marine_place = _find_coastal_stop(itinerary)

    sections: dict[str, dict] = {}

    sections["weather"] = _safe_section("weather", lambda: weather_reality.build_weather_section(
        destination=location["name"],
        latitude=latitude,
        longitude=longitude,
        number_of_days=number_of_days,
        start_date=start_date,
        is_coastal=location.get("is_coastal", False),
        marine_coords=marine_coords,
        marine_place_name=marine_place,
    ))

    sections["traffic"] = _safe_section("traffic", lambda: traffic_service.build_traffic_section(
        destination=location["name"],
        itinerary=itinerary,
        start_date=start_date,
    ))

    sections["local_updates"] = _safe_section("local_updates", lambda: news_service.build_local_updates(
        destination=location["name"],
        itinerary=itinerary,
    ))

    sections["hotel_reality"] = _safe_section("hotel_reality", lambda: hotel_reality.build_hotel_section(
        db=db,
        destination=location["name"],
        preference=accommodation_preference or "Comfort",
        days=number_of_days,
        itinerary=itinerary,
    ))

    # Cost reality reuses whatever hotels the accommodation section resolved, so
    # the two never quote different rates for the same properties.
    resolved_hotels = hotels
    if resolved_hotels is None:
        resolved_hotels = (sections["hotel_reality"].get("details") or {}).get("hotels") or []

    sections["cost_reality"] = _safe_section("cost_reality", lambda: cost_service.build_cost_section(
        destination=location["name"],
        number_of_days=number_of_days,
        number_of_travelers=number_of_travelers,
        total_budget=total_budget,
        accommodation_preference=accommodation_preference,
        itinerary=itinerary,
        hotels=resolved_hotels,
        origin=origin,
    ))

    # Transport lives in its own module to keep this file about composition.
    from app.services import transport_service
    sections["transport"] = _safe_section("transport", lambda: transport_service.build_transport_section(
        destination=location["name"],
        origin=origin,
    ))

    sections["food_reality"] = _safe_section("food_reality", lambda: food_service.build_food_section(
        db=db,
        destination_name=location["name"],
    ))

    sections["local_culture"] = _safe_section("local_culture", lambda: culture_service.build_culture_section(
        destination=location["name"],
    ))

    ordered = [sections[key] for key in SECTION_ORDER if key in sections]

    alerts: list[dict] = []
    if include_alerts:
        alerts = _safe_alerts(
            itinerary=itinerary,
            sections=sections,
            start_date=start_date,
        )

    overall_status = derive_overall_status(ordered)
    overall_confidence = derive_overall_confidence(ordered)

    # A critical alert should be visible in the headline, not buried.
    if any(a["severity"] in (Severity.HIGH, Severity.CRITICAL) for a in alerts):
        if overall_status in (Status.GOOD, Status.FAIR):
            overall_status = Status.CAUTION

    return {
        "destination": location["name"],
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "state": location.get("state"),
            "country": location.get("country"),
            "resolved_by": location.get("source"),
            "is_coastal": location.get("is_coastal", False),
        },
        "number_of_days": number_of_days,
        "number_of_travelers": number_of_travelers,
        "start_date": start_date.isoformat() if start_date else None,
        "overall_status": overall_status,
        "confidence": overall_confidence,
        "readiness_summary": _readiness_summary(location["name"], overall_status, ordered, alerts),
        "sections": ordered,
        "section_keys": [s["key"] for s in ordered],
        "alerts": alerts,
        "alert_summary": alert_service.summarise_alerts(alerts),
        "warnings": [
            a["title"] for a in alerts
            if a["severity"] in (Severity.HIGH, Severity.CRITICAL)
        ],
        "sources": _collect_sources(ordered),
        "last_updated": iso(now_utc()),
    }


def _safe_alerts(itinerary: list[dict], sections: dict, start_date: date | None) -> list[dict]:
    """Alert evaluation is itself guarded - a detector bug must not break the page."""
    try:
        traffic_details = sections.get("traffic", {}).get("details") or {}
        return alert_service.evaluate_trip_alerts(
            itinerary=itinerary,
            weather_section=sections.get("weather"),
            traffic_analysis=traffic_details if traffic_details.get("days") else None,
            local_updates_section=sections.get("local_updates"),
            cost_section=sections.get("cost_reality"),
            start_date=start_date,
        )
    except Exception:
        print(f"[reality] alert evaluation failed:\n{traceback.format_exc()}")
        return []


def _find_coastal_stop(itinerary: list[dict]) -> tuple[tuple[float, float] | None, str | None]:
    """Finds a beach stop to sample marine conditions at, if the plan has one."""
    for day in itinerary or []:
        for activity in day.get("activities", []) or []:
            name = (activity.get("name") or activity.get("place_name") or "")
            category = (activity.get("category") or "").lower()
            if "beach" in category or "beach" in name.lower():
                lat, lng = activity.get("latitude"), activity.get("longitude")
                if lat is not None and lng is not None:
                    return (lat, lng), name
    return None, None


def _readiness_summary(
    destination: str,
    status: str,
    sections: list[dict],
    alerts: list[dict],
) -> str:
    """One honest sentence about how ready this trip is."""
    unavailable = [s for s in sections if not s.get("available")]
    high_alerts = [a for a in alerts if a["severity"] in (Severity.HIGH, Severity.CRITICAL)]

    if status == Status.UNKNOWN:
        return (
            f"We could not gather enough live information about {destination} to assess "
            "this trip yet."
        )

    base = {
        Status.GOOD: f"{destination} looks good for your dates.",
        Status.FAIR: f"{destination} is workable for your dates, with a few things to plan around.",
        Status.CAUTION: f"{destination} needs some planning attention before you travel.",
        Status.POOR: f"Conditions in {destination} are likely to disrupt this plan as it stands.",
    }[status]

    parts = [base]
    if high_alerts:
        parts.append(
            f"{len(high_alerts)} issue(s) need a decision from you."
            if len(high_alerts) > 1
            else "One issue needs a decision from you."
        )
    if unavailable:
        names = ", ".join(s["title"] for s in unavailable)
        parts.append(f"Live data is unavailable for: {names}.")

    return " ".join(parts)


def _collect_sources(sections: list[dict]) -> list[dict]:
    """Every distinct real source behind this reality check, for attribution."""
    seen: dict[str, dict] = {}
    for section in sections:
        for source in section.get("sources", []) or []:
            if source and source.get("name") and source["name"] not in seen:
                seen[source["name"]] = source
    return list(seen.values())


def _unresolvable(destination: str, number_of_days: int) -> dict[str, Any]:
    """
    When we cannot even locate the destination, we say so plainly rather than
    defaulting to another city's data.
    """
    sections = [
        section_unavailable(
            key, SECTION_TITLES[key],
            f"We could not locate '{destination}', so no live data could be gathered.",
        )
        for key in SECTION_ORDER
    ]

    return {
        "destination": destination,
        "location": None,
        "number_of_days": number_of_days,
        "number_of_travelers": 1,
        "start_date": None,
        "overall_status": Status.UNKNOWN,
        "confidence": Confidence.LOW,
        "readiness_summary": (
            f"We could not find a place called '{destination}'. Check the spelling, or "
            "try a nearby larger city."
        ),
        "sections": sections,
        "section_keys": SECTION_ORDER,
        "alerts": [],
        "alert_summary": {"total": 0, "by_severity": {}, "highest_severity": None,
                          "affected_days": []},
        "warnings": [],
        "sources": [],
        "last_updated": iso(now_utc()),
    }
