"use client";

/**
 * The user-controlled itinerary impact flow.
 *
 * This is the single implementation of the product's central rule: the AI
 * recommends, the traveller decides. Every alert source - weather, traffic,
 * closures, local news, cost - routes through this one component rather than
 * reimplementing the interaction per feature.
 *
 * The flow is strictly:
 *
 *   summary   ->  KEEP MY PLAN            -> kept (nothing changes)
 *             ->  SHOW ALTERNATIVES       -> alternatives
 *   alternatives -> pick one              -> confirm
 *                -> cancel                -> summary
 *   confirm   ->  CANCEL                  -> alternatives
 *             ->  CONFIRM CHANGE          -> applied
 *
 * Nothing calls the change endpoint except the CONFIRM CHANGE button in the
 * `confirm` step. Selecting an alternative is not consent; only confirming is.
 */

import { useState } from "react";
import {
  confirmItineraryChange,
  fetchAlternatives,
} from "../../lib/api";
import type { ItineraryDay } from "../../lib/api";
import type { AlternativeOption, TravelAlert } from "../../types/reality";
import {
  ConfidenceChip,
  SeverityChip,
  SEVERITY_STYLES,
  relativeTime,
} from "./RealityPrimitives";

type Step = "summary" | "alternatives" | "confirm" | "applied" | "kept";

type TravelUpdateCardProps = {
  alert: TravelAlert;
  itinerary: ItineraryDay[];
  destination: string;
  tripId?: number;
  /** Called only after a change the traveller explicitly confirmed. */
  onConfirmed?: (
    itinerary: ItineraryDay[],
    change: Record<string, any>,
    alert: TravelAlert
  ) => void;
  onKeep?: (alert: TravelAlert) => void;
  compact?: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  WEATHER: "Weather",
  TRAFFIC: "Traffic",
  CLOSURE: "Closure",
  LOCAL_NEWS: "Local update",
  COST: "Cost",
  TRANSPORT: "Transport",
  AIR_QUALITY: "Air quality",
};

export default function TravelUpdateCard({
  alert,
  itinerary,
  destination,
  tripId,
  onConfirmed,
  onKeep,
  compact = false,
}: TravelUpdateCardProps) {
  const [step, setStep] = useState<Step>("summary");
  const [options, setOptions] = useState<AlternativeOption[]>([]);
  const [selected, setSelected] = useState<AlternativeOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedTo, setAppliedTo] = useState<string | null>(null);

  const severityStyle = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.INFO;
  const canOfferAlternatives =
    Boolean(alert.affected_trip_day) && Boolean(alert.affected_place);

  async function handleShowAlternatives() {
    setLoading(true);
    setError(null);
    setStep("alternatives");

    const response = await fetchAlternatives({
      destination,
      alert,
      itinerary,
      limit: 3,
    });

    setLoading(false);

    if (!response) {
      setError(
        "We could not load alternatives just now. Your plan is unchanged."
      );
      setOptions([]);
      return;
    }

    setOptions(response.options);
    if (response.options.length === 0) {
      setError(
        "We could not find a suitable alternative for this stop. Your plan is unchanged."
      );
    }
  }

  function handleKeep() {
    setStep("kept");
    onKeep?.(alert);
  }

  /** The only path that changes anything. */
  async function handleConfirmChange() {
    if (!selected || !alert.affected_trip_day || !alert.affected_place) return;

    setLoading(true);
    setError(null);

    try {
      const result = await confirmItineraryChange({
        itinerary,
        trip_day: alert.affected_trip_day,
        replace_place: alert.affected_place,
        replacement: selected,
        alert_id: alert.id,
        reason: `${TYPE_LABELS[alert.type] ?? alert.type}: ${alert.title}`,
        trip_id: tripId,
      });

      setAppliedTo(selected.name);
      setStep("applied");
      onConfirmed?.(result.itinerary, result.change, alert);
    } catch (e: any) {
      setError(
        e?.message ||
          "The change could not be applied. Your plan has not been modified."
      );
      setStep("confirm");
    } finally {
      setLoading(false);
    }
  }

  const detected = relativeTime(alert.detected_at);

  return (
    <article className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      {/* Severity spine */}
      <div className={`h-1 w-full ${severityStyle.bar}`} />

      <div className={compact ? "p-4" : "p-5 md:p-6"}>
        {/* ---------------------------- Header ---------------------------- */}
        <div className="flex flex-wrap items-center gap-2">
          <SeverityChip severity={alert.severity} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f8f88]">
            {TYPE_LABELS[alert.type] ?? alert.type}
          </span>
          {alert.affected_trip_day && (
            <span className="rounded-full bg-[#f3efe9] px-2 py-0.5 text-[10px] font-semibold text-[#8a5a3b]">
              Day {alert.affected_trip_day}
            </span>
          )}
        </div>

        <h3 className="mt-2.5 text-base font-semibold leading-snug tracking-tight text-[#171717] md:text-lg">
          {alert.title}
        </h3>

        {/* --------------------------- Summary ---------------------------- */}
        {step === "summary" && (
          <div className="mt-3">
            {/* What happened, and why it matters */}
            <p className="text-sm leading-relaxed text-[#55554f]">
              {alert.message}
            </p>

            {alert.impact && (
              <div className="mt-3 rounded-xl border border-black/5 bg-[#faf9f7] px-3.5 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f8f88]">
                  Likely impact
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#171717]">
                  {alert.impact}
                </p>
              </div>
            )}

            {/* Provenance: source, timestamp, confidence */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8f8f88]">
              {alert.source ? (
                alert.source_url ? (
                  <a
                    href={alert.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-dotted underline-offset-2 hover:text-[#171717]"
                  >
                    Source: {alert.source}
                  </a>
                ) : (
                  <span>Source: {alert.source}</span>
                )
              ) : (
                <span>Modelled by us — not a live feed</span>
              )}
              {detected && <span>Detected {detected}</span>}
              <ConfidenceChip confidence={alert.confidence} />
            </div>

            {/* The two choices, and only these two */}
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                onClick={handleKeep}
                className="rounded-full border border-black/15 px-4 py-2 text-xs font-semibold text-[#171717] transition hover:bg-[#f5f3ee]"
              >
                Keep my plan
              </button>
              {canOfferAlternatives && (
                <button
                  onClick={handleShowAlternatives}
                  className="rounded-full bg-[#171717] px-4 py-2 text-xs font-semibold text-white transition hover:bg-black"
                >
                  Show alternatives
                </button>
              )}
            </div>
          </div>
        )}

        {/* ------------------------- Alternatives ------------------------- */}
        {step === "alternatives" && (
          <div className="mt-3">
            <p className="text-sm text-[#55554f]">
              Replacements for{" "}
              <span className="font-semibold text-[#171717]">
                {alert.affected_place}
              </span>{" "}
              on Day {alert.affected_trip_day}.
            </p>
            <p className="mt-1 text-[11px] text-[#8f8f88]">
              Suggestions only — your itinerary has not changed.
            </p>

            {loading && (
              <div className="mt-3 space-y-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-xl bg-neutral-100"
                  />
                ))}
              </div>
            )}

            {!loading && options.length > 0 && (
              <ul className="mt-3 space-y-2">
                {options.map((option) => (
                  <li key={option.name}>
                    <button
                      onClick={() => {
                        setSelected(option);
                        setStep("confirm");
                      }}
                      className="w-full rounded-xl border border-black/10 bg-white p-3.5 text-left transition hover:border-[#d97745] hover:bg-[#fdfbf9]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#171717]">
                            {option.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#8f8f88]">
                            {option.category}
                            {option.distance_from_day_km != null &&
                              ` · ${option.distance_from_day_km} km from your other stops`}
                            {option.indoor && " · Mostly indoors"}
                          </p>
                        </div>
                        {option.rating != null && (
                          <span className="shrink-0 text-xs font-semibold text-[#55554f]">
                            {option.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {option.why?.length > 0 && (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-[#6b6b66]">
                          {option.why.join(" · ")}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                {error}
              </p>
            )}

            <div className="mt-4 flex gap-2.5">
              <button
                onClick={() => {
                  setStep("summary");
                  setError(null);
                }}
                className="rounded-full border border-black/15 px-4 py-2 text-xs font-semibold text-[#171717] transition hover:bg-[#f5f3ee]"
              >
                Back
              </button>
              <button
                onClick={handleKeep}
                className="rounded-full px-4 py-2 text-xs font-semibold text-[#8f8f88] transition hover:text-[#171717]"
              >
                Keep my plan
              </button>
            </div>
          </div>
        )}

        {/* --------------------------- Confirm ---------------------------- */}
        {step === "confirm" && selected && (
          <div className="mt-3">
            <div className="rounded-xl border border-black/10 bg-[#faf9f7] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f8f88]">
                Confirm this change
              </p>
              <p className="mt-2 text-sm text-[#171717]">
                Replace{" "}
                <span className="font-semibold">{alert.affected_place}</span>{" "}
                with <span className="font-semibold">{selected.name}</span> on
                Day {alert.affected_trip_day}?
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-[#6b6b66]">
                Your itinerary, route, map and budget will update. This is the
                only action that changes your plan.
              </p>
            </div>

            {error && (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-900">
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                onClick={() => {
                  setSelected(null);
                  setStep("alternatives");
                  setError(null);
                }}
                disabled={loading}
                className="rounded-full border border-black/15 px-4 py-2 text-xs font-semibold text-[#171717] transition hover:bg-[#f5f3ee] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmChange}
                disabled={loading}
                className="rounded-full bg-[#171717] px-4 py-2 text-xs font-semibold text-white transition hover:bg-black disabled:opacity-50"
              >
                {loading ? "Applying…" : "Confirm change"}
              </button>
            </div>
          </div>
        )}

        {/* --------------------------- Applied ---------------------------- */}
        {step === "applied" && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">
              Plan updated
            </p>
            <p className="mt-1 text-xs leading-relaxed text-emerald-900/80">
              {alert.affected_place} was replaced with {appliedTo} on Day{" "}
              {alert.affected_trip_day}. Your route, map and budget have been
              recalculated.
            </p>
          </div>
        )}

        {/* ----------------------------- Kept ----------------------------- */}
        {step === "kept" && (
          <div className="mt-3 rounded-xl border border-black/10 bg-[#faf9f7] p-4">
            <p className="text-sm font-semibold text-[#171717]">
              Plan kept as it is
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#6b6b66]">
              Nothing has changed. {alert.impact ? `Worth remembering: ${alert.impact.toLowerCase()}.` : ""}
            </p>
            <button
              onClick={() => setStep("summary")}
              className="mt-2.5 text-[11px] font-semibold text-[#8a5a3b] underline underline-offset-2"
            >
              Reconsider
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
