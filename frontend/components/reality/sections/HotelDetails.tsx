"use client";

import { DataLabelChip } from "../RealityPrimitives";

/**
 * Accommodation detail.
 *
 * "Things to know" notes are computed from real coordinates against the
 * traveller's actual stops, and each is tagged DERIVED so it is clear we
 * worked it out rather than read it somewhere. We never invent qualitative
 * notes the data does not support.
 */
export default function HotelDetails({ details }: { details: any }) {
  const hotels: any[] = details?.hotels ?? [];
  if (hotels.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8f88]">
          {details.preference} options · {details.nights} night
          {details.nights === 1 ? "" : "s"}
        </h3>
        <DataLabelChip label="APPROXIMATE" />
      </div>

      <div className="grid gap-2.5 md:grid-cols-2">
        {hotels.map((hotel) => (
          <article
            key={hotel.id ?? hotel.name}
            className="rounded-xl border border-black/5 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-semibold text-[#171717]">
                  {hotel.name}
                </h4>
                <p className="mt-0.5 text-[11px] text-[#8f8f88]">
                  {hotel.rating != null && `${hotel.rating.toFixed(1)} rating · `}
                  {hotel.rating_source}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-[#171717]">
                  ₹{Math.round(hotel.price_per_night).toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] text-[#8f8f88]">per night</p>
              </div>
            </div>

            {hotel.distance_to_plan_km != null && (
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#55554f]">
                <span>
                  <span className="font-semibold">{hotel.distance_to_plan_km} km</span>{" "}
                  from your stops
                </span>
                {hotel.typical_minutes_to_plan != null && (
                  <span>~{hotel.typical_minutes_to_plan} min each way</span>
                )}
              </div>
            )}

            {hotel.things_to_know?.length > 0 && (
              <ul className="mt-2.5 space-y-1.5">
                {hotel.things_to_know.map((note: any, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 rounded border border-black/10 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#8f8f88]">
                      {note.source_type}
                    </span>
                    <span className="text-[11px] leading-relaxed text-[#6b6b66]">
                      {note.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {hotel.total_stay_cost > 0 && (
              <p className="mt-2.5 border-t border-black/5 pt-2 text-[11px] text-[#8f8f88]">
                Estimated stay total:{" "}
                <span className="font-semibold text-[#171717]">
                  ₹{Math.round(hotel.total_stay_cost).toLocaleString("en-IN")}
                </span>{" "}
                <DataLabelChip label="ESTIMATE" className="ml-1" />
              </p>
            )}
          </article>
        ))}
      </div>

      {details.provenance && (
        <dl className="rounded-xl border border-black/5 bg-[#faf9f7] px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f8f88]">
            Where this comes from
          </p>
          <div className="mt-1.5 space-y-1">
            {Object.entries(details.provenance).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-[11px]">
                <dt className="shrink-0 font-semibold text-[#6b6b66]">{key}</dt>
                <dd className="text-[#8f8f88]">{value as string}</dd>
              </div>
            ))}
          </div>
        </dl>
      )}
    </div>
  );
}
