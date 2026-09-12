"use client";

/**
 * Car / bike cost breakdown: distance, mileage, fuel price, and the exact
 * formula behind every line, so the traveller can see where each rupee comes
 * from rather than trusting a single opaque total.
 */

import { Meta, MetaDot } from "../ui/Primitives";
import type { VehicleCostResult } from "../../types/planner";

export default function VehicleCostCard({ cost }: { cost: VehicleCostResult }) {
  const vehicleLabel = cost.vehicle_type === "bike" ? "Bike" : "Car";

  return (
    <div className="rounded-2xl border border-[rgba(0,0,0,0.07)] bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="t-label">{vehicleLabel} cost</p>
        <Meta>
          {cost.ownership === "rental" ? "Rental" : "Personal"} · {cost.fuel_type}
        </Meta>
      </div>

      <div className="mt-2 flex flex-wrap items-center">
        <Meta className="font-semibold text-[#171717]">{cost.distance_km.toLocaleString("en-IN")} km total</Meta>
        {cost.intercity_km != null && (
          <>
            <MetaDot />
            <Meta>{cost.intercity_km} km there &amp; back</Meta>
          </>
        )}
        {cost.local_km != null && (
          <>
            <MetaDot />
            <Meta>{cost.local_km} km local</Meta>
          </>
        )}
        {cost.mileage_kmpl != null && (
          <>
            <MetaDot />
            <Meta>{cost.mileage_kmpl} km/L</Meta>
          </>
        )}
      </div>

      <div className="mt-4 space-y-2.5">
        {cost.lines.map((line) => (
          <div key={line.key} className="flex items-start justify-between gap-4 border-t border-[rgba(0,0,0,0.06)] pt-2.5 first:border-0 first:pt-0">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#171717]">{line.title}</p>
              <p className="t-caption mt-0.5">{line.formula}</p>
              {line.note && <p className="t-caption">{line.note}</p>}
            </div>
            <p className="shrink-0 text-[13px] font-semibold tabular-nums text-[#171717]">
              ₹{line.amount.toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[rgba(0,0,0,0.08)] pt-3.5">
        <Meta>Estimated · no live fuel/toll feed connected</Meta>
        <p className="text-base font-bold tabular-nums text-[#171717]">
          ₹{cost.total_cost.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}
