"use client";

/**
 * Flight options for one direction (outbound or return): the recommended
 * pick first, every other option beneath it, and a clear note that this is
 * demo data - there is no live fare provider connected yet.
 */

import { useState } from "react";
import { Meta, UnavailableNote } from "../ui/Primitives";
import FlightCard from "./FlightCard";
import type { FlightSearchResult } from "../../types/planner";

export default function FlightOptions({
  title,
  result,
  selectedId,
  onSelect,
}: {
  title: string;
  result: FlightSearchResult | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!result) return null;

  if (!result.available) {
    return (
      <div>
        <p className="t-label">{title}</p>
        <div className="mt-2">
          <UnavailableNote
            reason={result.reason || "Flight options aren't available for this route yet."}
          />
        </div>
      </div>
    );
  }

  const options = result.options;
  const visible = expanded ? options : options.slice(0, 3);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="t-label">{title}</p>
        <Meta>
          {result.origin_airport} → {result.destination_airport} · ~{result.distance_km} km
        </Meta>
      </div>

      <div className="mt-3 space-y-2.5">
        {visible.map((flight) => (
          <FlightCard
            key={flight.id}
            flight={flight}
            selected={selectedId === flight.id}
            onSelect={() => onSelect(flight.id)}
          />
        ))}
      </div>

      {options.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2.5 text-[13px] font-semibold text-[#8a5a3b] hover:underline"
        >
          {expanded ? "Show fewer options" : `Show ${options.length - 3} more option${options.length - 3 === 1 ? "" : "s"}`}
        </button>
      )}

      <p className="t-caption mt-3">{result.note}</p>
    </div>
  );
}
