"""
Car / bike trip-cost calculator.

Every figure here is a transparent, formula-driven ESTIMATE - there is no live
fuel-price feed, toll-plaza database or parking-rate API connected. Rather than
inventing exact numbers and presenting them as real, each line carries the
formula that produced it (so a traveller can sanity-check or override it) and
is labelled the same way the rest of the `reality` layer labels its figures.
"""

from __future__ import annotations

from typing import Any

# Reference mileage figures (km per litre), reviewed not live.
DEFAULT_MILEAGE_KMPL = {
    "car": {"petrol": 15.0, "diesel": 18.0, "cng": 22.0, "electric": None},
    "bike": {"petrol": 40.0, "electric": None},
}

# Reference per-litre fuel prices in INR, reviewed not live - these vary by
# state and change often, so they are always labelled as an estimate.
DEFAULT_FUEL_PRICE_PER_LITER = {
    "petrol": 105.0,
    "diesel": 95.0,
    "cng": 75.0,
}

# Per-km electricity cost for EVs, INR.
DEFAULT_EV_COST_PER_KM = {"car": 1.4, "bike": 0.35}

# Highway toll gates cluster on longer intercity hops; short local driving
# rarely crosses one. This is a heuristic average, not a real toll-plaza table.
TOLL_RATE_PER_KM = 1.6
TOLL_FREE_DISTANCE_KM = 40  # first stretch (typically within-city) has no tolls

PARKING_PER_DAY = {"car": 100.0, "bike": 30.0}

DEFAULT_RENTAL_PER_DAY = {"car": 1800.0, "bike": 500.0}


def _round(value: float) -> float:
    return round(value, 2)


def calculate_vehicle_cost(
    vehicle_type: str,
    distance_km: float,
    fuel_type: str = "petrol",
    mileage_kmpl: float | None = None,
    fuel_price_per_liter: float | None = None,
    ownership: str = "personal",
    rental_cost_per_day: float | None = None,
    days: int = 1,
    include_tolls: bool = True,
    include_parking: bool = True,
) -> dict[str, Any]:
    """
    Bottom-up cost breakdown for a car or bike trip.

    `distance_km` is the TOTAL distance for the whole trip (intercity there-and-
    back plus local sightseeing driving, if applicable) - callers are
    responsible for adding those up honestly rather than this function
    guessing a route.
    """
    vehicle_type = (vehicle_type or "car").strip().lower()
    if vehicle_type not in ("car", "bike"):
        vehicle_type = "car"
    fuel_type = (fuel_type or "petrol").strip().lower()
    ownership = (ownership or "personal").strip().lower()
    distance_km = max(0.0, float(distance_km or 0))
    days = max(1, int(days or 1))

    lines: list[dict[str, Any]] = []
    is_electric = fuel_type == "electric"

    if is_electric:
        cost_per_km = DEFAULT_EV_COST_PER_KM[vehicle_type]
        fuel_cost = distance_km * cost_per_km
        fuel_required = None
        mileage_used = None
        fuel_price_used = None
        formula = f"{distance_km:g} km x Rs {cost_per_km}/km (average EV charging cost) = Rs {fuel_cost:,.0f}"
    else:
        mileage_used = mileage_kmpl or DEFAULT_MILEAGE_KMPL[vehicle_type].get(fuel_type) or DEFAULT_MILEAGE_KMPL[vehicle_type]["petrol"]
        fuel_price_used = fuel_price_per_liter or DEFAULT_FUEL_PRICE_PER_LITER.get(fuel_type, DEFAULT_FUEL_PRICE_PER_LITER["petrol"])
        fuel_required = distance_km / mileage_used if mileage_used else 0.0
        fuel_cost = fuel_required * fuel_price_used
        formula = (
            f"{distance_km:g} km / {mileage_used:g} km/L = {fuel_required:,.2f} L; "
            f"{fuel_required:,.2f} L x Rs {fuel_price_used:g}/L = Rs {fuel_cost:,.0f}"
        )

    lines.append({
        "key": "fuel",
        "title": "Fuel" if not is_electric else "Charging",
        "amount": _round(fuel_cost),
        "formula": formula,
        "label": "ESTIMATE",
    })

    toll_estimate = 0.0
    if include_tolls and distance_km > TOLL_FREE_DISTANCE_KM:
        tolled_distance = distance_km - TOLL_FREE_DISTANCE_KM
        toll_estimate = tolled_distance * TOLL_RATE_PER_KM
        lines.append({
            "key": "tolls",
            "title": "Tolls",
            "amount": _round(toll_estimate),
            "formula": (
                f"~{tolled_distance:,.0f} km of highway driving x Rs {TOLL_RATE_PER_KM}/km "
                f"(average toll rate) = Rs {toll_estimate:,.0f}"
            ),
            "label": "ESTIMATE",
            "note": "No live toll-plaza data is connected - this is a distance-based average, not exact gate fares.",
        })
    else:
        lines.append({
            "key": "tolls",
            "title": "Tolls",
            "amount": 0.0,
            "formula": "Mostly local driving - unlikely to cross a tolled highway stretch.",
            "label": "ESTIMATE",
        })

    parking_estimate = 0.0
    if include_parking:
        per_day = PARKING_PER_DAY[vehicle_type]
        parking_estimate = per_day * days
        lines.append({
            "key": "parking",
            "title": "Parking",
            "amount": _round(parking_estimate),
            "formula": f"Rs {per_day:g}/day x {days} day(s) = Rs {parking_estimate:,.0f}",
            "label": "ESTIMATE",
            "note": "Typical city parking rate - actual venues vary.",
        })

    rental_cost = 0.0
    if ownership == "rental":
        per_day = rental_cost_per_day or DEFAULT_RENTAL_PER_DAY[vehicle_type]
        rental_cost = per_day * days
        lines.append({
            "key": "rental",
            "title": "Rental cost",
            "amount": _round(rental_cost),
            "formula": f"Rs {per_day:g}/day x {days} day(s) = Rs {rental_cost:,.0f}",
            "label": "ESTIMATE",
        })

    total_cost = fuel_cost + toll_estimate + parking_estimate + rental_cost

    return {
        "vehicle_type": vehicle_type,
        "fuel_type": fuel_type,
        "ownership": ownership,
        "distance_km": _round(distance_km),
        "mileage_kmpl": mileage_used,
        "fuel_price_per_liter": fuel_price_used,
        "fuel_required_liters": _round(fuel_required) if fuel_required is not None else None,
        "days": days,
        "lines": lines,
        "fuel_cost": _round(fuel_cost),
        "toll_estimate": _round(toll_estimate),
        "parking_estimate": _round(parking_estimate),
        "rental_cost": _round(rental_cost),
        "total_cost": _round(total_cost),
        "currency": "INR",
        "label": "ESTIMATE",
        "note": (
            "Fuel/charging cost is calculated from the distance and mileage you gave "
            "(or reviewed reference defaults). Tolls and parking are distance/day-based "
            "averages, not live rates."
        ),
    }
