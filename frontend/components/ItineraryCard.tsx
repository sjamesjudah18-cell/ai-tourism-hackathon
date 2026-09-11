import { ActivityItem } from "../lib/api";
import type { RealityStatus, TravelAlert } from "../types/reality";
import {
  CategoryLabel,
  Meta,
  MetaDot,
  ProvenanceBadge,
  statusStyle,
} from "./ui/Primitives";

/**
 * One stop on a day.
 *
 * Leads with the photograph, then compact plain-text metadata. The previous
 * version carried a nested alert notice styled differently from the day-level
 * alert card, so the same issue appeared twice on one screen in two visual
 * languages. Now a stop only *marks* that it needs attention and points at the
 * single alert component above; it never restates the alert itself.
 *
 * Distances, durations, costs and match scores are plain metadata rather than
 * the row of coloured chips they used to be.
 */

type ItineraryCardProps = {
  activity: ActivityItem;
  dayNumber: number;
  isFirst?: boolean;
  realisticTransitMinutes?: number | null;
  weatherSuitability?: RealityStatus | null;
  weatherNote?: string | null;
  alerts?: TravelAlert[];
  isSelected?: boolean;
  onSelect?: () => void;
  onHover?: (hovering: boolean) => void;
};

export default function ItineraryCard({
  activity,
  dayNumber,
  isFirst = false,
  realisticTransitMinutes = null,
  weatherSuitability = null,
  weatherNote = null,
  alerts = [],
  isSelected = false,
  onSelect,
  onHover,
}: ItineraryCardProps) {
  const name = activity.name || activity.place_name || "Activity";
  const transit = activity.transit_from_previous;
  const isPlaceholder = Boolean((activity as any).is_placeholder);
  const needsAttention = alerts.length > 0;

  const addedMinutes =
    realisticTransitMinutes != null && transit?.estimated_minutes
      ? realisticTransitMinutes - transit.estimated_minutes
      : 0;

  return (
    <div>
      {/* Transit from the previous stop — plain text on a connector */}
      {!isFirst && transit && transit.distance_km > 0 && (
        <div className="flex items-center gap-2.5 py-2.5 pl-1">
          <span className="h-7 w-px bg-[rgba(0,0,0,0.12)]" aria-hidden="true" />
          <Meta>
            {transit.distance_km} km · {transit.estimated_minutes} min
            {addedMinutes > 0 && (
              <span className="text-amber-700">
                {" "}
                · ~{realisticTransitMinutes} min in traffic
              </span>
            )}
          </Meta>
        </div>
      )}

      <article
        onClick={onSelect}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
        className={`
          group flex cursor-pointer gap-4 rounded-2xl p-3 transition
          ${isSelected ? "bg-[#f5f3ee]" : "hover:bg-[#faf9f7]"}
        `}
      >
        {/* Photo leads */}
        <div className="relative h-[92px] w-[104px] shrink-0 overflow-hidden rounded-xl bg-[#eeece7] sm:h-[104px] sm:w-[132px]">
          <img
            src={activity.image}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80";
            }}
          />
          {needsAttention && (
            <span
              className="absolute left-2 top-2 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white"
              title="This stop has a travel update"
              aria-label="Needs attention"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CategoryLabel>{activity.category}</CategoryLabel>
            {activity.time && (
              <>
                <span className="text-[#d8d8d2]" aria-hidden="true">·</span>
                <CategoryLabel>{activity.time}</CategoryLabel>
              </>
            )}
          </div>

          <h4 className="t-title mt-1 truncate text-[#171717]">{name}</h4>

          {activity.description && (
            <p className="t-body mt-1 line-clamp-2 text-[13px]">
              {activity.description}
            </p>
          )}

          {/* All plain metadata — no chips */}
          <div className="mt-2 flex flex-wrap items-center">
            <Meta>
              {activity.estimated_cost > 0
                ? `₹${activity.estimated_cost.toLocaleString("en-IN")}`
                : "Free"}
            </Meta>
            {activity.duration && (
              <>
                <MetaDot />
                <Meta>{activity.duration}</Meta>
              </>
            )}
            {activity.rating > 0 && (
              <>
                <MetaDot />
                <Meta>{activity.rating.toFixed(1)}</Meta>
              </>
            )}
            {weatherSuitability && (
              <>
                <MetaDot />
                <span
                  className={`text-xs font-medium ${statusStyle(weatherSuitability).text}`}
                  title={weatherNote ?? undefined}
                >
                  {weatherSuitability === "GOOD"
                    ? "Good for outdoors"
                    : weatherSuitability === "FAIR"
                    ? "Fair outdoors"
                    : weatherSuitability === "CAUTION"
                    ? "Check conditions"
                    : "Poor for outdoors"}
                </span>
              </>
            )}
          </div>

          {/* Honest labelling for unverified filler stops */}
          {isPlaceholder && (
            <p className="mt-1.5 flex items-center gap-1.5">
              <ProvenanceBadge label="ESTIMATE" />
              <span className="t-caption">Suggested area, not a verified venue</span>
            </p>
          )}

          {(activity as any).user_selected && (
            <p className="t-caption mt-1.5 text-emerald-700">Your choice</p>
          )}
        </div>
      </article>
    </div>
  );
}
