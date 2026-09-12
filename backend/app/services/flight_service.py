"""
Flight options - a mock flight-search service.

There is no live fare provider connected (no API key is configured for one -
see `app/core/config.py` / `.env`), so this module generates realistic,
deterministic flight options instead of pretending to query a real GDS.

Honesty rules, matching the rest of the `reality` layer:
  * Every response is stamped `is_mock: True` and `data_label: "ESTIMATE"`.
  * Prices and times are generated from the real great-circle distance between
    the two cities plus a seeded random factor, so the same search returns the
    same options (reproducible) but different routes/dates produce different,
    plausible numbers - never a hardcoded price list.
  * This is built as a clean abstraction: swap `generate_flight_options` for a
    call to a real flight API later and nothing else in the app needs to change.
"""

from __future__ import annotations

import hashlib
import math
import random
from datetime import date, datetime, timedelta
from typing import Any

from app.algorithms.route_optimizer import haversine_distance

# Approximate coordinates + IATA codes for major Indian airports. Public,
# well-known facts - used only to estimate distance/duration, not as a live
# airport database.
AIRPORTS: dict[str, dict[str, Any]] = {
    "hyderabad": {"code": "HYD", "name": "Rajiv Gandhi International", "lat": 17.2403, "lon": 78.4294, "city_distance_km": 24},
    "goa": {"code": "GOI", "name": "Dabolim / Manohar", "lat": 15.3808, "lon": 73.8314, "city_distance_km": 29},
    "jaipur": {"code": "JAI", "name": "Jaipur International", "lat": 26.8242, "lon": 75.8122, "city_distance_km": 13},
    "new delhi": {"code": "DEL", "name": "Indira Gandhi International", "lat": 28.5562, "lon": 77.1000, "city_distance_km": 16},
    "delhi": {"code": "DEL", "name": "Indira Gandhi International", "lat": 28.5562, "lon": 77.1000, "city_distance_km": 16},
    "mumbai": {"code": "BOM", "name": "Chhatrapati Shivaji Maharaj International", "lat": 19.0896, "lon": 72.8656, "city_distance_km": 8},
    "kochi": {"code": "COK", "name": "Cochin International", "lat": 10.1520, "lon": 76.4019, "city_distance_km": 25},
    "bengaluru": {"code": "BLR", "name": "Kempegowda International", "lat": 13.1986, "lon": 77.7066, "city_distance_km": 35},
    "bangalore": {"code": "BLR", "name": "Kempegowda International", "lat": 13.1986, "lon": 77.7066, "city_distance_km": 35},
    "chennai": {"code": "MAA", "name": "Chennai International", "lat": 12.9941, "lon": 80.1709, "city_distance_km": 12},
    "kolkata": {"code": "CCU", "name": "Netaji Subhas Chandra Bose International", "lat": 22.6547, "lon": 88.4467, "city_distance_km": 16},
    "pune": {"code": "PNQ", "name": "Pune International", "lat": 18.5822, "lon": 73.9197, "city_distance_km": 10},
    "ahmedabad": {"code": "AMD", "name": "Sardar Vallabhbhai Patel International", "lat": 23.0772, "lon": 72.6347, "city_distance_km": 12},
    "lucknow": {"code": "LKO", "name": "Chaudhary Charan Singh International", "lat": 26.7606, "lon": 80.8893, "city_distance_km": 15},
    "varanasi": {"code": "VNS", "name": "Lal Bahadur Shastri", "lat": 25.4524, "lon": 82.8593, "city_distance_km": 26},
    "udaipur": {"code": "UDR", "name": "Maharana Pratap", "lat": 24.6177, "lon": 73.8961, "city_distance_km": 22},
    "srinagar": {"code": "SXR", "name": "Sheikh ul-Alam International", "lat": 33.9871, "lon": 74.7742, "city_distance_km": 15},
    "guwahati": {"code": "GAU", "name": "Lokpriya Gopinath Bordoloi International", "lat": 26.1061, "lon": 91.5859, "city_distance_km": 21},
    "bhubaneswar": {"code": "BBI", "name": "Biju Patnaik International", "lat": 20.2444, "lon": 85.8178, "city_distance_km": 4},
    "nagpur": {"code": "NAG", "name": "Dr. Babasaheb Ambedkar International", "lat": 21.0922, "lon": 79.0472, "city_distance_km": 8},
    "indore": {"code": "IDR", "name": "Devi Ahilya Bai Holkar", "lat": 22.7218, "lon": 75.8011, "city_distance_km": 9},
    "chandigarh": {"code": "IXC", "name": "Chandigarh International", "lat": 30.6735, "lon": 76.7885, "city_distance_km": 12},
    "coimbatore": {"code": "CJB", "name": "Coimbatore International", "lat": 11.0300, "lon": 77.0434, "city_distance_km": 12},
    "trivandrum": {"code": "TRV", "name": "Trivandrum International", "lat": 8.4821, "lon": 76.9200, "city_distance_km": 6},
    "thiruvananthapuram": {"code": "TRV", "name": "Trivandrum International", "lat": 8.4821, "lon": 76.9200, "city_distance_km": 6},
    "amritsar": {"code": "ATQ", "name": "Sri Guru Ram Dass Jee International", "lat": 31.7096, "lon": 74.7973, "city_distance_km": 11},
}

AIRLINES = [
    {"name": "IndiGo", "code": "6E", "price_factor": 1.00, "amenities": ["Cabin baggage", "Paid meals"]},
    {"name": "Air India", "code": "AI", "price_factor": 1.14, "amenities": ["Free meal", "Checked baggage"]},
    {"name": "Akasa Air", "code": "QP", "price_factor": 0.96, "amenities": ["Cabin baggage", "Extra legroom seats"]},
    {"name": "Vistara", "code": "UK", "price_factor": 1.22, "amenities": ["Free meal", "Checked baggage", "Extra legroom seats"]},
    {"name": "SpiceJet", "code": "SG", "price_factor": 0.93, "amenities": ["Cabin baggage", "Paid meals"]},
]

AVG_CRUISE_SPEED_KMH = 720.0
TAXI_AND_CLIMB_MIN = 35  # ground taxi + climb/descent, added to every flight
LAYOVER_MIN_RANGE = (55, 110)
STOP_THRESHOLD_KM = 1300  # beyond this, some options plausibly route via a hub


def get_airport(city_name: str) -> dict[str, Any] | None:
    key = (city_name or "").strip().lower()
    for name, info in AIRPORTS.items():
        if name in key or key in name:
            return {"city": name.title(), **info}
    return None


def _seed_for(*parts: Any) -> random.Random:
    raw = "|".join(str(p) for p in parts)
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()
    return random.Random(int(digest[:12], 16))


def _distance_km(origin: dict, destination: dict) -> float:
    return haversine_distance(origin["lat"], origin["lon"], destination["lat"], destination["lon"])


def _duration_minutes(distance_km: float, stops: int, rng: random.Random) -> int:
    flying = (distance_km / AVG_CRUISE_SPEED_KMH) * 60
    total = flying + TAXI_AND_CLIMB_MIN
    for _ in range(stops):
        total += rng.randint(*LAYOVER_MIN_RANGE)
    return max(35, round(total))


def _format_hm(total_minutes: int) -> str:
    h, m = divmod(total_minutes, 60)
    if h and m:
        return f"{h}h {m}m"
    if h:
        return f"{h}h"
    return f"{m}m"


def _base_price(distance_km: float) -> float:
    # A rough but plausible domestic-India fare curve: a fixed floor plus a
    # per-km rate that tapers off on longer routes (fuel surcharge dominates
    # short hops, base fare dominates long ones).
    return 2200 + distance_km * 4.3 + math.sqrt(max(distance_km, 1)) * 12


def _score_flight(flight: dict[str, Any], budget_per_traveler: float | None) -> float:
    """Lower is better. Weighs price, duration, stops and a sane departure time."""
    price_score = flight["price_per_traveler"] / 1000.0
    duration_score = flight["duration_minutes"] / 30.0
    stop_score = flight["stops"] * 40
    hour = int(flight["departure_time"].split(":")[0])
    # Mild penalty for very early (<6) or very late (>22) departures.
    time_score = 15 if (hour < 6 or hour > 22) else 0
    over_budget_score = 0.0
    if budget_per_traveler and flight["price_per_traveler"] > budget_per_traveler:
        over_budget_score = (flight["price_per_traveler"] - budget_per_traveler) / 200.0
    return price_score * 4 + duration_score * 2 + stop_score + time_score + over_budget_score


def generate_flight_options(
    origin_city: str,
    destination_city: str,
    travel_date: date | str | None,
    travelers: int = 1,
    budget_for_flights: float | None = None,
    num_options: int = 5,
) -> dict[str, Any]:
    """
    Returns a set of mock, clearly-labelled flight options for one direction.

    `budget_for_flights` (optional, total for all travellers for this leg) is
    used only to bias the "Recommended" pick, never to hide options.
    """
    origin = get_airport(origin_city)
    destination = get_airport(destination_city)

    if not origin or not destination:
        return {
            "available": False,
            "reason": (
                f"We don't have an airport reference for "
                f"{'origin' if not origin else 'destination'} city "
                f"'{origin_city if not origin else destination_city}'."
            ),
            "options": [],
            "recommended_id": None,
        }

    if isinstance(travel_date, str) and travel_date:
        try:
            travel_date = date.fromisoformat(travel_date)
        except ValueError:
            travel_date = None
    if not isinstance(travel_date, date):
        travel_date = date.today() + timedelta(days=14)

    distance = _distance_km(origin, destination)
    rng = _seed_for(origin["code"], destination["code"], travel_date.isoformat())

    budget_per_traveler = (budget_for_flights / travelers) if (budget_for_flights and travelers) else None

    # Spread departure times across the day so options feel like a real search.
    slot_hours = sorted(rng.sample(range(5, 23), k=min(num_options, 18)))

    options: list[dict[str, Any]] = []
    for i, hour in enumerate(slot_hours[:num_options]):
        airline = AIRLINES[(i + rng.randint(0, len(AIRLINES) - 1)) % len(AIRLINES)]
        stops = 1 if (distance > STOP_THRESHOLD_KM and rng.random() < 0.35) else 0
        duration_min = _duration_minutes(distance, stops, rng)

        minute = rng.choice([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])
        dep_dt = datetime(travel_date.year, travel_date.month, travel_date.day, hour, minute)
        arr_dt = dep_dt + timedelta(minutes=duration_min)

        price_variance = rng.uniform(0.88, 1.18)
        price = round(_base_price(distance) * airline["price_factor"] * price_variance, -1)
        # A few "deal" seats and a few "peak" seats, like a real search result.
        if rng.random() < 0.2:
            price = round(price * 0.85, -1)

        flight_number = f"{airline['code']} {rng.randint(100, 999)}"

        option = {
            "id": f"{airline['code']}{i}-{origin['code']}{destination['code']}-{hour:02d}{minute:02d}",
            "airline": airline["name"],
            "airline_code": airline["code"],
            "flight_number": flight_number,
            "origin_airport": origin["code"],
            "origin_city": origin_city.strip().title(),
            "destination_airport": destination["code"],
            "destination_city": destination_city.strip().title(),
            "date": travel_date.isoformat(),
            "departure_time": dep_dt.strftime("%H:%M"),
            "arrival_time": arr_dt.strftime("%H:%M"),
            "arrival_next_day": arr_dt.date() != dep_dt.date(),
            "duration_minutes": duration_min,
            "duration_label": _format_hm(duration_min),
            "stops": stops,
            "stops_label": "Non-stop" if stops == 0 else f"{stops} stop",
            "amenities": airline["amenities"],
            "price_per_traveler": int(price),
            "total_price": int(price) * max(1, travelers),
            "currency": "INR",
        }
        options.append(option)

    for option in options:
        option["_score"] = _score_flight(option, budget_per_traveler)

    options.sort(key=lambda o: o["_score"])
    recommended_id = options[0]["id"] if options else None
    if options:
        best = options[0]
        best["recommended"] = True
        best["recommended_reason"] = _recommend_reason(best, options)
    for option in options[1:]:
        option["recommended"] = False
        option["recommended_reason"] = None

    # Re-sort for display: recommended first, then by price.
    options.sort(key=lambda o: (not o["recommended"], o["price_per_traveler"]))
    for option in options:
        option.pop("_score", None)

    return {
        "available": True,
        "origin_airport": origin["code"],
        "destination_airport": destination["code"],
        "distance_km": round(distance),
        "options": options,
        "recommended_id": recommended_id,
        "is_mock": True,
        "data_label": "ESTIMATE",
        "note": (
            "Demo flight data - no live fare provider is connected. Prices and "
            "times are generated from real route distance, not live availability."
        ),
    }


def _recommend_reason(best: dict[str, Any], all_options: list[dict[str, Any]]) -> str:
    cheapest = min(o["price_per_traveler"] for o in all_options)
    fastest = min(o["duration_minutes"] for o in all_options)
    bits = []
    if best["price_per_traveler"] == cheapest:
        bits.append("cheapest fare")
    if best["duration_minutes"] == fastest:
        bits.append("shortest duration")
    if best["stops"] == 0:
        bits.append("non-stop")
    if not bits:
        bits.append("best overall balance of price, duration and stops")
    return "Best value: " + ", ".join(bits) + "."


def find_flight_by_id(options: list[dict[str, Any]], flight_id: str) -> dict[str, Any] | None:
    return next((o for o in options if o["id"] == flight_id), None)
