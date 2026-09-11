"use client";

/**
 * Day switching, as a spatial control.
 *
 * Previously these were plain pill buttons carrying a small red dot whose
 * meaning was never explained - it could equally have read as "alert",
 * "unconfirmed" or "today". Now each day shows its own shape: stop count,
 * distance, and an explicit "needs attention" marker that is labelled in a
 * legend directly beneath the rail.
 *
 * Selecting a day writes to the shared map store, so the rail and the map move
 * as one action rather than two synchronised updates.
 */

import type { ItineraryDay } from "../../lib/api";
import { Meta } from "../ui/Primitives";

type DayRailProps = {
  days: ItineraryDay[];
  activeDay: number;
  alertDays: number[];
  realisticMinutesByDay?: Record<number, number>;
  onSelectDay: (day: number) => void;
};

export default function DayRail({
  days,
  activeDay,
  alertDays,
  realisticMinutesByDay = {},
  onSelectDay,
}: DayRailProps) {
  const hasAnyAlert = alertDays.length > 0;

  return (
    <div>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {days.map((day) => {
          const active = day.day === activeDay;
          const needsAttention = alertDays.includes(day.day);
          const realistic = realisticMinutesByDay[day.day];

          return (
            <button
              key={day.day}
              onClick={() => onSelectDay(day.day)}
              aria-current={active ? "true" : undefined}
              className={`
                group relative min-w-[124px] shrink-0 rounded-xl border px-3.5 py-3 text-left
                transition
                ${
                  active
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-[rgba(0,0,0,0.09)] bg-white hover:border-[rgba(0,0,0,0.2)]"
                }
              `}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
                    active ? "text-white/60" : "text-[#8f8f88]"
                  }`}
                >
                  Day {day.day}
                </span>

                {/* Explicit, legended attention marker */}
                {needsAttention && (
                  <span
                    className="flex items-center gap-1"
                    title="This day has a travel update that needs your decision"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  </span>
                )}
              </div>

              <p
                className={`mt-1 truncate text-[13px] font-semibold ${
                  active ? "text-white" : "text-[#171717]"
                }`}
              >
                {day.activities.length} stop
                {day.activities.length === 1 ? "" : "s"}
              </p>

              <p
                className={`mt-0.5 text-[11px] tabular-nums ${
                  active ? "text-white/55" : "text-[#8f8f88]"
                }`}
              >
                {day.total_transit_km ?? 0} km
                {realistic ? ` · ~${realistic} min` : ""}
              </p>

              {/* Progress rule showing position through the trip */}
              <span
                className={`mt-2.5 block h-0.5 w-full rounded-full ${
                  active ? "bg-white/30" : "bg-[rgba(0,0,0,0.07)]"
                }`}
              >
                <span
                  className={`block h-full rounded-full ${
                    active ? "bg-white" : "bg-[rgba(0,0,0,0.18)]"
                  }`}
                  style={{ width: `${(day.day / days.length) * 100}%` }}
                />
              </span>
            </button>
          );
        })}
      </div>

      {/* The legend the old red dots never had */}
      {hasAnyAlert && (
        <p className="mt-2 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <Meta>
            Days marked in amber have a travel update that needs your decision
          </Meta>
        </p>
      )}
    </div>
  );
}
