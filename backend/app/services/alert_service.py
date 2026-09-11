"""
The Alert Impact Engine.

Its single job: look at conditions and an itinerary, and describe where the two
collide. It answers "is this trip affected, which day, which stop, how badly,
and what could be done about it".

It does NOT change anything. There is no code path from this module to an
itinerary write. Alternatives are *proposed* here and only ever applied by
`itinerary_change_service` after the traveller explicitly confirms.

Every alert it emits uses the single shape in `core.reality.make_alert`, so the
notification centre, the itinerary badges and the reality page all read the
same objects.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from app.algorithms.route_optimizer import haversine_distance
from app.core.reality import (
    AlertType,
    Confidence,
    Severity,
    Status,
    dedupe_and_prune,
    make_alert,
    now_utc,
)

# How exposed each activity category is to weather. Drives which stops a wet
# forecast actually threatens - a museum in the rain is fine.
OUTDOOR_EXPOSURE = {
    "beach": 1.0,
    "nature": 0.9,
    "adventure": 0.9,
    "historical": 0.7,   # forts and monuments are largely open-air
    "shopping": 0.4,     # street markets are exposed, malls are not
    "culture": 0.3,
    "food": 0.2,
    "museum": 0.1,
}
DEFAULT_EXPOSURE = 0.5

# Above this, a stop counts as genuinely weather-exposed.
EXPOSED_THRESHOLD = 0.6

# Traffic delay thresholds, in minutes added across a single day.
TRAFFIC_MEDIUM_MINUTES = 45
TRAFFIC_HIGH_MINUTES = 90


def exposure(category: str | None) -> float:
    return OUTDOOR_EXPOSURE.get((category or "").strip().lower(), DEFAULT_EXPOSURE)


def is_outdoor(category: str | None) -> bool:
    return exposure(category) >= EXPOSED_THRESHOLD


def _activities_for_day(itinerary: list[dict], day_number: int) -> list[dict]:
    for day in itinerary or []:
        if day.get("day") == day_number:
            return day.get("activities", []) or []
    return []


# --------------------------------------------------------------------------
# Detectors - each returns a list of alerts, never mutates anything
# --------------------------------------------------------------------------

def detect_weather_alerts(
    itinerary: list[dict],
    forecast: list[dict] | None,
    start_date: date | None = None,
) -> list[dict]:
    """Flags exposed stops on days the forecast says will be wet or severe."""
    alerts: list[dict] = []

    for day_forecast in forecast or []:
        day_number = day_forecast["trip_day"]
        if not (day_forecast.get("is_wet") or day_forecast.get("is_severe")):
            continue

        exposed = [
            a for a in _activities_for_day(itinerary, day_number)
            if is_outdoor(a.get("category"))
        ]
        if not exposed:
            continue

        severe = day_forecast.get("is_severe")
        rain_pct = day_forecast.get("rain_probability_pct") or 0
        condition = day_forecast.get("condition", "Rain")

        if severe:
            severity = Severity.HIGH
        elif rain_pct >= 60:
            severity = Severity.MEDIUM
        else:
            severity = Severity.LOW

        # One alert per day, not one per stop. Three identical rain alerts for
        # the same afternoon is noise; the traveller has a single decision to
        # make about that day. The most exposed stop becomes the alert's
        # subject, and the rest are listed alongside it.
        exposed.sort(key=lambda a: exposure(a.get("category")), reverse=True)
        primary = exposed[0]
        others = exposed[1:]

        name = primary.get("name") or primary.get("place_name") or "an outdoor stop"
        other_names = [
            a.get("name") or a.get("place_name") for a in others
            if a.get("name") or a.get("place_name")
        ]
        delay = 45 if severe else (30 if rain_pct >= 60 else 15)

        also = (
            f" {len(other_names)} other outdoor stop(s) that day are affected too: "
            f"{', '.join(other_names)}."
            if other_names else ""
        )

        alert = make_alert(
            type=AlertType.WEATHER,
            severity=severity,
            title=f"{condition} expected during your Day {day_number} outdoor stops",
            message=(
                f"{condition} is forecast for Day {day_number} "
                f"({day_forecast.get('date')}), with a {int(rain_pct)}% chance of "
                f"precipitation. {name} is largely open-air, so the visit may be "
                f"uncomfortable or cut short.{also}"
            ),
            source="Open-Meteo",
            source_url="https://open-meteo.com/",
            affected_trip_day=day_number,
            affected_place=name,
            impact=(
                f"May add roughly {delay} minutes and reduce time spent outdoors"
                + (". Outdoor activity may not be viable at all." if severe else ".")
            ),
            estimated_delay_minutes=delay,
            confidence=Confidence.HIGH,
            expires_at=_day_expiry(start_date, day_number),
            suggested_actions=[
                "Move this stop to the driest part of the day",
                "Swap in an indoor alternative for this slot",
                "Keep the plan and carry rain gear",
            ],
        )
        alert["also_affected"] = other_names
        alerts.append(alert)

    return alerts


def detect_traffic_alerts(
    itinerary: list[dict],
    traffic_analysis: dict,
    start_date: date | None = None,
) -> list[dict]:
    """Flags days where modelled congestion adds meaningful time."""
    alerts: list[dict] = []

    for day in traffic_analysis.get("days", []):
        added = day.get("added_minutes", 0)
        if added < TRAFFIC_MEDIUM_MINUTES:
            continue

        day_number = day["day"]
        severity = Severity.HIGH if added >= TRAFFIC_HIGH_MINUTES else Severity.MEDIUM

        worst_leg = max(
            day.get("legs", []),
            key=lambda leg: leg.get("added_minutes", 0),
            default=None,
        )
        place = worst_leg.get("to_place") if worst_leg else None

        alerts.append(make_alert(
            type=AlertType.TRAFFIC,
            severity=severity,
            title=f"Traffic may add about {added} minutes to your Day {day_number} route",
            message=(
                f"Day {day_number} covers {day.get('realistic_minutes', 0)} minutes of "
                f"travel once typical peak-hour congestion is accounted for - roughly "
                f"{added} minutes more than the plan assumes."
                + (
                    f" The slowest leg is the run to {place} during the "
                    f"{(worst_leg or {}).get('time_slot', '').lower()} peak."
                    if worst_leg and place else ""
                )
            ),
            # Modelled, not live - so no source is claimed.
            source=None,
            source_url=None,
            affected_trip_day=day_number,
            affected_place=place,
            impact=f"Roughly {added} extra minutes on the road across the day",
            estimated_delay_minutes=added,
            confidence=Confidence.MEDIUM,
            expires_at=_day_expiry(start_date, day_number),
            suggested_actions=[
                "Start the day 30 minutes earlier",
                "Reorder stops so the longest hop happens before noon",
                "Keep the plan and allow extra time",
            ],
        ))

    return alerts


def detect_news_alerts(
    local_updates_section: dict,
    start_date: date | None = None,
) -> list[dict]:
    """
    Turns itinerary-relevant local news into alerts.

    The headline, publisher and URL are real and passed through unchanged. Our
    contribution is the mapping to a day and stop, which is stated as such.
    """
    alerts: list[dict] = []

    if not local_updates_section.get("available"):
        return alerts

    for item in local_updates_section.get("details", {}).get("items", []):
        stops = item.get("affected_stops") or []

        if stops:
            for stop in stops:
                alerts.append(make_alert(
                    type=AlertType.LOCAL_NEWS,
                    severity=item.get("severity", Severity.MEDIUM),
                    title=f"Local report mentions {stop['place']} on Day {stop['day']}",
                    message=(
                        f"{item['title']} (reported by {item['publisher']}). This names "
                        f"{stop['place']}, which is on your Day {stop['day']}. Open the "
                        "source to confirm whether it affects your visit."
                    ),
                    source=item.get("publisher"),
                    source_url=item.get("url"),
                    affected_trip_day=stop.get("day"),
                    affected_place=stop.get("place"),
                    impact="May affect access or add delay - confirm with the source",
                    confidence=Confidence.LOW,
                    expires_at=_day_expiry(start_date, stop.get("day")),
                    suggested_actions=[
                        "Read the source report",
                        "See alternative stops for this slot",
                        "Keep the plan",
                    ],
                ))
        elif item.get("severity") in (Severity.HIGH, Severity.CRITICAL):
            # City-wide disruption with no specific stop - still worth knowing.
            alerts.append(make_alert(
                type=AlertType.LOCAL_NEWS,
                severity=item["severity"],
                title=item["title"][:140],
                message=(
                    f"{item['title']} (reported by {item['publisher']}). This is a "
                    "city-wide report rather than one naming a stop on your itinerary."
                ),
                source=item.get("publisher"),
                source_url=item.get("url"),
                impact="May affect getting around the city",
                confidence=Confidence.LOW,
                suggested_actions=["Read the source report", "Keep the plan"],
            ))

    return alerts


def detect_air_quality_alerts(weather_section: dict, itinerary: list[dict]) -> list[dict]:
    """Flags poor air quality against outdoor stops."""
    air = (weather_section.get("details") or {}).get("air_quality")
    if not air:
        return []

    assessment = air.get("assessment", {})
    if assessment.get("status") not in (Status.POOR, Status.CAUTION):
        return []

    aqi_value = (air.get("us_aqi") or {}).get("value")
    outdoor_days = sorted({
        day.get("day")
        for day in itinerary or []
        for activity in day.get("activities", []) or []
        if is_outdoor(activity.get("category"))
    })
    if not outdoor_days:
        return []

    severity = Severity.HIGH if assessment.get("status") == Status.POOR else Severity.MEDIUM

    return [make_alert(
        type=AlertType.AIR_QUALITY,
        severity=severity,
        title=f"Air quality is {assessment.get('band', 'poor').lower()} (AQI {aqi_value})",
        message=(
            f"{assessment.get('text')} Your plan includes outdoor stops on "
            f"Day {', Day '.join(str(d) for d in outdoor_days)}."
        ),
        source="Open-Meteo Air Quality",
        source_url="https://open-meteo.com/",
        affected_trip_day=outdoor_days[0],
        impact="Extended time outdoors may be uncomfortable, especially for sensitive groups",
        confidence=Confidence.HIGH,
        suggested_actions=[
            "Shorten long outdoor stretches",
            "Carry a mask if you are sensitive to air quality",
            "Keep the plan",
        ],
    )]


def detect_marine_alerts(weather_section: dict, itinerary: list[dict]) -> list[dict]:
    """Flags rough seas against beach or water stops."""
    marine = (weather_section.get("details") or {}).get("marine")
    if not marine:
        return []

    assessment = marine.get("assessment", {})
    if assessment.get("status") not in (Status.POOR, Status.CAUTION):
        return []

    alerts: list[dict] = []
    for day in itinerary or []:
        for activity in day.get("activities", []) or []:
            category = (activity.get("category") or "").lower()
            name = activity.get("name") or activity.get("place_name") or ""
            if "beach" not in category and "beach" not in name.lower() and "water" not in category:
                continue

            alerts.append(make_alert(
                type=AlertType.WEATHER,
                severity=Severity.HIGH if assessment["status"] == Status.POOR else Severity.MEDIUM,
                title=f"Rough sea conditions for your Day {day.get('day')} visit to {name}",
                message=f"{assessment.get('text')} This affects {name} on Day {day.get('day')}.",
                source="Open-Meteo Marine",
                source_url="https://open-meteo.com/",
                affected_trip_day=day.get("day"),
                affected_place=name,
                impact="Swimming and water activities may be unsafe or cancelled",
                confidence=Confidence.HIGH,
                suggested_actions=[
                    "Check local flag warnings on arrival",
                    "See alternative stops for this slot",
                    "Keep the plan",
                ],
            ))

    return alerts


def detect_cost_alerts(cost_section: dict) -> list[dict]:
    """Flags a plan that is likely to overrun the stated budget."""
    details = cost_section.get("details") or {}
    if details.get("status") not in (Status.CAUTION, Status.POOR):
        return []

    total = details.get("total", {})
    budget = details.get("stated_budget", 0)
    low = total.get("low", 0)

    if not budget or low <= budget:
        return []

    over = low - budget
    return [make_alert(
        type=AlertType.COST,
        severity=Severity.HIGH if details["status"] == Status.POOR else Severity.MEDIUM,
        title=f"This plan is likely to run about Rs {over:,} over budget",
        message=(
            f"A bottom-up estimate of your itinerary comes to between "
            f"Rs {total.get('low', 0):,} and Rs {total.get('high', 0):,}, against a stated "
            f"budget of Rs {budget:,}. Travel to and from the destination is not included."
        ),
        source=None,
        impact=f"Roughly Rs {over:,} above your budget at the cheapest realistic outcome",
        confidence=Confidence.MEDIUM,
        suggested_actions=[
            "Review the cost breakdown",
            "Switch to a lower accommodation tier",
            "Keep the plan",
        ],
    )]


def _day_expiry(start_date: date | None, day_number: int | None):
    """An alert about Day 3 stops being useful once Day 3 is over."""
    if not start_date or not day_number:
        return None
    day_date = start_date + timedelta(days=day_number - 1)
    return now_utc().replace(
        year=day_date.year, month=day_date.month, day=day_date.day,
        hour=23, minute=59, second=59, microsecond=0,
    )


# --------------------------------------------------------------------------
# Orchestration
# --------------------------------------------------------------------------

def evaluate_trip_alerts(
    itinerary: list[dict],
    weather_section: dict | None = None,
    traffic_analysis: dict | None = None,
    local_updates_section: dict | None = None,
    cost_section: dict | None = None,
    start_date: date | None = None,
    min_severity: str = Severity.LOW,
) -> list[dict]:
    """
    Runs every detector and returns a deduped, pruned, severity-ordered list.

    Detection only. Nothing here touches the itinerary.
    """
    alerts: list[dict] = []

    if weather_section and weather_section.get("available"):
        forecast = (weather_section.get("details") or {}).get("forecast")
        alerts += detect_weather_alerts(itinerary, forecast, start_date)
        alerts += detect_air_quality_alerts(weather_section, itinerary)
        alerts += detect_marine_alerts(weather_section, itinerary)

    if traffic_analysis:
        alerts += detect_traffic_alerts(itinerary, traffic_analysis, start_date)

    if local_updates_section:
        alerts += detect_news_alerts(local_updates_section, start_date)

    if cost_section:
        alerts += detect_cost_alerts(cost_section)

    return dedupe_and_prune(alerts, max_alerts=12, min_severity=min_severity)


def summarise_alerts(alerts: list[dict]) -> dict[str, Any]:
    """Counts by severity, for badges and the notification centre."""
    counts: dict[str, int] = {}
    for alert in alerts:
        counts[alert["severity"]] = counts.get(alert["severity"], 0) + 1

    return {
        "total": len(alerts),
        "by_severity": counts,
        "highest_severity": (
            max(alerts, key=lambda a: SEVERITY_ORDER.get(a["severity"], 0))["severity"]
            if alerts else None
        ),
        "affected_days": sorted({
            a["affected_trip_day"] for a in alerts if a.get("affected_trip_day")
        }),
    }


SEVERITY_ORDER = {
    Severity.INFO: 0, Severity.LOW: 1, Severity.MEDIUM: 2,
    Severity.HIGH: 3, Severity.CRITICAL: 4,
}


# --------------------------------------------------------------------------
# Alternatives - proposed only, never applied
# --------------------------------------------------------------------------

def generate_alternatives(
    alert: dict,
    itinerary: list[dict],
    candidate_places: list[dict],
    limit: int = 3,
) -> list[dict]:
    """
    Proposes replacements for the stop an alert affects.

    What makes a good alternative depends on why the stop is a problem:
      * weather        -> prefer sheltered categories
      * traffic        -> prefer somewhere closer to the rest of the day
      * news / closure -> anything comparable that is not the affected stop

    Returns options for the traveller to choose between. Choosing one still
    requires an explicit confirmation before anything changes.
    """
    day_number = alert.get("affected_trip_day")
    affected_name = (alert.get("affected_place") or "").strip().lower()
    alert_type = alert.get("type")

    if not day_number or not affected_name:
        return []

    day_activities = _activities_for_day(itinerary, day_number)
    already_planned = {
        (a.get("name") or a.get("place_name") or "").strip().lower()
        for day in itinerary or []
        for a in day.get("activities", []) or []
    }

    # Anchor: the rest of the day, so a replacement does not strand the route.
    anchors = [
        (a["latitude"], a["longitude"])
        for a in day_activities
        if a.get("latitude") is not None
        and a.get("longitude") is not None
        and (a.get("name") or "").strip().lower() != affected_name
    ]
    anchor = (
        (sum(p[0] for p in anchors) / len(anchors), sum(p[1] for p in anchors) / len(anchors))
        if anchors else None
    )

    scored: list[tuple[float, dict]] = []

    for place in candidate_places:
        name = (place.get("name") or "").strip()
        if not name or name.lower() in already_planned:
            continue

        category = place.get("category")
        score = float(place.get("rating") or 4.0) * 10.0
        reasons: list[str] = []

        if alert_type == AlertType.WEATHER:
            shelter = 1.0 - exposure(category)
            score += shelter * 45.0
            if shelter >= 0.6:
                reasons.append("Mostly indoors, so the weather matters less")

        distance = None
        if anchor and place.get("latitude") is not None and place.get("longitude") is not None:
            distance = haversine_distance(
                anchor[0], anchor[1], place["latitude"], place["longitude"]
            )
            # Closer is better; strongly so when traffic is the problem.
            weight = 4.0 if alert_type == AlertType.TRAFFIC else 1.8
            score -= distance * weight
            if distance <= 5:
                reasons.append(f"About {distance:.1f} km from your other Day {day_number} stops")

        if not reasons:
            reasons.append(f"Comparable {(category or 'attraction').lower()} option nearby")

        scored.append((score, {
            "place_id": place.get("id"),
            "name": name,
            "category": category,
            "rating": place.get("rating"),
            "description": place.get("description"),
            "latitude": place.get("latitude"),
            "longitude": place.get("longitude"),
            "estimated_cost": place.get("estimated_cost"),
            "distance_from_day_km": round(distance, 2) if distance is not None else None,
            "why": reasons,
            "indoor": exposure(category) < EXPOSED_THRESHOLD,
        }))

    scored.sort(key=lambda pair: pair[0], reverse=True)

    return [option for _, option in scored[:limit]]
