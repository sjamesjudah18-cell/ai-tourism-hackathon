"use client";

import { DataLabelChip } from "../RealityPrimitives";

/**
 * Transport detail: getting there, and getting around.
 *
 * No fares are quoted for the journey to the destination, because no fare
 * provider is connected. Operator links go to the real operator site and open
 * externally - there is no in-app booking flow pretending to exist.
 */
export default function TransportDetails({ details }: { details: any }) {
  const arrival = details?.getting_there ?? {};
  const local = details?.local ?? {};

  return (
    <div className="space-y-6">
      {/* ------------------------ Getting there -------------------------- */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8f88]">
            Getting there
          </h3>
          <DataLabelChip label="STATIC" />
        </div>

        {arrival.origin_prompt && (
          <p className="mt-2 rounded-xl border border-dashed border-black/10 bg-[#faf9f7] px-3.5 py-2.5 text-xs text-[#6b6b66]">
            {arrival.origin_prompt}
          </p>
        )}

        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
          {(arrival.modes ?? []).map((mode: any) => (
            <div
              key={mode.mode}
              className="rounded-xl border border-black/5 bg-white p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#171717]">
                  {mode.mode}
                </p>
                <span className="text-[10px] font-medium uppercase tracking-wide text-[#8f8f88]">
                  {mode.convenience} convenience
                </span>
              </div>

              <p className="mt-1.5 text-xs leading-relaxed text-[#55554f]">
                {mode.best_for}
              </p>
              <p className="mt-1 text-[11px] text-[#8f8f88]">
                {mode.duration_note}
              </p>
              <p className="mt-1 text-[11px] text-[#8f8f88]">{mode.cost_note}</p>

              {mode.tradeoffs?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {mode.tradeoffs.map((t: string, i: number) => (
                    <li key={i} className="flex gap-1.5 text-[11px] text-[#6b6b66]">
                      <span className="mt-[6px] h-0.5 w-0.5 shrink-0 rounded-full bg-[#b5b5ad]" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              )}

              {mode.operator?.url && (
                <a
                  href={mode.operator.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 inline-block text-[11px] font-semibold text-[#8a5a3b] underline decoration-dotted underline-offset-2"
                >
                  {mode.operator.name} ↗
                </a>
              )}
            </div>
          ))}
        </div>

        {arrival.fare_note && (
          <p className="mt-2.5 text-[11px] leading-relaxed text-[#8f8f88]">
            {arrival.fare_note}
          </p>
        )}
      </div>

      {/* ------------------------ Getting around ------------------------- */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8f88]">
            Getting around
          </h3>
          <DataLabelChip label="STATIC" />
        </div>

        <div className="mt-2.5 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 text-[10px] uppercase tracking-wider text-[#b5b5ad]">
                <th className="pb-2 pr-3 font-semibold">Mode</th>
                <th className="pb-2 pr-3 font-semibold">Typical fare</th>
                <th className="pb-2 pr-3 font-semibold">Best for</th>
                <th className="pb-2 font-semibold">Limitations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {(local.options ?? []).map((option: any) => (
                <tr key={option.mode} className="align-top">
                  <td className="py-3 pr-3">
                    <p className="font-semibold text-[#171717]">{option.mode}</p>
                    {option.operator?.url && (
                      <a
                        href={option.operator.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-[#8a5a3b] underline decoration-dotted underline-offset-2"
                      >
                        {option.operator.name} ↗
                      </a>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-[#55554f]">{option.fare_band}</td>
                  <td className="py-3 pr-3 text-[11px] leading-relaxed text-[#55554f]">
                    {option.best_for}
                  </td>
                  <td className="py-3 text-[11px] leading-relaxed text-[#8f8f88]">
                    {(option.limitations ?? []).join(" ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {local.note && (
          <p className="mt-2.5 text-[11px] leading-relaxed text-[#8f8f88]">
            {local.note}
          </p>
        )}
      </div>
    </div>
  );
}
