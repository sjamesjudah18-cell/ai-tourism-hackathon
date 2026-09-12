"""
Tests for the trip planner services: flights, vehicle cost, airport transfer,
day scheduling, and the connected budget. Offline - no external API or the
database is touched, matching `test_reality_engine.py`'s convention.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import flight_service  # noqa: E402
from app.services.airport_transfer_service import plan_airport_transfer  # noqa: E402
from app.services.trip_budget_service import build_trip_budget  # noqa: E402
from app.services.trip_scheduler_service import (  # noqa: E402
    build_day_timeline,
    parse_duration_minutes,
)
from app.services.vehicle_cost_service import calculate_vehicle_cost  # noqa: E402


# --------------------------------------------------------------------------
# Flights
# --------------------------------------------------------------------------

def test_flight_options_are_deterministic_for_the_same_search():
    first = flight_service.generate_flight_options("Hyderabad", "Goa", "2026-11-01", travelers=2)
    second = flight_service.generate_flight_options("Hyderabad", "Goa", "2026-11-01", travelers=2)
    assert first["options"] == second["options"]


def test_flight_options_vary_by_route_and_date():
    a = flight_service.generate_flight_options("Hyderabad", "Goa", "2026-11-01")
    b = flight_service.generate_flight_options("Hyderabad", "Goa", "2026-12-15")
    assert [o["price_per_traveler"] for o in a["options"]] != [o["price_per_traveler"] for o in b["options"]]


def test_flight_options_are_clearly_labelled_mock_data():
    result = flight_service.generate_flight_options("Mumbai", "Delhi", "2026-11-01")
    assert result["is_mock"] is True
    assert result["data_label"] == "ESTIMATE"
    assert result["available"] is True
    assert len(result["options"]) >= 1
    assert sum(1 for o in result["options"] if o["recommended"]) == 1


def test_unknown_city_reports_unavailable_rather_than_guessing():
    result = flight_service.generate_flight_options("Nowhereville", "Goa", "2026-11-01")
    assert result["available"] is False
    assert result["options"] == []


def test_total_price_scales_with_travelers():
    solo = flight_service.generate_flight_options("Hyderabad", "Goa", "2026-11-01", travelers=1)
    group = flight_service.generate_flight_options("Hyderabad", "Goa", "2026-11-01", travelers=4)
    solo_opt = solo["options"][0]
    group_opt = next(o for o in group["options"] if o["id"] == solo_opt["id"])
    assert group_opt["total_price"] == group_opt["price_per_traveler"] * 4
    assert solo_opt["price_per_traveler"] == group_opt["price_per_traveler"]


# --------------------------------------------------------------------------
# Vehicle cost
# --------------------------------------------------------------------------

def test_car_fuel_cost_matches_the_documented_formula():
    result = calculate_vehicle_cost("car", distance_km=420, mileage_kmpl=18, fuel_price_per_liter=105, include_tolls=False, include_parking=False)
    assert result["fuel_required_liters"] == pytest.approx(23.33, abs=0.01)
    assert result["fuel_cost"] == pytest.approx(2450, abs=1)
    assert result["total_cost"] == result["fuel_cost"]


def test_bike_fuel_cost_matches_the_documented_formula():
    result = calculate_vehicle_cost("bike", distance_km=180, mileage_kmpl=40, fuel_price_per_liter=105, include_tolls=False, include_parking=False)
    assert result["fuel_required_liters"] == pytest.approx(4.5, abs=0.01)
    assert result["fuel_cost"] == pytest.approx(472.5, abs=1)


def test_short_trips_are_not_charged_a_toll():
    result = calculate_vehicle_cost("car", distance_km=20)
    assert result["toll_estimate"] == 0


def test_long_trips_are_charged_a_toll_estimate():
    result = calculate_vehicle_cost("car", distance_km=300)
    assert result["toll_estimate"] > 0
    assert result["label"] == "ESTIMATE"


def test_rental_adds_a_rental_line():
    result = calculate_vehicle_cost("car", distance_km=100, ownership="rental", rental_cost_per_day=1800, days=3)
    assert result["rental_cost"] == 1800 * 3
    assert result["total_cost"] >= result["rental_cost"]


def test_electric_vehicle_has_no_fuel_liters():
    result = calculate_vehicle_cost("car", distance_km=200, fuel_type="electric")
    assert result["fuel_required_liters"] is None
    assert result["fuel_cost"] > 0


# --------------------------------------------------------------------------
# Airport transfer
# --------------------------------------------------------------------------

def test_arrival_transfer_orders_events_after_each_other():
    result = plan_airport_transfer("Goa", flight_time="11:15", direction="arrival")
    assert result["available"] is True
    times = [step["time"] for step in result["sequence"]]
    assert times == sorted(times)
    assert result["estimated_hotel_arrival"] > result["flight_arrival_time"]


def test_departure_transfer_works_backwards_from_the_flight():
    result = plan_airport_transfer("Goa", flight_time="20:00", direction="departure")
    assert result["available"] is True
    assert result["recommended_checkout_by"] < result["depart_hotel_by"] < result["must_arrive_airport_by"] < "20:00"


def test_hotel_coordinates_change_the_distance_used():
    far_hotel = {"name": "Far Hotel", "latitude": 15.6, "longitude": 74.2}
    near_hotel = {"name": "Near Hotel", "latitude": 15.38, "longitude": 73.85}
    far = plan_airport_transfer("Goa", "11:00", hotel=far_hotel)
    near = plan_airport_transfer("Goa", "11:00", hotel=near_hotel)
    assert far["distance_km"] != near["distance_km"]


# --------------------------------------------------------------------------
# Day scheduling
# --------------------------------------------------------------------------

def _activity(name, category, minutes_transit=15, cost=100, duration="2 hrs"):
    return {
        "name": name, "category": category, "estimated_cost": cost, "duration": duration,
        "transit_from_previous": {"distance_km": 5, "estimated_minutes": minutes_transit},
    }


def test_parse_duration_minutes_handles_decimal_hours():
    assert parse_duration_minutes("2.5 hrs") == 150
    assert parse_duration_minutes("1 hrs") == 60
    assert parse_duration_minutes(None) == 90


def test_timeline_blocks_never_end_before_they_start():
    day = {"day": 1, "activities": [_activity("A", "Historical"), _activity("B", "Beach"), _activity("C", "Nature")]}
    blocks = build_day_timeline(day, is_first_day=True)
    for block in blocks:
        if block["type"] == "activity":
            assert block["end_time"] >= block["time"]


def test_last_day_stops_scheduling_activities_past_the_return_cutoff():
    day = {"day": 4, "activities": [_activity("Morning Fort", "Historical", minutes_transit=0)]}
    flight_return = {"departure_time": "09:00"}
    transfer_return = {
        "available": True,
        "depart_hotel_by": "07:00",
        "sequence": [
            {"label": "Hotel checkout", "time": "06:40", "duration_min": 20},
            {"label": "Travel to airport", "time": "07:00", "duration_min": 40},
            {"label": "Airport buffer", "time": "07:40", "duration_min": 80},
            {"label": "Flight departs", "time": "09:00"},
        ],
    }
    blocks = build_day_timeline(
        day, is_last_day=True, flight_return=flight_return, transfer_return=transfer_return
    )
    assert not any(b["type"] == "activity" for b in blocks)
    assert any(b["type"] == "note" for b in blocks)
    assert any(b["type"] == "checkout" for b in blocks)


# --------------------------------------------------------------------------
# Budget
# --------------------------------------------------------------------------

def test_over_budget_reports_the_correct_shortfall_and_suggestions():
    result = build_trip_budget(
        total_budget=40000, number_of_days=4, number_of_travelers=2,
        accommodation_preference="Comfort",
        flights_cost=17000, hotel_cost=12000, attractions_cost=2500,
        transport_cost=5500, tolls_cost=1000, parking_cost=500,
        flight_alternatives=[
            {"price_per_traveler": 8500, "total_price": 17000, "airline": "IndiGo", "stops_label": "Non-stop", "duration_label": "1h 15m"},
            {"price_per_traveler": 6500, "total_price": 13000, "airline": "Akasa Air", "stops_label": "Non-stop", "duration_label": "1h 20m"},
        ],
    )
    assert result["status"] == "OVER_BUDGET"
    assert result["over_budget_amount"] == result["total_estimated_cost"] - 40000
    assert result["suggestions"], "an over-budget plan must offer at least one saving"
    assert result["suggestions"][0]["category"] == "flights"
    assert result["suggestions"][0]["potential_saving"] == pytest.approx(4000, abs=1)


def test_within_budget_has_no_suggestions_and_zero_over_budget():
    result = build_trip_budget(
        total_budget=90000, number_of_days=4, number_of_travelers=2,
        accommodation_preference="Comfort",
        flights_cost=17000, hotel_cost=12000, attractions_cost=2500,
        transport_cost=5500, tolls_cost=1000, parking_cost=500,
    )
    assert result["status"] == "WITHIN_BUDGET"
    assert result["over_budget_amount"] == 0
    assert result["suggestions"] == []


def test_category_totals_sum_to_the_total_estimated_cost():
    result = build_trip_budget(
        total_budget=1, number_of_days=1, number_of_travelers=1,
        accommodation_preference="Budget",
        flights_cost=100, hotel_cost=200, attractions_cost=50,
        transport_cost=30, tolls_cost=10, parking_cost=5,
    )
    assert sum(result["categories"].values()) == result["total_estimated_cost"]
