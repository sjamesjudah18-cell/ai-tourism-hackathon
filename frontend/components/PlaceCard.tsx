import { ActivityItem } from "../lib/api";

type PlaceCardProps = {
  place: ActivityItem;
  onClick?: () => void;
};

export default function PlaceCard({ place, onClick }: PlaceCardProps) {
  const name = place.name || place.place_name || "Attraction";

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-[22px] border border-black/5 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={place.image}
          alt={name}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80";
          }}
        />
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
          <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-gray-800 backdrop-blur">
            {place.category}
          </span>
          {place.rating > 0 && (
            <span className="rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
              ★ {place.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <h4 className="text-sm font-bold text-[#171717] line-clamp-1 group-hover:text-[#d97745] transition">
          {name}
        </h4>
        {place.description && (
          <p className="mt-1 text-xs text-[#777770] line-clamp-2 leading-relaxed">
            {place.description}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-[#55554f]">
          <span>₹{place.estimated_cost > 0 ? place.estimated_cost.toLocaleString("en-IN") : "Free entry"}</span>
          <span className="text-[11px] text-[#999990]">{place.duration}</span>
        </div>
      </div>
    </div>
  );
}
