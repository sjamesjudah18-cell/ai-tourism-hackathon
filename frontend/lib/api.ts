import type {
  AlertSummary,
  AlternativeOption,
  AlternativesResponse,
  ConciergeReply,
  NotificationsResponse,
  RealitySection,
  TravelAlert,
  TravelReality,
} from "../types/reality";

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
  history?: Array<{ role: string; content: string }>,
  itinerary?: ItineraryDay[],
  reality?: TravelReality | null
): Promise<ConciergeReply> {
  const response = await fetch(`${API_URL}/api/assistant/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      trip_context: tripContext,
      history,
      itinerary,
      reality,
    }),
  });

  if (!response.ok) {
    throw new Error("Assistant response failed");
  }

  return response.json();
}

/* =========================================================================
 * Travel Reality
 *
 * Every call below is fail-soft: it resolves to null rather than throwing, so
 * one unreachable service degrades a single panel instead of taking down the
 * page. Callers render "temporarily unavailable" for a null.
 * ====================================================================== */

async function safeJson<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T | null> {
  try {
    const response = await fetch(input, init);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export type RealityRequestParams = {
  destination: string;
  number_of_days?: number;
  total_budget?: number;
  number_of_travelers?: number;
  interests?: string[];
  accommodation_preference?: string;
  transport_preference?: string;
  start_date?: string;
  origin?: string;
  itinerary?: ItineraryDay[];
  trip_id?: number;
};

export async function fetchRealityCheck(
  params: RealityRequestParams
): Promise<TravelReality | null> {
  return safeJson<TravelReality>(`${API_URL}/api/reality/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

/* Per-section fetches, so panels can load independently of the full check. */

export async function fetchFoodReality(destination: string) {
  return safeJson<RealitySection>(
    `${API_URL}/api/reality/food?destination=${encodeURIComponent(destination)}`
  );
}

export async function fetchTransportReality(
  destination: string,
  origin?: string
) {
  const originParam = origin ? `&origin=${encodeURIComponent(origin)}` : "";
  return safeJson<RealitySection>(
    `${API_URL}/api/reality/transport?destination=${encodeURIComponent(
      destination
    )}${originParam}`
  );
}

export async function fetchCultureReality(destination: string) {
  return safeJson<RealitySection>(
    `${API_URL}/api/reality/culture?destination=${encodeURIComponent(destination)}`
  );
}

export async function fetchLocalUpdates(destination: string) {
  return safeJson<RealitySection>(
    `${API_URL}/api/reality/updates?destination=${encodeURIComponent(destination)}`
  );
}

/* ---------------------------- Alerts ---------------------------------- */

export async function evaluateAlerts(params: {
  destination: string;
  itinerary: ItineraryDay[];
  number_of_days?: number;
  number_of_travelers?: number;
  total_budget?: number;
  accommodation_preference?: string;
  start_date?: string;
  trip_id?: number;
}): Promise<{
  alerts: TravelAlert[];
  summary: AlertSummary;
  overall_status: string;
} | null> {
  return safeJson(`${API_URL}/api/alerts/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export async function fetchAlternatives(params: {
  destination: string;
  alert: TravelAlert;
  itinerary: ItineraryDay[];
  limit?: number;
}): Promise<AlternativesResponse | null> {
  return safeJson<AlternativesResponse>(`${API_URL}/api/alerts/alternatives`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

/**
 * Applies a replacement the traveller has explicitly confirmed.
 *
 * This is the only function in the frontend that changes an itinerary, and the
 * backend rejects it unless `confirmed` is exactly true. It deliberately
 * throws rather than failing soft: a change the traveller confirmed must
 * either happen or report that it did not.
 */
export async function confirmItineraryChange(params: {
  itinerary: ItineraryDay[];
  trip_day: number;
  replace_place: string;
  replacement: AlternativeOption;
  alert_id?: string;
  reason?: string;
  trip_id?: number;
}): Promise<{
  itinerary: ItineraryDay[];
  total_activities_cost: number;
  change: Record<string, any>;
  confirmed: boolean;
}> {
  const response = await fetch(`${API_URL}/api/alerts/confirm-change`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, confirmed: true }),
  });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((d) => d?.detail)
      .catch(() => null);
    throw new Error(detail || "Could not apply the change. Your plan is unchanged.");
  }

  return response.json();
}

/* ------------------------- Notifications ------------------------------ */

export async function fetchNotifications(
  tripId?: number
): Promise<NotificationsResponse | null> {
  const tripParam = tripId ? `?trip_id=${tripId}` : "";
  return safeJson<NotificationsResponse>(
    `${API_URL}/api/notifications/${tripParam}`
  );
}

export async function markNotificationRead(id: string) {
  return safeJson(`${API_URL}/api/notifications/${id}/read`, { method: "POST" });
}

export async function dismissNotification(id: string) {
  return safeJson(`${API_URL}/api/notifications/${id}/dismiss`, {
    method: "POST",
  });
}

export async function markAllNotificationsRead(tripId?: number) {
  const tripParam = tripId ? `?trip_id=${tripId}` : "";
  return safeJson(`${API_URL}/api/notifications/read-all${tripParam}`, {
    method: "POST",
  });
}