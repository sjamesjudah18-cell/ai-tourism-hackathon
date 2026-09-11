import { HotelItem } from "../lib/api";

type HotelCardProps = {
  hotel: HotelItem;
  onSelect?: (hotel: HotelItem) => void;
};

export default function HotelCard({ hotel, onSelect }: HotelCardProps) {
  return (
    <div className="group overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      {/* Image container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        <img
          src={hotel.image}
          alt={hotel.name}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80";
          }}
        />
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-gray-900 shadow-sm backdrop-blur">
          <span className="text-amber-500">★</span> {hotel.rating.toFixed(1)}
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {hotel.tier}
        </span>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-base font-bold text-[#171717] line-clamp-1 group-hover:text-[#d97745] transition">
          {hotel.name}
        </h3>

        {hotel.description && (
          <p className="mt-1.5 text-xs text-[#777770] line-clamp-2 leading-relaxed">
            {hotel.description}
          </p>
        )}

        {/* Amenities */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(hotel.amenities || []).slice(0, 3).map((amenity) => (
            <span
              key={amenity}
              className="rounded-md bg-[#f4f4f0] px-2 py-0.5 text-[10px] font-medium text-[#666660]"
            >
              {amenity}
            </span>
          ))}
        </div>

        {/* Pricing */}
        <div className="mt-5 flex items-end justify-between border-t border-black/5 pt-3.5">
          <div>
            <p className="text-[11px] text-[#999990]">Per night</p>
            <p className="text-lg font-bold text-[#171717]">
              ₹{hotel.price_per_night.toLocaleString("en-IN")}
            </p>
          </div>

          {hotel.total_stay_cost > 0 && (
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-[#999990]">Est. Total</span>
              <p className="text-xs font-semibold text-[#55554f]">
                ₹{hotel.total_stay_cost.toLocaleString("en-IN")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
