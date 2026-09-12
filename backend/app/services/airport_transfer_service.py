"""
Airport <-> hotel transfer planning.

No live cab-fare or routing API is connected, so distance comes from the real
haversine distance between the airport and the hotel (scaled by a road-vs-
straight-line factor), and fare/time come from transparent per-km reference
rates. Every figure here is labelled ESTIMATE, consistent with the rest of the
`reality` layer.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from app.algorithms.route_optimizer import haversine_distance
from app.services.flight_service import get_airport

# Straight-line distance underestimates real road distance - India's road
# network rarely runs point-to-point.
ROAD_DISTANCE_FACTOR = 1.35

# Realistic buffers, in minutes. Configurable constants rather than magic
# numbers scattered through the scheduling logic.
BUFFERS = {
    "baggage_and_exit_min": 40,   # deplane, baggage claim, walk out
    "pickup_wait_min": 15,        # finding the cab/car, loading luggage
    "checkin_buffer_min": 30,     # hotel check-in + settling in
    "departure_checkout_min": 20, # hotel checkout formalities
    "airport_arrival_buffer_min": 120,  # recommended arrival-before-departure, domestic
    "security_buffer_min": 45,    # security + walk to gate, folded into the above
}

CAB_BASE_FARE = 100.0
CAB_RATE_PER_KM = 17.0
AVG_AIRPORT_ROAD_SPEED_KMH = 35.0

MODE_RATE_PER_KM = {
    "Cab": CAB_RATE_PER_KM,
    "Taxi / Cab": CAB_RATE_PER_KM,
    "Car": 12.0,   # self-drive/own car: only fuel-equivalent cost, no fare markup
    "Public transport": 3.0,
    "Bike": 4.0,
}


def _parse_time(value: str | None, fallback: datetime) -> datetime:
    if not value:
        return fallback
    for fmt in ("%H:%M", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"):
        try:
            parsed = datetime.strptime(value, fmt)
            if fmt == "%H:%M":
                return fallback.replace(hour=parsed.hour, minute=parsed.minute, second=0, microsecond=0)
            return parsed
        except ValueError:
            continue
    return fallback


def plan_airport_transfer(
    destination_city: str,
    flight_time: str,
    direction: str = "arrival",
    hotel: dict[str, Any] | None = None,
    transport_mode: str = "Cab",
    travel_date: str | None = None,
) -> dict[str, Any]:
    """
    `direction` is "arrival" (airport -> hotel) or "departure" (hotel -> airport).
    `hotel` is an optional dict with latitude/longitude/name; without it we fall
    back to the airport's known distance-from-city-centre.
    """
    airport = get_airport(destination_city)
    if not airport:
        return {
            "available": False,
            "reason": f"No airport reference available for {destination_city}.",
        }

    if hotel and hotel.get("latitude") is not None and hotel.get("longitude") is not None:
        straight_km = haversine_distance(
            airport["lat"], airport["lon"], hotel["latitude"], hotel["longitude"]
        )
        distance_km = straight_km * ROAD_DISTANCE_FACTOR
        distance_label = "ESTIMATE"
        distance_basis = f"Straight-line distance to {hotel.get('name', 'the hotel')}, scaled for real road routing."
    else:
        distance_km = airport["city_distance_km"] * ROAD_DISTANCE_FACTOR
        distance_label = "APPROXIMATE"
        distance_basis = f"Typical distance from {airport['name']} to central {destination_city.title()} - no specific hotel selected yet."

    travel_minutes = max(15, round((distance_km / AVG_AIRPORT_ROAD_SPEED_KMH) * 60))
    rate = MODE_RATE_PER_KM.get(transport_mode, CAB_RATE_PER_KM)
    cost = round(CAB_BASE_FARE + distance_km * rate, -1) if transport_mode in ("Cab", "Taxi / Cab") else round(distance_km * rate, -1)

    today = datetime.today()
    if travel_date:
        try:
            base_date = datetime.fromisoformat(travel_date)
            today = today.replace(year=base_date.year, month=base_date.month, day=base_date.day)
        except ValueError:
            pass
    anchor = _parse_time(flight_time, today)

    result: dict[str, Any] = {
        "available": True,
        "destination": destination_city.title(),
        "airport_code": airport["code"],
        "airport_name": airport["name"],
        "direction": direction,
        "transport_mode": transport_mode,
        "distance_km": round(distance_km, 1),
        "distance_label": distance_label,
        "distance_basis": distance_basis,
        "estimated_minutes": travel_minutes,
        "estimated_cost": int(cost),
        "currency": "INR",
        "buffers_used": BUFFERS,
        "label": "ESTIMATE",
        "note": "No live routing/fare API is connected - distance is estimated and fare/time use reference rates.",
    }

    if direction == "arrival":
        ready_time = anchor + timedelta(minutes=BUFFERS["baggage_and_exit_min"])
        pickup_time = ready_time + timedelta(minutes=BUFFERS["pickup_wait_min"])
        hotel_arrival = pickup_time + timedelta(minutes=travel_minutes)
        free_time = hotel_arrival + timedelta(minutes=BUFFERS["checkin_buffer_min"])
        result.update({
            "flight_arrival_time": anchor.strftime("%H:%M"),
            "baggage_ready_time": ready_time.strftime("%H:%M"),
            "recommended_pickup_time": pickup_time.strftime("%H:%M"),
            "estimated_hotel_arrival": hotel_arrival.strftime("%H:%M"),
            "free_from": free_time.strftime("%H:%M"),
            "sequence": [
                {"label": "Flight lands", "time": anchor.strftime("%H:%M")},
                {"label": "Baggage & airport exit", "time": ready_time.strftime("%H:%M"), "duration_min": BUFFERS["baggage_and_exit_min"]},
                {"label": f"{transport_mode} pickup", "time": pickup_time.strftime("%H:%M"), "duration_min": BUFFERS["pickup_wait_min"]},
                {"label": "Travel to hotel", "time": hotel_arrival.strftime("%H:%M"), "duration_min": travel_minutes},
                {"label": "Check-in", "time": free_time.strftime("%H:%M"), "duration_min": BUFFERS["checkin_buffer_min"]},
            ],
        })
    else:
        # Work backwards from the flight's recommended airport-arrival time.
        must_arrive_by = anchor - timedelta(minutes=BUFFERS["airport_arrival_buffer_min"])
        depart_hotel_by = must_arrive_by - timedelta(minutes=travel_minutes)
        checkout_by = depart_hotel_by - timedelta(minutes=BUFFERS["departure_checkout_min"])
        result.update({
            "flight_departure_time": anchor.strftime("%H:%M"),
            "must_arrive_airport_by": must_arrive_by.strftime("%H:%M"),
            "depart_hotel_by": depart_hotel_by.strftime("%H:%M"),
            "recommended_checkout_by": checkout_by.strftime("%H:%M"),
            "sequence": [
                {"label": "Hotel checkout", "time": checkout_by.strftime("%H:%M"), "duration_min": BUFFERS["departure_checkout_min"]},
                {"label": "Travel to airport", "time": depart_hotel_by.strftime("%H:%M"), "duration_min": travel_minutes},
                {"label": "Airport buffer (security, check-in)", "time": must_arrive_by.strftime("%H:%M"), "duration_min": BUFFERS["airport_arrival_buffer_min"]},
                {"label": "Flight departs", "time": anchor.strftime("%H:%M")},
            ],
        })

    return result
