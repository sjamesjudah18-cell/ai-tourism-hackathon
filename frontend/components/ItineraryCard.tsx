import { ActivityItem } from "../lib/api";
import type { RealityStatus, TravelAlert } from "../types/reality";
import { SeverityChip, StatusBadge } from "./reality/RealityPrimitives";

type ItineraryCardProps = {
  activity: ActivityItem;
  dayNumber: number;
  isFirst?: boolean;

  /** Realistic travel time for the leg into this stop, when traffic was modelled. */
  realisticTransitMinutes?: number | null;

  /** Forecast suitability for this day, when weather data resolved. */
  weatherSuitability?: RealityStatus | null;
  weatherNote?: string | null;

  /** Alerts naming this stop. Surfaced as a badge; the flow lives on the alert card. */
  alerts?: TravelAlert[];
};

export default function ItineraryCard({
  activity,
  dayNumber,
  isFirst = false,
  realisticTransitMinutes = null,
  weatherSuitability = null,
  weatherNote = null,
  alerts = [],
}: ItineraryCardProps) {
  const name = activity.name || activity.place_name || "Activity";
  const transit = activity.transit_from_previous;

  // Only worth showing the realistic figure when it differs from the plan.
  const addedMinutes =
    realisticTransitMinutes != null && transit?.estimated_minutes
      ? realisticTransitMinutes - transit.estimated_minutes
      : 0;

  const topAlert = alerts[0];

  return (
    <div className="relative">
      {/* Transit from the previous stop */}
      {!isFirst && transit && transit.distance_km > 0 && (
        <div className="my-2 ml-10 flex flex-wrap items-center gap-2 text-xs text-[#8a8a83] md:ml-12">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f0ec] px-2.5 py-0.5 text-[11px] font-medium text-[#55554f]">
            <span>
              {transit.distance_km} km · {transit.estimated_minutes} min planned
            </span>
          </div>
          {addedMinutes > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-900"
              title="Modelled from typical peak hours, not live traffic"
            >
              ~{realisticTransitMinutes} min realistic (+{addedMinutes})
            </span>
          )}
        </div>
      )}

      <div className="group grid grid-cols-[80px_minmax(0,1fr)] gap-4 border-b border-black/10 py-6 md:grid-cols-[100px_minmax(0,1fr)] md:gap-6">
        {/* Time column */}
        <div className="pt-1">
          <p className="text-sm font-semibold text-[#171717]">{activity.time}</p>
          <p className="mt-0.5 text-xs text-[#999990]">{activity.duration}</p>
        </div>

        {/* Content column */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Thumbnail */}
          <div className="h-[120px] w-full shrink-0 overflow-hidden rounded-2xl bg-gray-100 sm:h-[130px] sm:w-[170px]">
            <img
              src={activity.image}
              alt={name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80";
              }}
            />
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#f3efe9] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#d97745]">
                {activity.category}
              </span>
              {activity.rating > 0 && (
                <span className="text-xs font-semibold text-gray-700">
                  ★ {activity.rating.toFixed(1)}
                </span>
              )}
              {(activity as any).user_selected && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  Your choice
                </span>
              )}
            </div>

            <h4 className="mt-1.5 text-lg font-bold tracking-tight text-[#171717] transition group-hover:text-[#d97745]">
              {name}
            </h4>

            {activity.description && (
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#6b6b66] md:line-clamp-3">
                {activity.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-[#444]">
              <span>
                Cost:{" "}
                {activity.estimated_cost > 0
                  ? `₹${activity.estimated_cost.toLocaleString("en-IN")}`
                  : "Free"}
              </span>
              {activity.recommendation_score && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  {Math.round(activity.recommendation_score)}% match
                </span>
              )}

              {/* Weather suitability for this day */}
              {weatherSuitability && (
                <span
                  className="inline-flex items-center gap-1.5"
                  title={weatherNote ?? undefined}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[#8f8f88]">
                    Outdoors
                  </span>
                  <StatusBadge status={weatherSuitability} />
                </span>
              )}
            </div>

            {/* Known travel issues, from the alert engine - never invented here */}
            {topAlert && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <SeverityChip severity={topAlert.severity} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                    Travel update
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-900">
                  {topAlert.impact ?? topAlert.title}
                </p>
                <a
                  href="#day-updates"
                  className="mt-1 inline-block text-[10px] font-semibold text-amber-900 underline underline-offset-2"
                >
                  Review your options
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
