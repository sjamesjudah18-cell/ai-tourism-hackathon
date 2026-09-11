"""
Traffic Reality - realistic travel time, honestly labelled.

There is no live traffic feed available to this project: the Google Maps key is
a browser key (NEXT_PUBLIC_) and the Routes API needs a billed server key. So
rather than invent "live" congestion, this module models it deterministically
from distance, time of day, day of week, and city size - and every figure it
produces carries the ESTIMATE label with a note saying it is not live.

The point is still real: the `route_optimizer` baseline assumes a flat 25 km/h,
which quietly under-books every peak-hour leg. Comparing the two is what
surfaces the "planned 4 days, took 6" failure this product exists to prevent.
"""

from __future__ import annotations

from datetime import date

from app.core.reality import (
    Confidence,
    DataLabel,
    Status,
    make_datapoint,
    make_section,
    now_utc,
)

# The flat speed route_optimizer.estimate_travel_time_minutes assumes.
BASELINE_SPEED_KMH = 25.0

# Representative clock hour for each itinerary slot, used to pick a multiplier.
SLOT_HOURS = {
    "morning": 10,
    "afternoon": 14,
    "evening": 18,
    "night": 21,
}

# Congestion multipliers against the flat baseline, by hour of day. Shaped to
# the twin-peak pattern of large Indian cities: a long morning school-and-office
# peak and a heavier, later evening peak.
HOURLY_CONGESTION = {
    0: 0.70, 1: 0.65, 2: 0.65, 3: 0.65, 4: 0.70, 5: 0.75,
    6: 0.85, 7: 1.05, 8: 1.30, 9: 1.45, 10: 1.35, 11: 1.15,
    12: 1.10, 13: 1.10, 14: 1.10, 15: 1.15, 16: 1.25, 17: 1.45,
    18: 1.60, 19: 1.55, 20: 1.35, 21: 1.10, 22: 0.90, 23: 0.80,
}

# Metro-scale cities move slower than smaller ones at the same hour.
CITY_CONGESTION_TIER = {
    "mumbai": 1.30, "bengaluru": 1.30, "bangalore": 1.30, "delhi": 1.25,
    "new delhi": 1.25, "kolkata": 1.20, "chennai": 1.18, "hyderabad": 1.15,
    "pune": 1.15, "ahmedabad": 1.10, "jaipur": 1.05, "kochi": 1.05,
    "goa": 0.95,
}
DEFAULT_CITY_TIER = 1.0

# Sunday runs noticeably freer; Saturday only slightly.
WEEKDAY_FACTOR = {0: 1.0, 1: 1.0, 2: 1.0, 3: 1.0, 4: 1.05, 5: 0.95, 6: 0.80}


def city_factor(destination: str) -> float:
    key = (destination or "").strip().lower()
    for city, factor in CITY_CONGESTION_TIER.items():
        if city in key:
            return factor
    return DEFAULT_CITY_TIER


def slot_hour(time_slot: str | None) -> int:
    return SLOT_HOURS.get((time_slot or "").strip().lower(), 12)


def congestion_multiplier(
    destination: str,
    time_slot: str | None,
    travel_date: date | None = None,
) -> float:
    """Combined slowdown factor against the flat-speed baseline."""
    hour = slot_hour(time_slot)
    base = HOURLY_CONGESTION.get(hour, 1.0)
    weekday = WEEKDAY_FACTOR.get(travel_date.weekday(), 1.0) if travel_date else 1.0
    return round(base * city_factor(destination) * weekday, 3)


def congestion_level(multiplier: float) -> tuple[str, str]:
    """(status, plain-language label) for a multiplier."""
    if multiplier >= 1.55:
        return Status.POOR, "Heavy"
    if multiplier >= 1.30:
        return Status.CAUTION, "Busy"
    if multiplier >= 1.10:
        return Status.FAIR, "Moderate"
    return Status.GOOD, "Light"


def analyse_itinerary_traffic(
    destination: str,
    itinerary: list[dict],
    start_date: date | None = None,
) -> dict:
    """
    Walks every leg of every day and compares the optimistic baseline against a
    realistic peak-hour estimate.

    Returns per-day totals plus the legs worth warning about.
    """
    days_out: list[dict] = []
    total_baseline = 0
    total_realistic = 0

    for day in itinerary or []:
        day_number = day.get("day")
        travel_date = _date_for_day(start_date, day_number)

        day_baseline = 0
        day_realistic = 0
        legs: list[dict] = []

        for activity in day.get("activities", []) or []:
            transit = activity.get("transit_from_previous") or {}
            baseline_minutes = transit.get("estimated_minutes") or 0
            if baseline_minutes <= 0:
                continue

            multiplier = congestion_multiplier(
                destination, activity.get("time"), travel_date
            )
            realistic = int(round(baseline_minutes * multiplier))
            delay = realistic - baseline_minutes
            status, level = congestion_level(multiplier)

            day_baseline += baseline_minutes
            day_realistic += realistic

            legs.append({
                "to_place": activity.get("name") or activity.get("place_name"),
                "time_slot": activity.get("time"),
                "distance_km": transit.get("distance_km"),
                "baseline_minutes": baseline_minutes,
                "realistic_minutes": realistic,
                "added_minutes": delay,
                "congestion_level": level,
                "status": status,
                "multiplier": multiplier,
            })

        total_baseline += day_baseline
        total_realistic += day_realistic

        worst = max(
            (leg["multiplier"] for leg in legs), default=1.0
        )
        day_status, day_level = congestion_level(worst)

        days_out.append({
            "day": day_number,
            "date": travel_date.isoformat() if travel_date else None,
            "baseline_minutes": day_baseline,
            "realistic_minutes": day_realistic,
            "added_minutes": day_realistic - day_baseline,
            "congestion_level": day_level,
            "status": day_status,
            "legs": legs,
        })

    return {
        "days": days_out,
        "total_baseline_minutes": total_baseline,
        "total_realistic_minutes": total_realistic,
        "total_added_minutes": total_realistic - total_baseline,
    }


def _date_for_day(start_date: date | None, day_number: int | None) -> date | None:
    if not start_date or not day_number:
        return None
    from datetime import timedelta

    return start_date + timedelta(days=day_number - 1)


def build_traffic_section(
    destination: str,
    itinerary: list[dict],
    start_date: date | None = None,
) -> dict:
    """
    The Traffic category. Everything here is modelled, never live, and says so
    in the section note, on every datapoint, and in the advice.
    """
    analysis = analyse_itinerary_traffic(destination, itinerary, start_date)

    if not analysis["days"]:
        return make_section(
            key="traffic",
            title="Traffic",
            status=Status.UNKNOWN,
            summary="No routed stops yet, so there is no travel time to assess.",
            advice=["Generate an itinerary to see realistic travel times between stops."],
            details=analysis,
            confidence=Confidence.LOW,
            sources=[],
            last_updated=now_utc(),
        )

    added = analysis["total_added_minutes"]
    realistic = analysis["total_realistic_minutes"]

    worst_day = max(
        analysis["days"],
        key=lambda d: d["added_minutes"],
        default=None,
    )

    if added >= 90:
        status = Status.CAUTION
    elif added >= 45:
        status = Status.FAIR
    else:
        status = Status.GOOD

    # A single day losing a lot of time matters more than the trip average.
    if worst_day and worst_day["added_minutes"] >= 60:
        status = Status.CAUTION

    hours = realistic / 60.0
    summary = (
        f"Across the whole trip you are likely to spend about {hours:.1f} hours "
        f"in transit - roughly {added} minutes more than a free-flowing estimate "
        "once typical peak hours are accounted for."
    )

    advice: list[str] = []
    if worst_day and worst_day["added_minutes"] > 0:
        advice.append(
            f"Day {worst_day['day']} is the tightest: expect about "
            f"{worst_day['added_minutes']} extra minutes on the road. Leaving "
            "30 minutes earlier absorbs most of it."
        )
    advice.append(
        "Evening legs between 5:30 PM and 7:30 PM are the slowest of the day - "
        "where you can, schedule the longest hop before noon."
    )
    advice.append(
        "These are modelled travel times, not live traffic. Check a maps app on "
        "the day before setting out."
    )

    details = dict(analysis)
    details["estimate_basis"] = make_datapoint(
        value=(
            "Distance, time of day, day of week and city size. Baseline is the "
            f"itinerary's {BASELINE_SPEED_KMH:.0f} km/h routing assumption."
        ),
        label=DataLabel.ESTIMATE,
        note="Modelled from typical local peak hours. This is not live traffic data.",
    )
    details["is_live"] = False

    return make_section(
        key="traffic",
        title="Traffic",
        status=status,
        summary=summary,
        advice=advice,
        details=details,
        confidence=Confidence.MEDIUM,
        # No external source - so none is attached rather than inventing one.
        sources=[],
        last_updated=now_utc(),
    )
