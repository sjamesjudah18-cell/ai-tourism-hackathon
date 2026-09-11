import { ActivityItem } from "../lib/api";

type ItineraryCardProps = {
  activity: ActivityItem;
  dayNumber: number;
  isFirst?: boolean;
};

export default function ItineraryCard({
  activity,
  dayNumber,
  isFirst = false,
}: ItineraryCardProps) {
  const name = activity.name || activity.place_name || "Activity";
  const transit = activity.transit_from_previous;

  return (
    <div className="relative">
      {/* Transit line connecting previous activity */}
      {!isFirst && transit && transit.distance_km > 0 && (
        <div className="my-2 ml-10 flex items-center gap-2 text-xs text-[#8a8a83] md:ml-12">
          <div className="h-6 w-px bg-dashed border-l border-[#ccc]" />
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#eee] px-2.5 py-0.5 text-[11px] font-medium text-[#555]">
            <span>🚗</span>
            <span>{transit.distance_km} km ({transit.estimated_minutes} mins)</span>
          </div>
        </div>
      )}

      <div className="group grid grid-cols-[80px_minmax(0,1fr)] gap-4 border-b border-black/10 py-6 md:grid-cols-[100px_minmax(0,1fr)] md:gap-6">
        
        {/* Time column */}
        <div className="pt-1">
          <p className="text-sm font-bold text-[#171717]">
            {activity.time}
          </p>
          <p className="mt-0.5 text-xs text-[#999990]">
            {activity.duration}
          </p>
        </div>

        {/* Content column */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Thumbnail */}
          <div className="h-[120px] w-full shrink-0 overflow-hidden rounded-2xl sm:h-[130px] sm:w-[170px] bg-gray-100">
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
            </div>

            <h4 className="mt-1.5 text-lg font-bold text-[#171717] tracking-tight group-hover:text-[#d97745] transition">
              {name}
            </h4>

            {activity.description && (
              <p className="mt-1.5 text-xs leading-relaxed text-[#6b6b66] line-clamp-2 md:line-clamp-3">
                {activity.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-[#444]">
              <span>
                Cost: {activity.estimated_cost > 0 ? `₹${activity.estimated_cost.toLocaleString("en-IN")}` : "Free"}
              </span>
              {activity.recommendation_score && (
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                  {Math.round(activity.recommendation_score)}% match
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
