"use client";

import { DataLabelChip } from "../RealityPrimitives";

/**
 * "Things to know" detail - local conventions worth knowing before arriving.
 *
 * Presented as orientation rather than rules, which is also how the underlying
 * data is written: it describes conventions and institutional requirements,
 * not generalisations about people.
 */
export default function CultureDetails({ details }: { details: any }) {
  const topics: any[] = details?.topics ?? [];
  const customs: string[] = details?.customs ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#8f8f88]">
          {details.languages?.length > 0 && (
            <span>
              <span className="font-semibold text-[#6b6b66]">Languages:</span>{" "}
              {details.languages.join(", ")}
            </span>
          )}
          {details.greeting && <span>{details.greeting}</span>}
        </div>
        <DataLabelChip label="STATIC" />
      </div>

      {customs.length > 0 && (
        <div className="rounded-xl border border-black/5 bg-[#faf9f7] px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f8f88]">
            Local context
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {customs.map((custom, i) => (
              <li key={i} className="text-xs leading-relaxed text-[#55554f]">
                {custom}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        {topics.map((topic) => (
          <div key={topic.key}>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a5a3b]">
              {topic.title}
            </h4>
            <ul className="mt-1.5 space-y-1.5">
              {topic.points.map((point: string, i: number) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed text-[#55554f]">
                  <span
                    className="mt-[7px] h-0.5 w-0.5 shrink-0 rounded-full bg-[#b5b5ad]"
                    aria-hidden="true"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {details.note && (
        <p className="border-t border-black/5 pt-3 text-[11px] leading-relaxed text-[#8f8f88]">
          {details.note}
        </p>
      )}
    </div>
  );
}
