"""
Hotel Reality.

Builds on the existing `hotel_service.get_recommended_hotels`, which is left
untouched, and adds the part that actually affects a trip: how far each
property sits from the stops the traveller has planned.

"Things to know" notes here are computed from real coordinates - a hotel 14 km
from every stop on the itinerary is a fact we can derive, and it is worth
saying. What we never do is invent qualitative notes ("busy road nearby",
"limited parking") that no data in this system supports.

Provenance is separated explicitly:
  VERIFIED  - a fact we hold directly (price, coordinates)
  DERIVED   - computed by us from those facts (distance to your stops)
  ESTIMATED - a modelled figure (total stay cost)
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.algorithms.route_optimizer import estimate_travel_time_minutes, haversine_distance
from app.core.reality import (
    Confidence,
    DataLabel,
    Status,
    make_section,
    make_source,
    now_utc,
)
from app.services.hotel_service import get_recommended_hotels

# Beyond this, a property is far enough from the plan to be worth flagging.
FAR_FROM_PLAN_KM = 12.0
CLOSE_TO_PLAN_KM = 4.0


def itinerary_centroid(itinerary: list[dict] | None) -> tuple[float, float] | None:
    """Average position of every routed stop - the centre of gravity of the trip."""
    points = [
        (activity["latitude"], activity["longitude"])
        for day in (itinerary or [])
        for activity in day.get("activities", []) or []
        if activity.get("latitude") is not None and activity.get("longitude") is not None
    ]
    if not points:
        return None

    return (
        sum(p[0] for p in points) / len(points),
        sum(p[1] for p in points) / len(points),
    )


def analyse_hotel(
    hotel: dict[str, Any],
    centroid: tuple[float, float] | None,
    itinerary: list[dict] | None,
) -> dict[str, Any]:
    """Adds derived distance facts and honest 'things to know' to one hotel."""
    enriched = dict(hotel)
    notes: list[dict[str, str]] = []

    lat, lng = hotel.get("latitude"), hotel.get("longitude")

    if lat is not None and lng is not None and centroid:
        distance = haversine_distance(lat, lng, centroid[0], centroid[1])
        minutes = estimate_travel_time_minutes(distance)

        enriched["distance_to_plan_km"] = distance
        enriched["typical_minutes_to_plan"] = minutes
        enriched["distance_label"] = DataLabel.ESTIMATE

        if distance >= FAR_FROM_PLAN_KM:
            notes.append({
                "text": (
                    f"Sits about {distance:.1f} km from the centre of your planned stops "
                    f"- roughly {minutes} minutes each way before traffic."
                ),
                "source_type": "DERIVED",
            })
        elif distance <= CLOSE_TO_PLAN_KM:
            notes.append({
                "text": (
                    f"Well placed - about {distance:.1f} km from the centre of your "
                    "planned stops."
                ),
                "source_type": "DERIVED",
            })

        # Per-day distance tells a traveller which days will feel long.
        day_distances = []
        for day in itinerary or []:
            day_points = [
                (a["latitude"], a["longitude"])
                for a in day.get("activities", []) or []
                if a.get("latitude") is not None and a.get("longitude") is not None
            ]
            if not day_points:
                continue
            day_lat = sum(p[0] for p in day_points) / len(day_points)
            day_lng = sum(p[1] for p in day_points) / len(day_points)
            day_distances.append({
                "day": day.get("day"),
                "distance_km": haversine_distance(lat, lng, day_lat, day_lng),
            })

        enriched["distance_by_day"] = day_distances

        furthest = max(day_distances, key=lambda d: d["distance_km"], default=None)
        if furthest and furthest["distance_km"] >= FAR_FROM_PLAN_KM:
            notes.append({
                "text": (
                    f"Day {furthest['day']} is the longest commute from here - about "
                    f"{furthest['distance_km']:.1f} km each way."
                ),
                "source_type": "DERIVED",
            })
    else:
        enriched["distance_to_plan_km"] = None
        enriched["typical_minutes_to_plan"] = None

    enriched["things_to_know"] = notes
    enriched["price_label"] = DataLabel.APPROXIMATE
    enriched["price_note"] = (
        "Indicative nightly rate from our curated hotel data, not a live booking "
        "quote. Confirm with the property."
    )
    enriched["rating_source"] = "Curated reference rating"
    enriched["total_stay_cost_label"] = DataLabel.ESTIMATE

    return enriched


def build_hotel_section(
    db: Session,
    destination: str,
    preference: str,
    days: int,
    itinerary: list[dict] | None = None,
    limit: int = 4,
) -> dict[str, Any]:
    """The Accommodation category of the Reality Check."""
    hotels = get_recommended_hotels(
        db=db,
        destination_name=destination,
        preference=preference,
        days=days,
        limit=limit,
    )

    if not hotels:
        return make_section(
            key="hotel_reality",
            title="Accommodation",
            status=Status.UNKNOWN,
            summary=f"No accommodation data is available for {destination} yet.",
            advice=["Search a booking site directly for current availability and rates."],
            details={"hotels": []},
            confidence=Confidence.LOW,
            sources=[],
            available=False,
            unavailable_reason=f"No hotels are recorded for {destination}.",
        )

    centroid = itinerary_centroid(itinerary)
    analysed = [analyse_hotel(h, centroid, itinerary) for h in hotels]

    distances = [
        h["distance_to_plan_km"] for h in analysed
        if h.get("distance_to_plan_km") is not None
    ]

    if not distances:
        status = Status.FAIR
        summary = (
            f"{len(analysed)} {preference.lower()} option(s) in {destination}. "
            "Location relative to your stops could not be calculated."
        )
    else:
        closest = min(distances)
        if closest <= CLOSE_TO_PLAN_KM:
            status = Status.GOOD
            summary = (
                f"{len(analysed)} {preference.lower()} option(s) in {destination}, the "
                f"closest about {closest:.1f} km from the centre of your planned stops."
            )
        elif closest <= FAR_FROM_PLAN_KM:
            status = Status.FAIR
            summary = (
                f"{len(analysed)} {preference.lower()} option(s) in {destination}. The "
                f"nearest is about {closest:.1f} km from your stops - a daily commute, "
                "but a manageable one."
            )
        else:
            status = Status.CAUTION
            summary = (
                f"Every {preference.lower()} option we hold sits at least "
                f"{closest:.1f} km from your planned stops, which will add real travel "
                "time to each day."
            )

    nightly = [h["price_per_night"] for h in analysed if h.get("price_per_night")]
    advice = [
        "Rates shown are indicative, not live quotes - confirm with the property before booking.",
    ]
    if nightly:
        advice.insert(0, (
            f"Nightly rates in this tier run about Rs {int(min(nightly)):,} to "
            f"Rs {int(max(nightly)):,}."
        ))
    if distances and min(distances) > FAR_FROM_PLAN_KM:
        advice.append(
            "Staying closer to your stops would cut a meaningful amount of daily travel."
        )

    return make_section(
        key="hotel_reality",
        title="Accommodation",
        status=status,
        summary=summary,
        advice=advice,
        details={
            "hotels": analysed,
            "preference": preference,
            "nights": max(1, days - 1),
            "provenance": {
                "VERIFIED": "Held directly in our data - name, coordinates, indicative rate.",
                "DERIVED": "Calculated by us from those coordinates and your itinerary.",
                "ESTIMATED": "Modelled figures such as total stay cost.",
            },
        },
        confidence=Confidence.MEDIUM,
        sources=[make_source("Seeded hotel reference data")],
        last_updated=now_utc(),
    )
