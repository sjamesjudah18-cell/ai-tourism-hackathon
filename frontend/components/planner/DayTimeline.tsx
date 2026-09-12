"use client";

/**
 * The realistic clock-time schedule for a day: flight, airport transfer,
 * check-in/out, meals and transit woven in around the attractions - the
 * connected view that answers "what time do I actually need to be where".
 *
 * This sits above the existing stop cards rather than replacing them; the
 * stop cards remain the detailed view of each attraction.
 */

import { Meta } from "../ui/Primitives";
import type { TimelineBlock } from "../../types/planner";

const TYPE_ICON: Record<string, string> = {
  flight: "✈️",
  transfer: "🚕",
  checkin: "🏨",
  checkout: "🏨",
  meal: "🍴",
  activity: "📍",
  transit: "↝",
  note: "⚠️",
};

export default function DayTimeline({ blocks }: { blocks: TimelineBlock[] }) {
  if (!blocks?.length) return null;

  return (
    <ol className="space-y-0">
      {blocks.map((block, index) => (
        <li key={index} className="flex gap-3 border-l border-[rgba(0,0,0,0.08)] pb-4 pl-4 last:pb-0">
          <div className="relative -ml-[21px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[rgba(0,0,0,0.1)] bg-white text-[11px]">
            <span aria-hidden="true">{TYPE_ICON[block.type] ?? "•"}</span>
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-baseline gap-x-2">
              {block.time && (
                <span className="text-[12px] font-semibold tabular-nums text-[#171717]">
                  {block.time}
                  {block.end_time ? `–${block.end_time}` : ""}
                </span>
              )}
              <span className="text-[13px] font-medium text-[#171717]">{block.title}</span>
            </div>
            {block.subtitle && <Meta className="mt-0.5 block">{block.subtitle}</Meta>}
            {block.note && (
              <p className="mt-0.5 text-[12px] text-amber-700">{block.note}</p>
            )}
            {block.cost != null && (
              <Meta className="mt-0.5 block">₹{block.cost.toLocaleString("en-IN")}</Meta>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
