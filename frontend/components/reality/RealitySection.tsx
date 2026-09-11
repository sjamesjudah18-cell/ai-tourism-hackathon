"use client";

/**
 * Renders one Reality Check category.
 *
 * Every section shows the same four things - status, plain-language summary,
 * practical advice, and provenance - and then a per-category detail body for
 * the things that only make sense for that category (a forecast table, a cost
 * breakdown, dish cards).
 */

import type { RealitySection as Section } from "../../types/reality";
import {
  ConfidenceChip,
  DataLabelChip,
  SourceStamp,
  StatusBadge,
  UnavailableNotice,
} from "./RealityPrimitives";

import CostDetails from "./sections/CostDetails";
import CultureDetails from "./sections/CultureDetails";
import FoodDetails from "./sections/FoodDetails";
import HotelDetails from "./sections/HotelDetails";
import LocalUpdatesDetails from "./sections/LocalUpdatesDetails";
import TrafficDetails from "./sections/TrafficDetails";
import TransportDetails from "./sections/TransportDetails";
import WeatherDetails from "./sections/WeatherDetails";

const DETAIL_RENDERERS: Record<
  string,
  (section: Section) => React.ReactNode
> = {
  weather: (s) => <WeatherDetails details={s.details} />,
  traffic: (s) => <TrafficDetails details={s.details} />,
  local_updates: (s) => <LocalUpdatesDetails details={s.details} />,
  cost_reality: (s) => <CostDetails details={s.details} />,
  transport: (s) => <TransportDetails details={s.details} />,
  hotel_reality: (s) => <HotelDetails details={s.details} />,
  food_reality: (s) => <FoodDetails details={s.details} />,
  local_culture: (s) => <CultureDetails details={s.details} />,
};

export default function RealitySectionCard({ section }: { section: Section }) {
  if (!section.available) {
    return (
      <section id={section.key} className="scroll-mt-24">
        <UnavailableNotice
          title={section.title}
          reason={
            section.unavailable_reason ??
            "Live data for this section is temporarily unavailable."
          }
        />
      </section>
    );
  }

  const renderDetails = DETAIL_RENDERERS[section.key];

  return (
    <section
      id={section.key}
      className="scroll-mt-24 rounded-2xl border border-black/5 bg-white"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-black/5 px-5 py-4 md:px-6 md:py-5">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-[#171717] md:text-xl">
            {section.title}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#55554f]">
            {section.summary}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={section.status} />
          <ConfidenceChip confidence={section.confidence} />
        </div>
      </header>

      <div className="px-5 py-4 md:px-6 md:py-5">
        {section.advice.length > 0 && (
          <ul className="space-y-2">
            {section.advice.map((tip, index) => (
              <li key={index} className="flex gap-2.5 text-sm text-[#55554f]">
                <span
                  className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#d97745]"
                  aria-hidden="true"
                />
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        )}

        {renderDetails && (
          <div className="mt-5 border-t border-black/5 pt-5">
            {renderDetails(section)}
          </div>
        )}

        <SourceStamp
          sources={section.sources}
          lastUpdated={section.last_updated}
          className="mt-5 border-t border-black/5 pt-3.5"
        />
      </div>
    </section>
  );
}

/** Small helper reused by several detail bodies for a labelled figure. */
export function Figure({
  label,
  value,
  dataLabel,
  note,
}: {
  label: string;
  value: React.ReactNode;
  dataLabel?: Parameters<typeof DataLabelChip>[0]["label"];
  note?: string | null;
}) {
  return (
    <div className="rounded-xl border border-black/5 bg-[#faf9f7] px-3.5 py-3">
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f8f88]">
          {label}
        </p>
        {dataLabel && <DataLabelChip label={dataLabel} />}
      </div>
      <p className="mt-1 text-base font-semibold text-[#171717]">{value}</p>
      {note && <p className="mt-0.5 text-[11px] text-[#8f8f88]">{note}</p>}
    </div>
  );
}
