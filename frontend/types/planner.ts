/**
 * Types for the end-to-end trip planner (flights, airport transfers, car/bike
 * cost, the realistic clock-time itinerary, and the connected budget).
 *
 * These mirror the shapes returned by `POST /api/planner/plan` on the
 * backend - see `app/routes/planner.py`.
 */

import type { HotelItem, ItineraryDay } from "../lib/api";

export type FlightOption = {
  id: string;
  airline: string;
  airline_code: string;
  flight_number: string;
  origin_airport: string;
  origin_city: string;
  destination_airport: string;
  destination_city: string;
  date: string;
  departure_time: string;
  arrival_time: string;
  arrival_next_day: boolean;
  duration_minutes: number;
  duration_label: string;
  stops: number;
  stops_label: string;
  amenities: string[];
  price_per_traveler: number;
  total_price: number;
  currency: string;
  recommended: boolean;
  recommended_reason: string | null;
};

export type FlightSearchResult = {
  available: boolean;
  reason?: string;
  origin_airport?: string;
  destination_airport?: string;
  distance_km?: number;
  options: FlightOption[];
  recommended_id: string | null;
  is_mock?: boolean;
  data_label?: string;
  note?: string;
};

export type TransferStep = { label: string; time: string; duration_min?: number };

export type AirportTransferPlan = {
  available: boolean;
  reason?: string;
  destination?: string;
  airport_code?: string;
  airport_name?: string;
  direction?: "arrival" | "departure";
  transport_mode?: string;
  distance_km?: number;
  distance_label?: string;
  distance_basis?: string;
  estimated_minutes?: number;
  estimated_cost?: number;
  currency?: string;
  label?: string;
  note?: string;
  flight_arrival_time?: string;
  baggage_ready_time?: string;
  recommended_pickup_time?: string;
  estimated_hotel_arrival?: string;
  free_from?: string;
  flight_departure_time?: string;
  must_arrive_airport_by?: string;
  depart_hotel_by?: string;
  recommended_checkout_by?: string;
  sequence?: TransferStep[];
};

export type VehicleCostLine = {
  key: string;
  title: string;
  amount: number;
  formula: string;
  label: string;
  note?: string;
};

export type VehicleCostResult = {
  vehicle_type: string;
  fuel_type: string;
  ownership: string;
  distance_km: number;
  mileage_kmpl: number | null;
  fuel_price_per_liter: number | null;
  fuel_required_liters: number | null;
  days: number;
  lines: VehicleCostLine[];
  fuel_cost: number;
  toll_estimate: number;
  parking_estimate: number;
  rental_cost: number;
  total_cost: number;
  currency: string;
  label: string;
  note: string;
  intercity_km?: number;
  local_km?: number;
};

export type BudgetSuggestion = {
  category: string;
  icon: string;
  action: string;
  potential_saving: number;
};

export type TripBudget = {
  currency: string;
  total_budget: number;
  categories: {
    flights: number;
    hotel: number;
    transport: number;
    food: number;
    attractions: number;
    tolls: number;
    parking: number;
    other: number;
  };
  total_estimated_cost: number;
  remaining_budget: number;
  over_budget_amount: number;
  progress_percent: number;
  status: "WITHIN_BUDGET" | "OVER_BUDGET" | "UNKNOWN";
  suggestions: BudgetSuggestion[];
  potential_total_saving: number;
  remaining_after_suggestions: number | null;
};

export type TimelineBlock = {
  time: string | null;
  end_time?: string;
  type: string;
  title: string;
  subtitle?: string | null;
  cost?: number | null;
  duration_min?: number;
  note?: string | null;
};

export type PlannerItineraryDay = ItineraryDay & { timeline: TimelineBlock[] };

export type VehicleConfig = {
  vehicle_type: "car" | "bike";
  ownership: "personal" | "rental";
  fuel_type: string;
  mileage_kmpl?: number;
  fuel_price_per_liter?: number;
  rental_cost_per_day?: number;
};

export type TripPlanRequest = {
  destination: string;
  origin?: string;
  number_of_days: number;
  total_budget: number;
  number_of_travelers: number;
  interests?: string[];
  transport_preference?: string;
  accommodation_preference?: string;
  start_date?: string;
  selected_flight_id?: string | null;
  selected_return_flight_id?: string | null;
  selected_hotel_id?: number | null;
  vehicle?: VehicleConfig | null;
};

export type TripPlanResponse = {
  destination: string;
  origin: string | null;
  number_of_days: number;
  number_of_travelers: number;
  total_budget: number;
  transport_preference: string;
  accommodation_preference: string;
  flights: {
    requires_origin: boolean;
    outbound: FlightSearchResult | null;
    return: FlightSearchResult | null;
    selected_outbound_id: string | null;
    selected_return_id: string | null;
  };
  hotels: HotelItem[];
  selected_hotel: HotelItem | null;
  airport_transfer: {
    outbound: AirportTransferPlan | null;
    return: AirportTransferPlan | null;
  };
  vehicle_cost: VehicleCostResult | null;
  itinerary: PlannerItineraryDay[];
  budget: TripBudget;
};
