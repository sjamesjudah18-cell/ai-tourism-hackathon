"use client";

/**
 * One flight option, styled after the reference flight-search card:
 * airline mark, departure → duration/stops → arrival, then amenities and
 * price on the closing line. Built from the existing design system (Panel
 * borders/radius, t-* type scale, the black-pill Button) rather than a new
 * visual language.
 */

import { Button, Meta } from "../ui/Primitives";
import type { FlightOption } from "../../types/planner";

const AIRLINE_COLORS: Record<string, string> = {
  IndiGo: "#00205b",
  "Air India": "#d9251c",
  "Akasa Air": "#ff6a13",
  Vistara: "#4d2d6b",
  SpiceJet: "#e2231a",
};

function AirlineMark({ airline }: { airline: string }) {
  const initials = airline
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const color = AIRLINE_COLORS[airline] ?? "#171717";
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export default function FlightCard({
  flight,
  selected,
  onSelect,
}: {
  flight: FlightOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        selected
          ? "border-[#171717] bg-[#171717] text-white"
          : "border-[rgba(0,0,0,0.08)] bg-white hover:border-[rgba(0,0,0,0.2)]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <AirlineMark airline={flight.airline} />
          <div>
            <p className={`text-[13px] font-semibold ${selected ? "text-white" : "text-[#171717]"}`}>
              {flight.airline}
            </p>
            <p className={`text-[11px] tabular-nums ${selected ? "text-white/60" : "text-[#8f8f88]"}`}>
              {flight.flight_number}
            </p>
          </div>
        </div>

        {flight.recommended && (
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] ${
              selected ? "text-emerald-300" : "text-emerald-700"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Recommended
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="text-left">
          <p className={`text-lg font-semibold tabular-nums ${selected ? "text-white" : "text-[#171717]"}`}>
            {flight.departure_time}
          </p>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${selected ? "text-white/55" : "text-[#8f8f88]"}`}>
            {flight.origin_airport}
          </p>
        </div>

        <div className="flex flex-1 flex-col items-center px-2">
          <p className={`text-[11px] tabular-nums ${selected ? "text-white/60" : "text-[#8f8f88]"}`}>
            {flight.duration_label}
          </p>
          <div className={`my-1 h-px w-full ${selected ? "bg-white/25" : "bg-[rgba(0,0,0,0.12)]"}`} />
          <p className={`text-[11px] ${selected ? "text-white/60" : "text-[#8f8f88]"}`}>
            {flight.stops_label}
          </p>
        </div>

        <div className="text-right">
          <p className={`text-lg font-semibold tabular-nums ${selected ? "text-white" : "text-[#171717]"}`}>
            {flight.arrival_time}
            {flight.arrival_next_day && <span className="ml-0.5 align-top text-[10px]">+1</span>}
          </p>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${selected ? "text-white/55" : "text-[#8f8f88]"}`}>
            {flight.destination_airport}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3.5" style={{ borderColor: selected ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)" }}>
        <div className="min-w-0">
          <Meta className={selected ? "text-white/60" : undefined}>
            {flight.amenities.slice(0, 2).join(" · ")}
          </Meta>
        </div>

        <div className="flex items-center gap-3">
          <p className={`text-base font-bold tabular-nums ${selected ? "text-white" : "text-[#171717]"}`}>
            ₹{flight.price_per_traveler.toLocaleString("en-IN")}
            <span className={`ml-1 text-[11px] font-normal ${selected ? "text-white/55" : "text-[#8f8f88]"}`}>
              /traveller
            </span>
          </p>
          <Button
            type="button"
            size="sm"
            variant={selected ? "secondary" : "primary"}
            className={selected ? "border-white/40 text-white hover:bg-white/10" : ""}
            onClick={onSelect}
          >
            {selected ? "Selected" : "Select"}
          </Button>
        </div>
      </div>
    </div>
  );
}
