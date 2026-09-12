"""
Realistic day-by-day timeline scheduling.

Turns a day's ordered list of activities (already routed by
`route_optimizer.cluster_and_route_itinerary`) into an actual clock-time
schedule - respecting flight arrival/departure buffers, hotel check-in/out,
attraction opening hours, and meal breaks, so the plan never asks a traveller
to be at a museum eleven minutes after their bags land.

Every buffer is a named constant here, not a magic number buried in the
scheduling logic, so it stays easy to tune.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any

# Default opening hours by category, as (open_hour, open_min, close_hour, close_min).
# Curated reference defaults - real places vary, so callers should treat this
# as indicative, not a live hours API.
DEFAULT_HOURS: dict[str, tuple[int, int, int, int]] = {
    "historical": (9, 0, 18, 0),
    "museum": (10, 0, 17, 30),
    "culture": (9, 30, 19, 0),
    "beach": (6, 0, 19, 30),
    "adventure": (8, 0, 17, 0),
    "nature": (6, 0, 18, 30),
    "food": (11, 0, 22, 30),
    "shopping": (10, 30, 21, 0),
    "market": (10, 0, 21, 30),
}
DEFAULT_HOURS_FALLBACK = (9, 0, 19, 0)

FIRST_STOP_TRAVEL_MIN = 20  # hotel -> first attraction of the day, no better estimate available
LUNCH_WINDOW = ((12, 30), (14, 30))
DINNER_WINDOW = ((19, 0), (21, 30))
MEAL_BREAK_MIN = 60
DAY_START_DEFAULT = (9, 0)

_DURATION_RE = re.compile(r"([\d.]+)")


def parse_duration_minutes(duration: str | None) -> int:
    if not duration:
        return 90
    match = _DURATION_RE.search(duration)
    hours = float(match.group(1)) if match else 1.5
    return max(15, round(hours * 60))


def _hours_for(category: str | None) -> tuple[int, int, int, int]:
    key = (category or "").strip().lower()
    for name, hours in DEFAULT_HOURS.items():
        if name in key:
            return hours
    return DEFAULT_HOURS_FALLBACK


def _dt(base: datetime, hour: int, minute: int) -> datetime:
    return base.replace(hour=hour, minute=minute, second=0, microsecond=0)


def _parse_hhmm(base: datetime, value: str) -> datetime:
    h, m = value.split(":")
    return _dt(base, int(h), int(m))


def build_day_timeline(
    day: dict[str, Any],
    *,
    is_first_day: bool = False,
    is_last_day: bool = False,
    flight_out: dict[str, Any] | None = None,
    transfer_out: dict[str, Any] | None = None,
    flight_return: dict[str, Any] | None = None,
    transfer_return: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """
    Returns an ordered list of {time, end_time, type, title, subtitle, cost,
    duration_min, note} blocks - the realistic, clock-time version of the
    activities the route optimizer already ordered geographically.
    """
    base_date = datetime.today()
    blocks: list[dict[str, Any]] = []
    lunch_done = False
    dinner_done = False

    if is_first_day and flight_out:
        blocks.append({
            "time": flight_out["departure_time"],
            "type": "flight",
            "title": f"Flight departs {flight_out['origin_city']}",
            "subtitle": f"{flight_out['airline']} {flight_out['flight_number']} to {flight_out['destination_city']}",
            "cost": None,
        })
        blocks.append({
            "time": flight_out["arrival_time"],
            "type": "flight",
            "title": f"Arrive in {flight_out['destination_city']}",
            "subtitle": f"{flight_out['stops_label']} · {flight_out['duration_label']}",
            "cost": None,
        })

    if is_first_day and transfer_out and transfer_out.get("available"):
        for step in transfer_out["sequence"][1:]:  # skip "Flight lands", already shown above
            blocks.append({
                "time": step["time"],
                "type": "transfer" if "Check-in" not in step["label"] else "checkin",
                "title": step["label"],
                "subtitle": f"~{step['duration_min']} min" if step.get("duration_min") else None,
                "cost": transfer_out["estimated_cost"] if "pickup" in step["label"].lower() else None,
            })
        cursor = _parse_hhmm(base_date, transfer_out["free_from"])
    elif is_first_day:
        cursor = _dt(base_date, *DAY_START_DEFAULT)
    else:
        cursor = _dt(base_date, *DAY_START_DEFAULT)

    # On the last day, activities must not run past the point where the
    # traveller needs to leave for the airport - schedule them, don't just
    # append the return journey afterwards regardless of the clock.
    depart_hotel_by = None
    if is_last_day and flight_return and transfer_return and transfer_return.get("available"):
        depart_hotel_by = _parse_hhmm(base_date, transfer_return["depart_hotel_by"])

    activities = day.get("activities", [])
    skipped: list[str] = []
    for index, activity in enumerate(activities):
        transit_min = (
            FIRST_STOP_TRAVEL_MIN if index == 0
            else activity.get("transit_from_previous", {}).get("estimated_minutes", 15)
        )
        duration_min_preview = parse_duration_minutes(activity.get("duration"))
        if depart_hotel_by and (cursor + timedelta(minutes=transit_min + duration_min_preview)) > depart_hotel_by:
            skipped.append(activity.get("name") or activity.get("place_name") or "a stop")
            continue

        cursor += timedelta(minutes=transit_min)
        if index > 0:
            blocks.append({
                "time": cursor.strftime("%H:%M"),
                "type": "transit",
                "title": f"Travel to {activity.get('name') or activity.get('place_name')}",
                "subtitle": f"~{transit_min} min",
                "cost": None,
            })

        # Meal breaks, inserted when the clock naturally reaches them.
        (lh, lm), (lh2, lm2) = LUNCH_WINDOW
        if not lunch_done and _dt(base_date, lh, lm) <= cursor <= _dt(base_date, lh2, lm2):
            blocks.append({
                "time": cursor.strftime("%H:%M"),
                "type": "meal",
                "title": "Lunch break",
                "subtitle": "Covered under your food budget",
                "cost": None,
                "duration_min": MEAL_BREAK_MIN,
            })
            cursor += timedelta(minutes=MEAL_BREAK_MIN)
            lunch_done = True

        open_h, open_m, close_h, close_m = _hours_for(activity.get("category"))
        open_dt, close_dt = _dt(base_date, open_h, open_m), _dt(base_date, close_h, close_m)
        note = None
        if cursor < open_dt:
            note = f"Opens at {open_dt.strftime('%H:%M')} - arriving early"
            cursor = open_dt

        duration_min = duration_min_preview
        end_time = cursor + timedelta(minutes=duration_min)
        if cursor >= close_dt:
            note = f"Likely closed by this time (closes {close_dt.strftime('%H:%M')}) - reorder your day if possible"
            end_time = cursor + timedelta(minutes=min(duration_min, 20))
        elif end_time > close_dt:
            note = f"Closes at {close_dt.strftime('%H:%M')} - visit may need to be shorter"
            end_time = close_dt

        blocks.append({
            "time": cursor.strftime("%H:%M"),
            "end_time": end_time.strftime("%H:%M"),
            "type": "activity",
            "title": activity.get("name") or activity.get("place_name"),
            "subtitle": activity.get("category"),
            "cost": activity.get("estimated_cost"),
            "duration_min": duration_min,
            "note": note,
        })
        cursor = end_time

        (dh, dm), (dh2, dm2) = DINNER_WINDOW
        if not dinner_done and _dt(base_date, dh, dm) <= cursor <= _dt(base_date, dh2, dm2):
            blocks.append({
                "time": cursor.strftime("%H:%M"),
                "type": "meal",
                "title": "Dinner",
                "subtitle": "Covered under your food budget",
                "cost": None,
                "duration_min": MEAL_BREAK_MIN,
            })
            cursor += timedelta(minutes=MEAL_BREAK_MIN)
            dinner_done = True

    if skipped:
        blocks.append({
            "time": depart_hotel_by.strftime("%H:%M") if depart_hotel_by else None,
            "type": "note",
            "title": "Some stops didn't fit before your return flight",
            "subtitle": ", ".join(skipped),
            "cost": None,
            "note": "Move these earlier in the trip or choose a later return flight.",
        })

    if is_last_day and flight_return and transfer_return and transfer_return.get("available"):
        for step in transfer_return["sequence"]:
            blocks.append({
                "time": step["time"],
                "type": "flight" if "Flight" in step["label"] else "transfer" if "airport" in step["label"].lower() else "checkout",
                "title": step["label"],
                "subtitle": f"~{step['duration_min']} min" if step.get("duration_min") else None,
                "cost": None,
                "note": None,
            })

    return blocks
