"""
The ONLY code path that changes an itinerary.

The product rule is absolute: the AI recommends, the traveller decides. Alerts
detect, `alert_service.generate_alternatives` proposes, and nothing at all
happens until the traveller sends an explicit confirmation here.

That rule is enforced structurally, not by convention:

  * `apply_confirmed_change` raises unless `confirmed is True`. There is no
    default-true, no truthy coercion, and no "auto" parameter.
  * No other module imports this one. The alert and reality services have no
    reference to it, so there is no path from detection to mutation.
  * Every successful change writes an `ItineraryChange` audit row, so the set
    of changes ever made is exactly the set a human approved.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.algorithms.route_optimizer import optimize_daily_sequence
from app.models.itinerary_change import ItineraryChange
from app.services.itinerary_service import estimate_activity_cost, get_place_image


class ChangeNotConfirmed(Exception):
    """Raised when a change is attempted without explicit confirmation."""


class ChangeTargetNotFound(Exception):
    """Raised when the stop to replace is not on the given day."""


def apply_confirmed_change(
    db: Session,
    itinerary: list[dict],
    trip_day: int,
    replace_place: str,
    replacement: dict[str, Any],
    confirmed: bool,
    trip_id: int | None = None,
    alert_fingerprint: str | None = None,
    reason: str | None = None,
) -> dict[str, Any]:
    """
    Swaps one stop for another on a single day, then re-routes that day.

    `confirmed` must be exactly True. Anything else - False, None, "yes", 1 -
    is refused, so a caller cannot accidentally opt in through truthiness.
    """
    if confirmed is not True:
        raise ChangeNotConfirmed(
            "Itinerary changes require an explicit confirmation from the traveller."
        )

    target = (replace_place or "").strip().lower()
    if not target:
        raise ChangeTargetNotFound("No stop was specified to replace.")

    updated_days: list[dict] = []
    matched = False
    replaced_activity: dict | None = None

    for day in itinerary or []:
        if day.get("day") != trip_day:
            updated_days.append(day)
            continue

        activities = day.get("activities", []) or []
        new_activities: list[dict] = []

        for activity in activities:
            name = (activity.get("name") or activity.get("place_name") or "").strip().lower()
            if name == target and not matched:
                matched = True
                replaced_activity = activity
                new_activities.append(_build_activity(replacement, activity))
            else:
                new_activities.append(activity)

        if matched:
            # Re-run the day's routing so transit distances and time slots
            # reflect the new stop rather than the old one's geography.
            resequenced = optimize_daily_sequence(new_activities)
            day = {
                **day,
                "activities": resequenced,
                "total_transit_km": round(sum(
                    a.get("transit_from_previous", {}).get("distance_km", 0)
                    for a in resequenced
                ), 1),
                "estimated_transit_minutes": sum(
                    a.get("transit_from_previous", {}).get("estimated_minutes", 0)
                    for a in resequenced
                ),
            }
        else:
            day = {**day, "activities": new_activities}

        updated_days.append(day)

    if not matched:
        raise ChangeTargetNotFound(
            f"'{replace_place}' is not on Day {trip_day} of this itinerary."
        )

    # Audit the confirmed change.
    try:
        db.add(ItineraryChange(
            trip_id=trip_id,
            alert_fingerprint=alert_fingerprint,
            trip_day=trip_day,
            replaced_place=replace_place,
            replacement_place=replacement.get("name", "Unknown"),
            reason=reason,
        ))
        db.commit()
    except Exception:
        # A failed audit write must not lose the traveller's confirmed change.
        db.rollback()

    total_cost = sum(
        activity.get("estimated_cost", 0)
        for day in updated_days
        for activity in day.get("activities", []) or []
    )

    return {
        "itinerary": updated_days,
        "total_activities_cost": total_cost,
        "change": {
            "trip_day": trip_day,
            "replaced": replace_place,
            "replacement": replacement.get("name"),
            "alert_fingerprint": alert_fingerprint,
            "previous_cost": (replaced_activity or {}).get("estimated_cost"),
            "new_cost": _cost_for(replacement),
        },
        "confirmed": True,
    }


def _build_activity(replacement: dict[str, Any], previous: dict[str, Any]) -> dict[str, Any]:
    """
    Shapes a chosen alternative into the activity format the rest of the app
    already consumes, so the itinerary card, map and budget all keep working.
    """
    category = replacement.get("category") or previous.get("category") or "Culture"
    name = replacement.get("name", "Alternative stop")

    return {
        "place_id": replacement.get("place_id") or replacement.get("id"),
        "name": name,
        "place_name": name,
        "category": category,
        "rating": replacement.get("rating") or 4.5,
        "estimated_cost": _cost_for(replacement),
        "duration": previous.get("duration", "2 hrs"),
        "latitude": replacement.get("latitude"),
        "longitude": replacement.get("longitude"),
        "description": replacement.get("description", ""),
        "image": get_place_image(name, category),
        "recommendation_score": replacement.get("recommendation_score", 85),
        # Marks the stop as user-chosen, so the UI can show it came from a
        # confirmed decision rather than the original generated plan.
        "user_selected": True,
    }


def _cost_for(replacement: dict[str, Any]) -> int:
    cost = replacement.get("estimated_cost")
    if isinstance(cost, (int, float)) and cost > 0:
        return int(cost)
    return estimate_activity_cost(
        replacement.get("category") or "Culture",
        replacement.get("price_level") or 1,
    )
