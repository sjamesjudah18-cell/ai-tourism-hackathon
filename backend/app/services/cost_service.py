"""
Cost Reality - what the trip will actually cost, with every figure labelled.

This extends the existing `budget_service`/`optimize_budget` split (which
divides a budget by fixed percentages) with the opposite calculation: a
bottom-up estimate of what the planned itinerary really costs, compared against
what the traveller said they had.

Honesty rules enforced here:
  * Nothing is presented as a guaranteed price. Every line is a range.
  * Seeded hotel rates are curated reference data, so they are labelled
    STATIC/APPROXIMATE - never "live price".
  * "Getting there" is UNAVAILABLE unless the traveller tells us where they are
    starting from. We do not guess an origin.
"""

from __future__ import annotations

from typing import Any

from app.core.reality import (
    Confidence,
    DataLabel,
    Status,
    make_datapoint,
    make_section,
    make_source,
    now_utc,
)

# Per-person, per-day food spend bands in INR. Curated reference figures for
# Indian metros - reviewed, not live, and labelled as such.
FOOD_PER_PERSON_PER_DAY = {
    "Budget": (350, 600),
    "Comfort": (700, 1400),
    "Luxury": (1800, 3500),
}

# Per-person, per-day local transport bands in INR.
LOCAL_TRANSPORT_PER_PERSON_PER_DAY = {
    "Budget": (120, 250),     # metro, buses, shared autos
    "Comfort": (300, 650),    # autos and ride-hailing
    "Luxury": (900, 2000),    # full-day private cab
}

# Miscellaneous: SIM, tips, water, laundry, small shopping.
MISC_PER_PERSON_PER_DAY = (100, 300)

# Rooms are costed for two sharing, which is how hotels actually price.
GUESTS_PER_ROOM = 2

TIER_ALIASES = {"budget": "Budget", "comfort": "Comfort", "luxury": "Luxury"}


def normalise_tier(preference: str | None) -> str:
    return TIER_ALIASES.get((preference or "Comfort").strip().lower(), "Comfort")


def _range(low: float, high: float) -> dict[str, Any]:
    return {"low": int(round(low)), "high": int(round(high)), "mid": int(round((low + high) / 2))}


def _line(
    key: str,
    title: str,
    low: float,
    high: float,
    label: str,
    basis: str,
    source: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "key": key,
        "title": title,
        "range": _range(low, high),
        "label": label,
        "basis": basis,
        "source": source,
    }


def estimate_trip_cost(
    destination: str,
    number_of_days: int,
    number_of_travelers: int,
    total_budget: float,
    accommodation_preference: str | None,
    itinerary: list[dict] | None = None,
    hotels: list[dict] | None = None,
    origin: str | None = None,
) -> dict[str, Any]:
    """
    Bottom-up cost estimate for the planned trip.

    Returns the per-category lines, the total range, and how it sits against
    the stated budget.
    """
    days = max(1, number_of_days)
    travelers = max(1, number_of_travelers)
    nights = max(1, days - 1)
    tier = normalise_tier(accommodation_preference)
    lines: list[dict[str, Any]] = []

    # --- Getting there -----------------------------------------------------
    # We refuse to guess. Without an origin there is no honest number.
    if origin:
        lines.append(_line(
            "getting_there",
            "Getting there",
            0, 0,
            DataLabel.UNAVAILABLE,
            f"Fares from {origin} are not available - no fare provider is connected. "
            "Check an operator directly for current prices.",
        ))
    else:
        lines.append(_line(
            "getting_there",
            "Getting there",
            0, 0,
            DataLabel.UNAVAILABLE,
            "Add your starting city to estimate travel to the destination. "
            "Return fares are not included in the totals below.",
        ))

    # --- Stay --------------------------------------------------------------
    rooms = -(-travelers // GUESTS_PER_ROOM)  # ceiling division
    hotel_prices = [
        h.get("price_per_night") for h in (hotels or [])
        if isinstance(h.get("price_per_night"), (int, float)) and h.get("price_per_night")
    ]

    if hotel_prices:
        low_rate, high_rate = min(hotel_prices), max(hotel_prices)
        stay_label = DataLabel.APPROXIMATE
        stay_basis = (
            f"{rooms} room(s) x {nights} night(s) at the {tier} options shown "
            f"(Rs {int(low_rate):,}-{int(high_rate):,} per night). Indicative rates from "
            "our curated hotel data, not a live booking quote."
        )
        stay_source = make_source("Seeded hotel reference data")
    else:
        fallback_rates = {"Budget": (1200, 2500), "Comfort": (2800, 6500), "Luxury": (8000, 18000)}
        low_rate, high_rate = fallback_rates[tier]
        stay_label = DataLabel.ESTIMATE
        stay_basis = (
            f"{rooms} room(s) x {nights} night(s) at typical {tier.lower()} rates. "
            "No specific properties matched, so this is a category estimate."
        )
        stay_source = None

    lines.append(_line(
        "stay", "Stay",
        low_rate * rooms * nights,
        high_rate * rooms * nights,
        stay_label, stay_basis, stay_source,
    ))

    # --- Food --------------------------------------------------------------
    food_low, food_high = FOOD_PER_PERSON_PER_DAY[tier]
    lines.append(_line(
        "food", "Food",
        food_low * travelers * days,
        food_high * travelers * days,
        DataLabel.ESTIMATE,
        f"Rs {food_low:,}-{food_high:,} per person per day at {tier.lower()} level, "
        f"for {travelers} traveller(s) over {days} day(s).",
    ))

    # --- Local transport ---------------------------------------------------
    lt_low, lt_high = LOCAL_TRANSPORT_PER_PERSON_PER_DAY[tier]
    lines.append(_line(
        "local_transport", "Local transport",
        lt_low * travelers * days,
        lt_high * travelers * days,
        DataLabel.ESTIMATE,
        f"Rs {lt_low:,}-{lt_high:,} per person per day for autos, metro and "
        "ride-hailing between the stops on your plan.",
    ))

    # --- Attractions and activities ---------------------------------------
    # Split by what the itinerary actually schedules, per traveller.
    attractions_cost = 0.0
    activities_cost = 0.0
    for day in itinerary or []:
        for activity in day.get("activities", []) or []:
            cost = activity.get("estimated_cost") or 0
            category = (activity.get("category") or "").lower()
            if any(k in category for k in ("adventure", "nature")):
                activities_cost += cost
            elif "food" in category:
                # Meals are already covered by the food line; skip to avoid
                # charging the traveller twice for the same biryani.
                continue
            else:
                attractions_cost += cost

    lines.append(_line(
        "attractions", "Attractions",
        attractions_cost * travelers * 0.85,
        attractions_cost * travelers * 1.25,
        DataLabel.ESTIMATE,
        f"Entry for {travelers} traveller(s) across the heritage and cultural stops "
        "on your itinerary. Ticket prices change and often differ for cameras.",
    ))

    lines.append(_line(
        "activities", "Activities",
        activities_cost * travelers * 0.85,
        activities_cost * travelers * 1.35,
        DataLabel.ESTIMATE,
        f"Adventure and outdoor bookings for {travelers} traveller(s). Operators "
        "price these seasonally.",
    ))

    # --- Miscellaneous -----------------------------------------------------
    misc_low, misc_high = MISC_PER_PERSON_PER_DAY
    lines.append(_line(
        "miscellaneous", "Miscellaneous",
        misc_low * travelers * days,
        misc_high * travelers * days,
        DataLabel.ESTIMATE,
        "Water, tips, small shopping, SIM and incidentals.",
    ))

    # --- Totals ------------------------------------------------------------
    subtotal_low = sum(line["range"]["low"] for line in lines)
    subtotal_high = sum(line["range"]["high"] for line in lines)

    # Emergency buffer sits on top of the estimate, not inside it.
    buffer_low = subtotal_low * 0.10
    buffer_high = subtotal_high * 0.10
    lines.append(_line(
        "emergency_buffer", "Emergency buffer",
        buffer_low, buffer_high,
        DataLabel.ESTIMATE,
        "10% held back for a missed booking, a medical stop, or a surge-priced ride "
        "home. Recommended, not spent.",
    ))

    total_low = subtotal_low + buffer_low
    total_high = subtotal_high + buffer_high
    total_mid = (total_low + total_high) / 2

    status, headline, advice = _assess(total_low, total_high, total_mid, total_budget, travelers, days)

    return {
        "currency": "INR",
        "lines": lines,
        "subtotal": _range(subtotal_low, subtotal_high),
        "total": _range(total_low, total_high),
        "stated_budget": int(round(total_budget)),
        "remaining": {
            "low": int(round(total_budget - total_high)),
            "high": int(round(total_budget - total_low)),
        },
        "per_person_per_day": _range(
            total_low / (travelers * days), total_high / (travelers * days)
        ),
        "status": status,
        "headline": headline,
        "advice": advice,
        "excludes_travel_to_destination": True,
    }


def _assess(low: float, high: float, mid: float, budget: float, travelers: int, days: int):
    """Compares the bottom-up estimate against what the traveller said they had."""
    if budget <= 0:
        return (
            Status.UNKNOWN,
            "No budget was set, so there is nothing to compare the estimate against.",
            ["Set a total budget to see whether this plan fits."],
        )

    ratio = mid / budget

    if high <= budget:
        return (
            Status.GOOD,
            f"Your plan looks affordable. Even at the high end (Rs {high:,.0f}) you stay "
            f"within your Rs {budget:,.0f} budget.",
            [
                f"You have roughly Rs {budget - high:,.0f} of headroom for a nicer meal "
                "or an extra experience.",
                "Travel to and from the destination is not included in this figure.",
            ],
        )

    if low <= budget < high:
        return (
            Status.FAIR,
            f"This plan is workable but tight. It lands between Rs {low:,.0f} and "
            f"Rs {high:,.0f} against a Rs {budget:,.0f} budget.",
            [
                "Staying at the lower end means choosing street food and local transport "
                "over cabs and sit-down restaurants.",
                f"Cutting one paid activity typically saves Rs {max(300, int(mid * 0.05)):,} "
                f"for {travelers} traveller(s).",
                "Travel to and from the destination is not included in this figure.",
            ],
        )

    over = low - budget
    severity_status = Status.POOR if ratio > 1.35 else Status.CAUTION
    return (
        severity_status,
        f"This plan is likely to exceed your budget. The cheapest realistic outcome is "
        f"about Rs {low:,.0f} against a Rs {budget:,.0f} budget - roughly Rs {over:,.0f} over.",
        [
            f"Dropping to a Budget stay tier is usually the single biggest saving over "
            f"{max(1, days - 1)} night(s).",
            "Metro and shared autos instead of ride-hailing can save Rs 300-500 per person "
            "per day.",
            "Travel to and from the destination is not included, so the real gap is wider.",
        ],
    )


def build_cost_section(
    destination: str,
    number_of_days: int,
    number_of_travelers: int,
    total_budget: float,
    accommodation_preference: str | None,
    itinerary: list[dict] | None = None,
    hotels: list[dict] | None = None,
    origin: str | None = None,
) -> dict[str, Any]:
    """The Cost Reality category of the Reality Check."""
    estimate = estimate_trip_cost(
        destination=destination,
        number_of_days=number_of_days,
        number_of_travelers=number_of_travelers,
        total_budget=total_budget,
        accommodation_preference=accommodation_preference,
        itinerary=itinerary,
        hotels=hotels,
        origin=origin,
    )

    return make_section(
        key="cost_reality",
        title="Cost Reality",
        status=estimate["status"],
        summary=estimate["headline"],
        advice=estimate["advice"],
        details=estimate,
        confidence=Confidence.MEDIUM,
        sources=[],
        last_updated=now_utc(),
    )
