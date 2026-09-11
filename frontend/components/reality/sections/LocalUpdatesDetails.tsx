"use client";

import { DataLabelChip, SeverityChip, relativeTime } from "../RealityPrimitives";

/**
 * Local updates detail.
 *
 * Headline, publisher, timestamp and link are real and passed through
 * untouched. The category chip is our own classification of that headline and
 * is labelled as an estimate - which is why every item links out to the source
 * rather than asking the traveller to take our word for it.
 */
export default function LocalUpdatesDetails({ details }: { details: any }) {
  const items: any[] = details?.items ?? [];

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-black/10 bg-[#faf9f7] px-3.5 py-3 text-xs text-[#6b6b66]">
        We scanned {details?.total_scanned ?? 0} recent local reports and found
        none that affect your plan.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8f88]">
          Relevant to your trip
        </h3>
        <p className="text-[11px] text-[#b5b5ad]">
          {details.total_relevant} of {details.total_scanned} reports scanned
        </p>
      </div>

      <ul className="space-y-2.5">
        {items.map((item, index) => (
          <li
            key={`${item.url ?? item.title}-${index}`}
            className={`rounded-xl border p-3.5 ${
              item.affects_itinerary
                ? "border-amber-200 bg-amber-50/50"
                : "border-black/5 bg-white"
            }`}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <SeverityChip severity={item.severity} />
              <span className="rounded border border-black/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#6b6b66]">
                {item.category_label}
              </span>
              <DataLabelChip label="ESTIMATE" />
              {item.affects_itinerary && (
                <span className="text-[10px] font-semibold text-amber-800">
                  Names a stop on your plan
                </span>
              )}
            </div>

            <p className="mt-1.5 text-sm font-medium leading-snug text-[#171717]">
              {item.title}
            </p>

            {item.affected_stops?.length > 0 && (
              <p className="mt-1 text-[11px] text-amber-900">
                Affects:{" "}
                {item.affected_stops
                  .map((s: any) => `${s.place} (Day ${s.day})`)
                  .join(", ")}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8f8f88]">
              <span>{item.publisher}</span>
              {relativeTime(item.published_at) && (
                <span>{relativeTime(item.published_at)}</span>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#8a5a3b] underline decoration-dotted underline-offset-2"
                >
                  Read the report
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="text-[11px] leading-relaxed text-[#8f8f88]">
        Categories are assigned automatically from the headline. Open the source
        article to confirm details before changing plans.
      </p>
    </div>
  );
}
