"use client";

/**
 * One category of the briefing.
 *
 * Previously each category was a bordered, shadowed card, so eight of them read
 * as a wall of stat tiles. They are now sections in a long editorial document -
 * separated by a rule and generous space rather than boxed - with the status as
 * a dot-and-word mark instead of a badge.
 */

import type { RealitySection as Section } from "../../types/reality";
import {
  ConfidenceNote,
  SourceLine,
  StatusMark,
  UnavailableNote,
} from "../ui/Primitives";

import CostDetails from "./sections/CostDetails";
import CultureDetails from "./sections/CultureDetails";
import FoodDetails from "./sections/FoodDetails";
import HotelDetails from "./sections/HotelDetails";
import LocalUpdatesDetails from "./sections/LocalUpdatesDetails";
import TrafficDetails from "./sections/TrafficDetails";
import TransportDetails from "./sections/TransportDetails";
import WeatherDetails from "./sections/WeatherDetails";

const DETAIL_RENDERERS: Record<string, (section: Section) => React.ReactNode> = {
  weather: (s) => <WeatherDetails details={s.details} />,
  traffic: (s) => <TrafficDetails details={s.details} />,
  local_updates: (s) => <LocalUpdatesDetails details={s.details} />,
  cost_reality: (s) => <CostDetails details={s.details} />,
  transport: (s) => <TransportDetails details={s.details} />,
  hotel_reality: (s) => <HotelDetails details={s.details} />,
  food_reality: (s) => <FoodDetails details={s.details} />,
  local_culture: (s) => <CultureDetails details={s.details} />,
};

export default function RealitySectionBlock({
  section,
  index,
}: {
  section: Section;
  index: number;
}) {
  if (!section.available) {
    return (
      <section id={section.key} className="scroll-mt-24 py-8">
        <UnavailableNote
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
      className="scroll-mt-24 border-t border-[rgba(0,0,0,0.08)] py-9 first:border-t-0"
    >
      {/* Numbered like a briefing, not titled like a widget */}
      <div className="flex items-baseline gap-3">
        <span className="t-caption tabular-nums text-[#c9c9c2]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="t-title text-[#171717]">{section.title}</h2>
            <StatusMark status={section.status} />
            <ConfidenceNote confidence={section.confidence} />
          </div>

          {/* The lead paragraph does the work a stat tile used to */}
          <p className="t-body-lg mt-3 max-w-2xl text-[#2f2f2b]">
            {section.summary}
          </p>

          {section.advice.length > 0 && (
            <ul className="mt-4 max-w-2xl space-y-2">
              {section.advice.map((tip, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#d97745]"
                    aria-hidden="true"
                  />
                  <span className="t-body">{tip}</span>
                </li>
              ))}
            </ul>
          )}

          {renderDetails && <div className="mt-6">{renderDetails(section)}</div>}

          <SourceLine
            sources={section.sources}
            lastUpdated={section.last_updated}
            className="mt-5"
          />
        </div>
      </div>
    </section>
  );
}
