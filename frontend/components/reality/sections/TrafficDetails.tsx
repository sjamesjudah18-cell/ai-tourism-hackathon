"use client";

import { DataLabelChip, StatusBadge } from "../RealityPrimitives";

/**
 * Traffic detail: planned versus realistic travel time, per day.
 *
 * The whole point of this table is the gap between the two columns - that gap
 * is the "planned 4 days, took 6" problem made visible. It is labelled
 * ESTIMATE throughout because no live traffic source is connected.
 */
export default function TrafficDetails({ details }: { details: any }) {
  const days: any[] = details?.days ?? [];
  const basis = details?.estimate_basis;

  if (days.length === 0) {
    return (
      <p className="text-xs text-[#6b6b66]">
        No routed stops yet, so there is no travel time to assess.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8f88]">
          Planned vs realistic travel time
        </h3>
        <DataLabelChip label="ESTIMATE" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/5 text-[10px] uppercase tracking-wider text-[#b5b5ad]">
              <th className="pb-2 pr-3 font-semibold">Day</th>
              <th className="pb-2 pr-3 font-semibold">Planned</th>
              <th className="pb-2 pr-3 font-semibold">Realistic</th>
              <th className="pb-2 pr-3 font-semibold">Difference</th>
              <th className="pb-2 font-semibold">Congestion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {days.map((day) => (
              <tr key={day.day}>
                <td className="py-2.5 pr-3 font-semibold text-[#171717]">
                  Day {day.day}
                </td>
                <td className="py-2.5 pr-3 text-[#8f8f88]">
                  {day.baseline_minutes} min
                </td>
                <td className="py-2.5 pr-3 font-semibold text-[#171717]">
                  {day.realistic_minutes} min
                </td>
                <td className="py-2.5 pr-3">
                  <span
                    className={
                      day.added_minutes >= 45
                        ? "font-semibold text-rose-700"
                        : day.added_minutes > 0
                        ? "text-amber-700"
                        : "text-[#8f8f88]"
                    }
                  >
                    {day.added_minutes > 0 ? `+${day.added_minutes}` : "—"}
                    {day.added_minutes > 0 && " min"}
                  </span>
                </td>
                <td className="py-2.5">
                  <StatusBadge status={day.status} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-black/10">
              <td className="pt-2.5 pr-3 text-[11px] font-semibold uppercase tracking-wide text-[#8f8f88]">
                Trip total
              </td>
              <td className="pt-2.5 pr-3 text-[#8f8f88]">
                {details.total_baseline_minutes} min
              </td>
              <td className="pt-2.5 pr-3 font-semibold text-[#171717]">
                {details.total_realistic_minutes} min
              </td>
              <td className="pt-2.5 pr-3 font-semibold text-rose-700">
                +{details.total_added_minutes} min
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {basis?.note && (
        <p className="rounded-xl border border-black/5 bg-[#faf9f7] px-3.5 py-2.5 text-[11px] leading-relaxed text-[#6b6b66]">
          <span className="font-semibold text-[#171717]">How this is worked out:</span>{" "}
          {basis.value} {basis.note}
        </p>
      )}
    </div>
  );
}
