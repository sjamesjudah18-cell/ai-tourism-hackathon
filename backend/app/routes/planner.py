"""
End-to-end trip planner: flights, airport transfers, car/bike cost, a
realistic connected itinerary, and a full budget breakdown with optimization
suggestions - all tied to the traveller's actual selections.

`/api/planner/plan` is the master endpoint the frontend uses. The narrower
endpoints (`/flights`, `/vehicle-cost`, `/airport-transfer`) exist so each
piece is independently testable and so the frontend can query a single piece
without re-running the whole plan.
"""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.algorithms.route_optimizer import haversine_distance
from app.core.database import get_db
from app.models.destination import Destination
from app.models.place import Place
from app.services import flight_service
from app.services.airport_transfer_service import plan_airport_transfer
from app.services.geo_service import resolve_destination
from app.services.hotel_service import get_recommended_hotels
from app.services.itinerary_service import generate_itinerary
from app.services.placeholder_service import build_placeholders
from app.services.trip_budget_service import build_trip_budget
from app.services.trip_scheduler_service import build_day_timeline
from app.services.vehicle_cost_service import calculate_vehicle_cost

router = APIRouter(prefix="/api/planner", tags=["Planner"])


# --------------------------------------------------------------------------
# Standalone endpoints
# --------------------------------------------------------------------------

class FlightSearchRequest(BaseModel):
    origin: str
    destination: str
    date: str | None = None
    return_date: str | None = None
    travelers: int = 1
    round_trip: bool = True
    budget_for_flights: float | None = None


@router.post("/flights")
def search_flights(request: FlightSearchRequest):
    outbound = flight_service.generate_flight_options(
        origin_city=request.origin,
        destination_city=request.destination,
        travel_date=request.date,
        travelers=request.travelers,
        budget_for_flights=request.budget_for_flights,
    )
    result = {"outbound": outbound, "return": None}
    if request.round_trip:
        result["return"] = flight_service.generate_flight_options(
            origin_city=request.destination,
            destination_city=request.origin,
            travel_date=request.return_date,
            travelers=request.travelers,
            budget_for_flights=request.budget_for_flights,
        )
    return result


class VehicleCostRequest(BaseModel):
    vehicle_type: str = "car"
    distance_km: float
    fuel_type: str = "petrol"
    mileage_kmpl: float | None = None
    fuel_price_per_liter: float | None = None
    ownership: str = "personal"
    rental_cost_per_day: float | None = None
    days: int = 1


@router.post("/vehicle-cost")
def vehicle_cost(request: VehicleCostRequest):
    return calculate_vehicle_cost(
        vehicle_type=request.vehicle_type,
        distance_km=request.distance_km,
        fuel_type=request.fuel_type,
        mileage_kmpl=request.mileage_kmpl,
        fuel_price_per_liter=request.fuel_price_per_liter,
        ownership=request.ownership,
        rental_cost_per_day=request.rental_cost_per_day,
        days=request.days,
    )


class AirportTransferRequest(BaseModel):
    destination: str
    flight_time: str
    direction: str = "arrival"
    transport_mode: str = "Cab"
    travel_date: str | None = None
    hotel_name: str | None = None
    hotel_latitude: float | None = None
    hotel_longitude: float | None = None


@router.post("/airport-transfer")
def airport_transfer(request: AirportTransferRequest):
    hotel = None
    if request.hotel_latitude is not None and request.hotel_longitude is not None:
        hotel = {
            "name": request.hotel_name,
            "latitude": request.hotel_latitude,
            "longitude": request.hotel_longitude,
        }
    return plan_airport_transfer(
        destination_city=request.destination,
        flight_time=request.flight_time,
        direction=request.direction,
        hotel=hotel,
        transport_mode=request.transport_mode,
        travel_date=request.travel_date,
    )


# --------------------------------------------------------------------------
# The master endpoint
# --------------------------------------------------------------------------

class VehicleConfig(BaseModel):
    vehicle_type: str = "car"
    ownership: str = "personal"
    fuel_type: str = "petrol"
    mileage_kmpl: float | None = None
    fuel_price_per_liter: float | None = None
    rental_cost_per_day: float | None = None


class PlanRequest(BaseModel):
    destination: str
    origin: str | None = None
    number_of_days: int = 3
    total_budget: float = 20000
    number_of_travelers: int = 1
    interests: list[str] = []
    transport_preference: str = "Any"
    accommodation_preference: str = "Comfort"
    start_date: str | None = None
    selected_flight_id: str | None = None
    selected_return_flight_id: str | None = None
    selected_hotel_id: int | None = None
    vehicle: VehicleConfig | None = None


VEHICLE_TRANSPORT_MODES = {"car", "bike"}
TRANSFER_MODE_MAP = {"car": "Car", "bike": "Bike", "public transport": "Public transport"}


@router.post("/plan")
def build_trip_plan(request: PlanRequest, db: Session = Depends(get_db)):
    destination_str = request.destination.strip()
    days = max(1, request.number_of_days)
    travelers = max(1, request.number_of_travelers)
    budget = float(request.total_budget)
    accommodation = request.accommodation_preference or "Comfort"
    transport_pref = request.transport_preference or "Any"

    try:
        start_date = date.fromisoformat(request.start_date) if request.start_date else None
    except ValueError:
        start_date = None
    outbound_date = start_date or (date.today() + timedelta(days=14))
    return_date = outbound_date + timedelta(days=max(0, days - 1))

    # --- Candidate attractions, same resolution order as /api/itinerary/generate ---
    dest_obj = db.query(Destination).filter(Destination.name.ilike(f"%{destination_str}%")).first()
    db_places = db.query(Place).filter(Place.destination_id == dest_obj.id).all() if dest_obj else []

    location = resolve_destination(db, destination_str)
    if len(db_places) < (days * 3):
        synthetic = build_placeholders(
            destination_name=destination_str,
            latitude=location["latitude"] if location else 17.3850,
            longitude=location["longitude"] if location else 78.4867,
        )
        candidate_places = list(db_places) + synthetic
    else:
        candidate_places = list(db_places)

    budget_per_day = budget / days
    budget_level = 1 if budget_per_day < 3000 else 2 if budget_per_day < 7000 else 3

    itinerary_result = generate_itinerary(
        places=candidate_places,
        number_of_days=days,
        interests=request.interests,
        budget_level=budget_level,
    )
    day_itineraries = itinerary_result.get("itinerary", [])
    total_activities_cost_per_person = itinerary_result.get("total_activities_cost", 0)

    # --- Hotels ---
    hotels = get_recommended_hotels(db=db, destination_name=destination_str, preference=accommodation, days=days, limit=4)
    selected_hotel = None
    if request.selected_hotel_id is not None:
        selected_hotel = next((h for h in hotels if h["id"] == request.selected_hotel_id), None)
    if selected_hotel is None and hotels:
        selected_hotel = hotels[0]

    # --- Flights (only if an origin is known - we never guess where someone starts) ---
    flights_out = None
    flights_return = None
    selected_flight = None
    selected_return_flight = None

    if request.origin and request.origin.strip():
        flights_out = flight_service.generate_flight_options(
            origin_city=request.origin,
            destination_city=destination_str,
            travel_date=outbound_date,
            travelers=travelers,
            budget_for_flights=budget * 0.35,
        )
        flights_return = flight_service.generate_flight_options(
            origin_city=destination_str,
            destination_city=request.origin,
            travel_date=return_date,
            travelers=travelers,
            budget_for_flights=budget * 0.35,
        )
        if flights_out.get("available"):
            selected_flight = flight_service.find_flight_by_id(flights_out["options"], request.selected_flight_id) \
                if request.selected_flight_id else None
            if selected_flight is None:
                selected_flight = next((o for o in flights_out["options"] if o["recommended"]), flights_out["options"][0] if flights_out["options"] else None)
        if flights_return.get("available"):
            selected_return_flight = flight_service.find_flight_by_id(flights_return["options"], request.selected_return_flight_id) \
                if request.selected_return_flight_id else None
            if selected_return_flight is None:
                selected_return_flight = next((o for o in flights_return["options"] if o["recommended"]), flights_return["options"][0] if flights_return["options"] else None)

    # --- Airport <-> hotel transfers ---
    hotel_point = (
        {"name": selected_hotel["name"], "latitude": selected_hotel.get("latitude"), "longitude": selected_hotel.get("longitude")}
        if selected_hotel else None
    )
    transport_mode_for_transfer = TRANSFER_MODE_MAP.get(transport_pref.strip().lower(), "Cab")

    transfer_out = None
    transfer_return = None
    if selected_flight:
        transfer_out = plan_airport_transfer(
            destination_city=destination_str,
            flight_time=selected_flight["arrival_time"],
            direction="arrival",
            hotel=hotel_point,
            transport_mode=transport_mode_for_transfer,
            travel_date=outbound_date.isoformat(),
        )
    if selected_return_flight:
        transfer_return = plan_airport_transfer(
            destination_city=destination_str,
            flight_time=selected_return_flight["departure_time"],
            direction="departure",
            hotel=hotel_point,
            transport_mode=transport_mode_for_transfer,
            travel_date=return_date.isoformat(),
        )

    # --- Car / bike cost, if the traveller is self-driving ---
    vehicle_cost_result = None
    wants_vehicle = transport_pref.strip().lower() in VEHICLE_TRANSPORT_MODES or request.vehicle is not None
    if wants_vehicle:
        vehicle_cfg = request.vehicle or VehicleConfig(vehicle_type=transport_pref.strip().lower())
        local_km = sum(day.get("total_transit_km", 0) for day in day_itineraries)
        intercity_km = 0.0
        if request.origin and location:
            origin_point = resolve_destination(db, request.origin)
            if origin_point:
                intercity_km = haversine_distance(
                    origin_point["latitude"], origin_point["longitude"],
                    location["latitude"], location["longitude"],
                ) * 1.35 * 2  # round trip, road-distance factor
        total_km = local_km + intercity_km
        vehicle_cost_result = calculate_vehicle_cost(
            vehicle_type=vehicle_cfg.vehicle_type,
            distance_km=total_km,
            fuel_type=vehicle_cfg.fuel_type,
            mileage_kmpl=vehicle_cfg.mileage_kmpl,
            fuel_price_per_liter=vehicle_cfg.fuel_price_per_liter,
            ownership=vehicle_cfg.ownership,
            rental_cost_per_day=vehicle_cfg.rental_cost_per_day,
            days=days,
        )
        vehicle_cost_result["intercity_km"] = round(intercity_km, 1)
        vehicle_cost_result["local_km"] = round(local_km, 1)

    # --- Realistic clock-time schedule for each day ---
    for index, day in enumerate(day_itineraries):
        day["timeline"] = build_day_timeline(
            day,
            is_first_day=(index == 0),
            is_last_day=(index == len(day_itineraries) - 1),
            flight_out=selected_flight if index == 0 else None,
            transfer_out=transfer_out if index == 0 else None,
            flight_return=selected_return_flight if index == len(day_itineraries) - 1 else None,
            transfer_return=transfer_return if index == len(day_itineraries) - 1 else None,
        )

    # --- Budget, tying every selection together ---
    flights_cost_total = (selected_flight["total_price"] if selected_flight else 0) + \
        (selected_return_flight["total_price"] if selected_return_flight else 0)
    hotel_cost_total = selected_hotel["total_stay_cost"] if selected_hotel else 0
    attractions_cost_total = total_activities_cost_per_person * travelers

    transfer_cost_total = (transfer_out["estimated_cost"] if transfer_out and transfer_out.get("available") else 0) + \
        (transfer_return["estimated_cost"] if transfer_return and transfer_return.get("available") else 0)

    if vehicle_cost_result:
        # Self-driving: no separate airport cab, the vehicle covers that leg too.
        transport_cost_total = vehicle_cost_result["fuel_cost"]
        tolls_cost = vehicle_cost_result["toll_estimate"]
        parking_cost = vehicle_cost_result["parking_estimate"]
    else:
        local_transport_estimate = 350 * travelers * days  # mid-band local transport, consistent with cost_service
        transport_cost_total = local_transport_estimate + transfer_cost_total
        tolls_cost = 0
        parking_cost = 0

    flight_alternatives = (flights_out["options"] if flights_out and flights_out.get("available") else []) + \
        (flights_return["options"] if flights_return and flights_return.get("available") else [])
    attraction_items = [a for day in day_itineraries for a in day.get("activities", [])]

    budget_breakdown = build_trip_budget(
        total_budget=budget,
        number_of_days=days,
        number_of_travelers=travelers,
        accommodation_preference=accommodation,
        flights_cost=flights_cost_total,
        hotel_cost=hotel_cost_total,
        attractions_cost=attractions_cost_total,
        transport_cost=transport_cost_total,
        tolls_cost=tolls_cost,
        parking_cost=parking_cost,
        flight_alternatives=flight_alternatives,
        hotel_alternatives=hotels,
        attraction_items=attraction_items,
    )

    return {
        "destination": destination_str,
        "origin": request.origin,
        "number_of_days": days,
        "number_of_travelers": travelers,
        "total_budget": request.total_budget,
        "transport_preference": transport_pref,
        "accommodation_preference": accommodation,
        "flights": {
            "requires_origin": not bool(request.origin),
            "outbound": flights_out,
            "return": flights_return,
            "selected_outbound_id": selected_flight["id"] if selected_flight else None,
            "selected_return_id": selected_return_flight["id"] if selected_return_flight else None,
        },
        "hotels": hotels,
        "selected_hotel": selected_hotel,
        "airport_transfer": {
            "outbound": transfer_out,
            "return": transfer_return,
        },
        "vehicle_cost": vehicle_cost_result,
        "itinerary": day_itineraries,
        "budget": budget_breakdown,
    }
