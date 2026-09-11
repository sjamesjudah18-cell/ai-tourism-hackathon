"use client";

import { DataLabelChip } from "../RealityPrimitives";

const inr = (value: number | null | undefined) =>
  value == null ? "—" : `₹${Math.round(value).toLocaleString("en-IN")}`;

/**
 * Cost detail: the bottom-up breakdown against the stated budget.
 *
 * Every line is a range rather than a single number, and carries its own
 * provenance chip. Nothing here is presented as a guaranteed price.
 */
export default function CostDetails({ details }: { details: any }) {
  const lines: any[] = details?.lines ?? [];
  const total = details?.total ?? {};
  const budget = details?.stated_budget ?? 0;
  const remaining = details?.remaining ?? {};

  const overBudget = budget > 0 && (total.low ?? 0) > budget;
  const barPct =
    budget > 0
      ? Math.min(100, Math.round(((total.mid ?? 0) / budget) * 100))
      : 0;

  return (
    <div className="space-y-5">
      {/* --------------------------- Headline ---------------------------- */}
      <div className="grid gap-2.5 sm:grid-cols-3">
        <Summary
          label="Estimated total"
          value={`${inr(total.low)} – ${inr(total.high)}`}
          emphasis
        />
        <Summary label="Your budget" value={inr(budget)} />
        <Summary
          label={overBudget ? "Shortfall" : "Headroom"}
          value={
            remaining.low == null
              ? "—"
              : `${inr(Math.min(remaining.low, remaining.high))} – ${inr(
                  Math.max(remaining.low, remaining.high)
                )}`
          }
          tone={overBudget ? "negative" : "positive"}
        />
      </div>

      {budget > 0 && (
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className={`h-full rounded-full ${
                overBudget ? "bg-rose-500" : barPct > 85 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${barPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[#8f8f88]">
            Mid-point estimate is {barPct}% of your stated budget.
          </p>
        </div>
      )}

      {/* -------------------------- Breakdown ---------------------------- */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8f88]">
          Where it goes
        </h3>

        <ul className="mt-2.5 divide-y divide-black/5">
          {lines.map((line) => {
            const isUnavailable = line.label === "UNAVAILABLE";
            return (
              <li key={line.key} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#171717]">
                      {line.title}
                    </span>
                    <DataLabelChip label={line.label} />
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      isUnavailable ? "text-[#b5b5ad]" : "text-[#171717]"
                    }`}
                  >
                    {isUnavailable
                      ? "Not included"
                      : `${inr(line.range?.low)} – ${inr(line.range?.high)}`}
                  </span>
                </div>
                {line.basis && (
                  <p className="mt-1 text-[11px] leading-relaxed text-[#8f8f88]">
                    {line.basis}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="rounded-xl border border-black/5 bg-[#faf9f7] px-3.5 py-2.5 text-[11px] leading-relaxed text-[#6b6b66]">
        These are estimates and ranges, not quoted prices. Travel to and from
        the destination is not included in the total.
      </p>
    </div>
  );
}

function Summary({
  label,
  value,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "positive" | "negative";
}) {
  const valueTone =
    tone === "negative"
      ? "text-rose-700"
      : tone === "positive"
      ? "text-emerald-700"
      : "text-[#171717]";

  return (
    <div
      className={`rounded-xl border px-3.5 py-3 ${
        emphasis ? "border-black/10 bg-white" : "border-black/5 bg-[#faf9f7]"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f8f88]">
        {label}
      </p>
      <p className={`mt-1 text-base font-semibold ${valueTone}`}>{value}</p>
    </div>
  );
}
