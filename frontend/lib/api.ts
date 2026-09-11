const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type TripPayload = {
  user_id?: number;
  destination: string;
  start_date?: string;
  end_date?: string;
  number_of_days: number;
  total_budget: number;
  number_of_travelers?: number;
  interests?: string[];
  transport_preference?: string;
  accommodation_preference?: string;
};

export type ActivityItem = {
  place_id?: number;
  name: string;
  place_name?: string;
  category: string;
  rating: number;
  estimated_cost: number;
  duration: string;
  time: string;
  latitude?: number;
  longitude?: number;
  description: string;
  image: string;
  recommendation_score?: number;
  transit_from_previous?: {
    distance_km: number;
    estimated_minutes: number;
    note?: string;
  };
};

export type ItineraryDay = {
  day: number;
  title: string;
  total_transit_km?: number;
  estimated_transit_minutes?: number;
  activities: ActivityItem[];
};

export type HotelItem = {
  id: number;
  name: string;
  rating: number;
  price_per_night: number;
  total_stay_cost: number;
  tier: string;
  latitude?: number;
  longitude?: number;
  description: string;
  image: string;
  amenities: string[];
};

export type WeatherInfo = {
  destination: string;
  temperature: string;
  feels_like: string;
  condition: string;
  humidity: string;
  wind_speed: string;
  packing_advice: string;
  best_time_to_explore: string;
  is_live: boolean;
};

export type ItineraryResponse = {
  trip_id?: number;
  destination: string;
  number_of_days: number;
  total_budget: number;
  number_of_travelers: number;
  interests: string[];
  transport_preference: string;
  accommodation_preference: string;
  budget_breakdown: {
    total_budget: number;
    hotel: number;
    transport: number;
    food: number;
    activities: number;
    emergency_buffer: number;
    daily_food_budget: number;
    daily_activity_budget: number;
    remaining_budget: number;
  };
  weather: WeatherInfo;
  hotels: HotelItem[];
  ai_insights: {
    trip_tagline: string;
    ai_summary: string;
    insider_tips: string[];
    culinary_highlights: string[];
    local_etiquette: string;
    ai_powered: boolean;
  };
  total_activities_cost: number;
  itinerary: ItineraryDay[];
};

export async function createTrip(tripData: TripPayload) {
  const response = await fetch(`${API_URL}/api/trips/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: tripData.user_id || 1,
      ...tripData,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create trip in database");
  }

  return response.json();
}

export async function generateItinerary(
  params: TripPayload
): Promise<ItineraryResponse> {
  const response = await fetch(`${API_URL}/api/itinerary/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      destination: params.destination,
      number_of_days: params.number_of_days,
      total_budget: params.total_budget,
      number_of_travelers: params.number_of_travelers || 1,
      interests: params.interests || [],
      transport_preference: params.transport_preference || "Any",
      accommodation_preference: params.accommodation_preference || "Comfort",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate itinerary: ${response.statusText}`);
  }

  return response.json();
}

export async function askAssistant(
  message: string,
  tripContext?: Record<string, any>,
  history?: Array<{ role: string; content: string }>
): Promise<{ reply: string; suggested_actions: string[]; intent?: string }> {
  const response = await fetch(`${API_URL}/api/assistant/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      trip_context: tripContext,
      history,
    }),
  });

  if (!response.ok) {
    throw new Error("Assistant response failed");
  }

  return response.json();
}