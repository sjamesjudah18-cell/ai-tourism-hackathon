/**
 * Shared Travel Reality types.
 *
 * These mirror the shapes produced by the backend's `core/reality.py`. Keeping
 * them in one place means the provenance labelling - which is the point of the
 * whole product - is typed rather than stringly-guessed at each call site.
 */

export type DataLabel =
  | "LIVE"
  | "PROVIDER"
  | "ESTIMATE"
  | "APPROXIMATE"
  | "STATIC"
  | "FALLBACK"
  | "UNAVAILABLE";

export type Confidence = "High" | "Medium" | "Low";

export type RealityStatus = "GOOD" | "FAIR" | "CAUTION" | "POOR" | "UNKNOWN";

export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AlertType =
  | "WEATHER"
  | "TRAFFIC"
  | "CLOSURE"
  | "LOCAL_NEWS"
  | "COST"
  | "TRANSPORT"
  | "AIR_QUALITY";

export type SourceRef = {
  name: string;
  url?: string | null;
  fetched_at?: string | null;
};

export type DataPoint<T = unknown> = {
  value: T | null;
  label: DataLabel;
  unit?: string | null;
  source?: SourceRef | null;
  note?: string | null;
};

export type RealitySection = {
  key: string;
  title: string;
  status: RealityStatus;
  summary: string;
  advice: string[];
  details: Record<string, any>;
  confidence: Confidence;
  sources: SourceRef[];
  last_updated: string | null;
  available: boolean;
  unavailable_reason: string | null;
};

/**
 * The alert shape every source produces - weather, traffic, closures, news.
 * The notification centre reads these same objects.
 */
export type TravelAlert = {
  id: string;
  type: AlertType;
  severity: Severity;
  title: string;
  message: string;
  source?: string | null;
  source_url?: string | null;
  detected_at: string;
  expires_at?: string | null;
  affected_trip_day?: number | null;
  affected_place?: string | null;
  impact?: string | null;
  confidence: Confidence;
  estimated_delay_minutes?: number | null;
  suggested_actions: string[];
  also_affected?: string[];
};

export type AlertSummary = {
  total: number;
  by_severity: Partial<Record<Severity, number>>;
  highest_severity: Severity | null;
  affected_days: number[];
};

export type TravelReality = {
  destination: string;
  location: {
    latitude: number;
    longitude: number;
    state?: string | null;
    country?: string | null;
    resolved_by?: string;
    is_coastal: boolean;
  } | null;
  number_of_days: number;
  number_of_travelers: number;
  start_date: string | null;
  overall_status: RealityStatus;
  confidence: Confidence;
  readiness_summary: string;
  sections: RealitySection[];
  section_keys: string[];
  alerts: TravelAlert[];
  alert_summary: AlertSummary;
  warnings: string[];
  sources: SourceRef[];
  last_updated: string;
};

/** An alternative proposed for an affected stop. Proposed only - never applied. */
export type AlternativeOption = {
  place_id?: number | null;
  name: string;
  category?: string | null;
  rating?: number | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  estimated_cost?: number | null;
  distance_from_day_km?: number | null;
  why: string[];
  indoor: boolean;
};

export type AlternativesResponse = {
  alert_id: string;
  affected_trip_day: number | null;
  affected_place: string | null;
  options: AlternativeOption[];
  count: number;
  note: string;
};

export type NotificationAction = {
  label: string;
  target: "itinerary" | "reality" | "source";
  trip_day?: number;
  section?: string;
  url?: string | null;
};

export type TravelNotification = TravelAlert & {
  row_id: number;
  is_read: boolean;
  is_dismissed: boolean;
  action: NotificationAction | null;
};

export type NotificationsResponse = {
  notifications: TravelNotification[];
  unread_count: number;
  total: number;
};

export type ConciergeReply = {
  reply: string;
  labels_used: string[];
  suggested_actions: string[];
  intent?: string;
  references_alert_id?: string | null;
  grounded?: boolean;
  ai_powered?: boolean;
};
