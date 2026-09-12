"use client";

/**
 * Budget & cost optimization: total vs. estimated, a visual progress bar,
 * the category breakdown, and - only when the plan runs over - real
 * money-saving suggestions computed from the traveller's actual alternative
 * flights/hotels/attractions, never generic advice.
 */

import { Meta } from "../ui/Primitives";
import type { TripBudget } from "../../types/planner";

const CATEGORY_META: Record<keyof TripBudget["categories"], { label: string; icon: string }> = {
  flights: { label: "Flights", icon: "✈️" },
  hotel: { label: "Hotel", icon: "🏨" },
  transport: { label: "Transport", icon: "🚕" },
  food: { label: "Food", icon: "🍴" },
  attractions: { label: "Attractions", icon: "🏝️" },
  tolls: { label: "Tolls", icon: "🛣️" },
  parking: { label: "Parking", icon: "🅿️" },
  other: { label: "Other", icon: "💼" },
};

const SUGGESTION_ICON: Record<string, string> = {
  flight: "✈️",
  hotel: "🏨",
  transport: "🚕",
  attraction: "🏝️",
};

export default function BudgetOptimizer({ budget }: { budget: TripBudget }) {
  const isOver = budget.status === "OVER_BUDGET";
  const barPercent = Math.min(100, budget.progress_percent);
  const overshootPercent = Math.max(0, budget.progress_percent - 100);

  return (
    <div className="rounded-2xl border border-[rgba(0,0,0,0.07)] bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="t-label">Budget &amp; cost optimization</p>
        <Meta>{budget.progress_percent}% of budget</Meta>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="t-title text-[15px]">₹{budget.total_budget.toLocaleString("en-IN")} budget</p>
        <p className={`text-sm font-semibold ${isOver ? "text-red-700" : "text-emerald-700"}`}>
          {isOver
            ? `₹${budget.over_budget_amount.toLocaleString("en-IN")} over`
            : `₹${budget.remaining_budget.toLocaleString("en-IN")} remaining`}
        </p>
      </div>

      {/* Visual budget bar */}
      <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-[#eeece7]">
        <div
          className={`h-full rounded-full transition-all ${isOver ? "bg-red-600" : "bg-[#171717]"}`}
          style={{ width: `${barPercent}%` }}
        />
      </div>
      {isOver && (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-red-100">
          <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.min(100, overshootPercent)}%` }} />
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Meta>Spent: ₹{budget.total_estimated_cost.toLocaleString("en-IN")}</Meta>
        <Meta>
          {isOver ? "Extra required" : "Remaining"}: ₹
          {(isOver ? budget.over_budget_amount : budget.remaining_budget).toLocaleString("en-IN")}
        </Meta>
      </div>

      {/* Category breakdown */}
      <div className="mt-5 space-y-2">
        {(Object.keys(budget.categories) as (keyof TripBudget["categories"])[])
          .filter((key) => budget.categories[key] > 0)
          .map((key) => (
            <div key={key} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex items-center gap-2 text-[#4a4a45]">
                <span aria-hidden="true">{CATEGORY_META[key].icon}</span>
                {CATEGORY_META[key].label}
              </span>
              <span className="font-semibold tabular-nums text-[#171717]">
                ₹{budget.categories[key].toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        <div className="flex items-center justify-between gap-3 border-t border-[rgba(0,0,0,0.1)] pt-2 text-[13px] font-bold">
          <span>Total estimated cost</span>
          <span className="tabular-nums">₹{budget.total_estimated_cost.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Status + suggestions */}
      {isOver ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-red-700">
            ⚠️ Over budget
          </p>
          <p className="t-caption mt-1">
            Total budget ₹{budget.total_budget.toLocaleString("en-IN")} · Estimated spending ₹
            {budget.total_estimated_cost.toLocaleString("en-IN")} · Extra required ₹
            {budget.over_budget_amount.toLocaleString("en-IN")}
          </p>

          {budget.suggestions.length > 0 && (
            <div className="mt-3 space-y-2.5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8f8f88]">
                Save money
              </p>
              {budget.suggestions.map((s, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <p className="text-[13px] text-[#4a4a45]">
                    <span className="mr-1.5" aria-hidden="true">
                      {SUGGESTION_ICON[s.icon] ?? "💡"}
                    </span>
                    {s.action}
                  </p>
                  <p className="shrink-0 text-[13px] font-semibold tabular-nums text-emerald-700">
                    -₹{s.potential_saving.toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-t border-red-200 pt-2 text-[13px] font-semibold">
                <span>Potential total saving</span>
                <span className="tabular-nums text-emerald-700">
                  -₹{budget.potential_total_saving.toLocaleString("en-IN")}
                </span>
              </div>
              {budget.remaining_after_suggestions != null && (
                <p className="t-caption">
                  {budget.remaining_after_suggestions > 0
                    ? `Still ₹${budget.remaining_after_suggestions.toLocaleString("en-IN")} over budget after these changes.`
                    : "Applying these would bring you back within budget."}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
            You are within budget
          </p>
          <p className="t-caption mt-1">
            Budget ₹{budget.total_budget.toLocaleString("en-IN")} · Estimated spend ₹
            {budget.total_estimated_cost.toLocaleString("en-IN")} · Remaining ₹
            {budget.remaining_budget.toLocaleString("en-IN")}
          </p>
        </div>
      )}
    </div>
  );
}
