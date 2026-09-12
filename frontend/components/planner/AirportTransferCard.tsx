"use client";

/**
 * Airport ↔ hotel transfer: the pickup, travel time, cost, and the
 * checkpoint sequence that ties a flight time to a real hotel arrival (or
 * a checkout time back to a flight). Every figure is an estimate - there is
 * no live routing/fare API connected, which the caption says plainly.
 */

import { Meta, MetaDot } from "../ui/Primitives";
import type { AirportTransferPlan } from "../../types/planner";

export default function AirportTransferCard({
  title,
  plan,
}: {
  title: string;
  plan: AirportTransferPlan | null;
}) {
  if (!plan || !plan.available) return null;

  const isArrival = plan.direction === "arrival";

  return (
    <div className="rounded-2xl border border-[rgba(0,0,0,0.07)] bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="t-label">{title}</p>
        <Meta>
          {plan.transport_mode} · {plan.distance_km} km · ~{plan.estimated_minutes} min
        </Meta>
      </div>

      <p className="t-title mt-1.5 text-[15px]">
        {isArrival ? `${plan.airport_name} → Hotel` : `Hotel → ${plan.airport_name}`}
      </p>

      <ol className="mt-4 space-y-3">
        {(plan.sequence ?? []).map((step, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-[#171717]" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#171717]">
                {step.time} <span className="font-normal text-[#8f8f88]">— {step.label}</span>
              </p>
              {step.duration_min ? <Meta>~{step.duration_min} min</Meta> : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-x-1 border-t border-[rgba(0,0,0,0.07)] pt-3.5">
        <Meta className="font-semibold text-[#171717]">
          Estimated cost: ₹{plan.estimated_cost?.toLocaleString("en-IN")}
        </Meta>
        <MetaDot />
        <Meta>{plan.distance_basis}</Meta>
      </div>
    </div>
  );
}
