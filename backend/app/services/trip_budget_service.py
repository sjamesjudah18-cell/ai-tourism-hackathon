"""
Full trip budget: bottom-up category totals, against-budget status, and
money-saving suggestions computed from the traveller's ACTUAL selected and
alternative options (not generic advice).

This sits alongside (not instead of) `budget_service`/`budget_optimizer`
(which allocates a budget top-down by fixed percentages) and `cost_service`
(which estimates a category-band trip cost). This module is the one that ties
real selections - a chosen flight, a chosen hotel, a chosen vehicle - into one
connected total.
"""

from __future__ import annotations

from typing import Any

# Per-person, per-day food estimate, INR - reused figures consistent with
# `cost_service`'s tiering so the two views of the trip never disagree.
FOOD_PER_PERSON_PER_DAY_MID = {"Budget": 475, "Comfort": 1050, "Luxury": 2650}
MISC_PER_PERSON_PER_DAY = 200


def _tier(preference: str | None) -> str:
    key = (preference or "Comfort").strip().lower()
    return {"budget": "Budget", "comfort": "Comfort", "luxury": "Luxury"}.get(key, "Comfort")


def build_trip_budget(
    *,
    total_budget: float,
    number_of_days: int,
    number_of_travelers: int,
    accommodation_preference: str | None,
    flights_cost: float = 0.0,
    hotel_cost: float = 0.0,
    attractions_cost: float = 0.0,
    transport_cost: float = 0.0,
    tolls_cost: float = 0.0,
    parking_cost: float = 0.0,
    other_cost: float = 0.0,
    flight_alternatives: list[dict[str, Any]] | None = None,
    hotel_alternatives: list[dict[str, Any]] | None = None,
    attraction_items: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    days = max(1, number_of_days)
    travelers = max(1, number_of_travelers)
    tier = _tier(accommodation_preference)

    food_cost = FOOD_PER_PERSON_PER_DAY_MID[tier] * travelers * days
    misc_cost = MISC_PER_PERSON_PER_DAY * travelers * days

    categories = {
        "flights": round(flights_cost),
        "hotel": round(hotel_cost),
        "transport": round(transport_cost),
        "food": round(food_cost),
        "attractions": round(attractions_cost),
        "tolls": round(tolls_cost),
        "parking": round(parking_cost),
        "other": round(other_cost + misc_cost),
    }

    total_estimated_cost = sum(categories.values())
    remaining = total_budget - total_estimated_cost
    over_budget = max(0.0, -remaining)
    progress_percent = round(min(999, (total_estimated_cost / total_budget) * 100)) if total_budget > 0 else 0

    if total_budget <= 0:
        status = "UNKNOWN"
    elif total_estimated_cost <= total_budget:
        status = "WITHIN_BUDGET"
    else:
        status = "OVER_BUDGET"

    suggestions = _build_suggestions(
        over_budget=over_budget,
        travelers=travelers,
        flights_cost=flights_cost,
        hotel_cost=hotel_cost,
        transport_cost=transport_cost,
        attractions_cost=attractions_cost,
        flight_alternatives=flight_alternatives or [],
        hotel_alternatives=hotel_alternatives or [],
        attraction_items=attraction_items or [],
    )

    potential_total_saving = sum(s["potential_saving"] for s in suggestions)

    return {
        "currency": "INR",
        "total_budget": round(total_budget),
        "categories": categories,
        "total_estimated_cost": total_estimated_cost,
        "remaining_budget": round(max(0.0, remaining)),
        "over_budget_amount": round(over_budget),
        "progress_percent": progress_percent,
        "status": status,
        "suggestions": suggestions,
        "potential_total_saving": round(potential_total_saving),
        "remaining_after_suggestions": round(over_budget - potential_total_saving) if status == "OVER_BUDGET" else None,
    }


def _build_suggestions(
    *,
    over_budget: float,
    travelers: int,
    flights_cost: float,
    hotel_cost: float,
    transport_cost: float,
    attractions_cost: float,
    flight_alternatives: list[dict[str, Any]],
    hotel_alternatives: list[dict[str, Any]],
    attraction_items: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if over_budget <= 0:
        return []

    suggestions: list[dict[str, Any]] = []

    if flight_alternatives:
        cheapest = min(flight_alternatives, key=lambda f: f.get("price_per_traveler", f.get("total_price", 1e12)))
        cheapest_total = cheapest.get("total_price") or cheapest.get("price_per_traveler", 0) * travelers
        saving = flights_cost - cheapest_total
        if saving > 200:
            suggestions.append({
                "category": "flights",
                "icon": "flight",
                "action": f"Choose {cheapest['airline']} ({cheapest['stops_label']}, {cheapest['duration_label']}) instead",
                "potential_saving": round(saving),
            })

    if hotel_alternatives:
        cheapest_hotel = min(hotel_alternatives, key=lambda h: h.get("total_stay_cost", 1e12))
        saving = hotel_cost - cheapest_hotel.get("total_stay_cost", hotel_cost)
        if saving > 200:
            suggestions.append({
                "category": "hotel",
                "icon": "hotel",
                "action": f"Switch to {cheapest_hotel['name']} ({cheapest_hotel.get('tier', 'lower tier')})",
                "potential_saving": round(saving),
            })

    if transport_cost > 0:
        saving = transport_cost * 0.18
        suggestions.append({
            "category": "transport",
            "icon": "transport",
            "action": "Use shared/local transport instead of private cabs for some legs",
            "potential_saving": round(saving),
        })

    if attraction_items:
        paid_items = [a for a in attraction_items if (a.get("estimated_cost") or 0) > 0]
        if paid_items:
            costliest = max(paid_items, key=lambda a: a.get("estimated_cost") or 0)
            saving = (costliest.get("estimated_cost") or 0) * travelers * 0.85
            if saving > 100:
                suggestions.append({
                    "category": "attractions",
                    "icon": "attraction",
                    "action": f"Swap '{costliest.get('name')}' for a free attraction or viewpoint",
                    "potential_saving": round(saving),
                })

    return suggestions
