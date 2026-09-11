"use client";

import { useState } from "react";
import { DataLabelChip } from "../RealityPrimitives";

/**
 * Food detail, grouped into street / local / premium tiers.
 *
 * Dietary information is the careful part: `contains` describes what
 * traditional preparations commonly include, warnings are phrased
 * non-absolutely, and the "confirm with the restaurant" disclaimer is always
 * on screen rather than buried in a tooltip.
 */

const SPICE_DOTS = 4;

export default function FoodDetails({ details }: { details: any }) {
  const tiers: any[] = details?.tiers ?? [];
  const [activeTier, setActiveTier] = useState<string>(
    tiers[0]?.tier ?? "street"
  );

  if (tiers.length === 0) return null;

  const current = tiers.find((t) => t.tier === activeTier) ?? tiers[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {tiers.map((tier) => {
            const active = tier.tier === current.tier;
            return (
              <button
                key={tier.tier}
                onClick={() => setActiveTier(tier.tier)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-[#171717] text-white"
                    : "border border-black/10 text-[#55554f] hover:bg-[#f5f3ee]"
                }`}
              >
                {tier.label}
                <span className={active ? "ml-1.5 text-white/60" : "ml-1.5 text-[#b5b5ad]"}>
                  {tier.count}
                </span>
              </button>
            );
          })}
        </div>
        <DataLabelChip label="STATIC" />
      </div>

      <div className="grid gap-2.5 md:grid-cols-2">
        {current.items.map((dish: any) => (
          <article
            key={dish.id ?? dish.name}
            className="rounded-xl border border-black/5 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold text-[#171717]">
                {dish.name}
              </h4>
              <span className="shrink-0 text-xs font-semibold text-[#55554f]">
                {dish.price_range}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <DietChip
                label={dish.diet_label}
                vegetarian={dish.is_vegetarian}
              />
              {dish.spice_level != null && (
                <SpiceMeter level={dish.spice_level} label={dish.spice_label} />
              )}
              {dish.meal_time && (
                <span className="text-[10px] text-[#8f8f88]">
                  {dish.meal_time}
                </span>
              )}
            </div>

            {dish.description && (
              <p className="mt-2 text-xs leading-relaxed text-[#55554f]">
                {dish.description}
              </p>
            )}

            {dish.ingredients?.length > 0 && (
              <p className="mt-2 text-[11px] leading-relaxed text-[#8f8f88]">
                <span className="font-semibold text-[#6b6b66]">Typically:</span>{" "}
                {dish.ingredients.join(", ")}
              </p>
            )}

            {dish.preparation && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#8f8f88]">
                {dish.preparation}
              </p>
            )}

            {dish.where_to_find && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#6b6b66]">
                <span className="font-semibold">Where:</span> {dish.where_to_find}
              </p>
            )}

            {/* Dietary warnings - deliberately non-absolute wording */}
            {dish.dietary_warnings?.length > 0 && (
              <ul className="mt-2.5 space-y-1 rounded-lg border border-amber-200 bg-amber-50/60 px-2.5 py-2">
                {dish.dietary_warnings.map((warning: string, i: number) => (
                  <li key={i} className="text-[11px] leading-relaxed text-amber-900">
                    {warning}
                  </li>
                ))}
              </ul>
            )}

            {dish.dietary_notes && (
              <p className="mt-2 text-[11px] leading-relaxed text-[#6b6b66]">
                {dish.dietary_notes}
              </p>
            )}
          </article>
        ))}
      </div>

      {details.disclaimer && (
        <p className="rounded-xl border border-black/5 bg-[#faf9f7] px-3.5 py-2.5 text-[11px] leading-relaxed text-[#6b6b66]">
          {details.disclaimer}
        </p>
      )}
    </div>
  );
}

function DietChip({
  label,
  vegetarian,
}: {
  label: string;
  vegetarian: boolean | null;
}) {
  const tone =
    vegetarian === true
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : vegetarian === false
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-black/10 bg-white text-[#6b6b66]";

  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${tone}`}
    >
      {label}
    </span>
  );
}

function SpiceMeter({ level, label }: { level: number; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] text-[#8f8f88]"
      title={`Spice: ${label}`}
    >
      {Array.from({ length: SPICE_DOTS }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${
            i < level ? "bg-[#d97745]" : "bg-neutral-200"
          }`}
        />
      ))}
      <span className="ml-0.5">{label}</span>
    </span>
  );
}
