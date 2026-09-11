"use client";

/**
 * The one alert component.
 *
 * Every alert in the product renders through this - itinerary, Reality Check,
 * notifications. Previously the itinerary showed a day-level alert card AND a
 * differently-styled nested notice inside the stop card, which meant the same
 * issue appeared twice in two visual languages on one screen. That duplicate is
 * gone; stops now only mark that they are affected and point here.
 *
 * The interaction is unchanged and still the product's core rule:
 *
 *   summary      → KEEP MY PLAN        → kept (nothing changes)
 *                → SHOW ALTERNATIVES   → alternatives
 *   alternatives → pick one            → confirm
 *   confirm      → CONFIRM CHANGE      → applied
 *
 * Only the CONFIRM CHANGE button calls the change endpoint. Selecting an
 * alternative is not consent.
 *
 * Visually it is now a left accent rule with no heavy border or shadow, so an
 * alert reads as a different kind of thing from a content card.
 */

import { useState } from "react";
import { confirmItineraryChange, fetchAlternatives } from "../../lib/api";
import type { ItineraryDay } from "../../lib/api";
import type { AlternativeOption, TravelAlert } from "../../types/reality";
import {
  Button,
  Meta,
  MetaDot,
  SeverityBadge,
  severityStyle,
  relativeTime,
} from "../ui/Primitives";

type Step = "summary" | "alternatives" | "confirm" | "applied" | "kept";

type TravelUpdateCardProps = {
  alert: TravelAlert;
  itinerary: ItineraryDay[];
  destination: string;
  tripId?: number;
  onConfirmed?: (
    itinerary: ItineraryDay[],
    change: Record<string, any>,
    alert: TravelAlert
  ) => void;
  onKeep?: (alert: TravelAlert) => void;
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
}: TravelUpdateCardProps) {
  const [step, setStep] = useState<Step>("summary");
  const [options, setOptions] = useState<AlternativeOption[]>([]);
  const [selected, setSelected] = useState<AlternativeOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedTo, setAppliedTo] = useState<string | null>(null);

  const style = severityStyle(alert.severity);
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
      setError("We couldn't load alternatives just now. Your plan is unchanged.");
      setOptions([]);
      return;
    }

    setOptions(response.options);
    if (response.options.length === 0) {
      setError(
        "We couldn't find a suitable alternative for this stop. Your plan is unchanged."
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
          "The change couldn't be applied. Your plan has not been modified."
      );
      setStep("confirm");
    } finally {
      setLoading(false);
    }
  }

  const detected = relativeTime(alert.detected_at);

  return (
    <article
      className={`animate-rise-in relative bg-white pl-4 pr-4 py-4 sm:pl-5 sm:pr-5`}
    >
      {/* Left accent rule carries severity — no heavy border or shadow */}
      <span
        className={`absolute left-0 top-0 h-full w-[3px] rounded-full ${style.rule}`}
        aria-hidden="true"
      />

      {/* ------------------------------ Header ----------------------------- */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <SeverityBadge severity={alert.severity} />
        <Meta>{TYPE_LABELS[alert.type] ?? alert.type}</Meta>
        {alert.affected_trip_day && (
          <>
            <MetaDot />
            <Meta>Day {alert.affected_trip_day}</Meta>
          </>
        )}
      </div>

      <h3 className="t-title mt-2 text-[#171717]">{alert.title}</h3>

      {/* ------------------------------ Summary ---------------------------- */}
      {step === "summary" && (
        <div className="mt-2">
          <p className="t-body">{alert.message}</p>

          {alert.impact && (
            <p className="mt-3 text-[13px] leading-relaxed text-[#171717]">
              <span className="t-label mr-2">Likely impact</span>
              {alert.impact}
            </p>
          )}

          {/* Provenance: source, timestamp, confidence */}
          <div className="mt-3 flex flex-wrap items-center">
            {alert.source ? (
              alert.source_url ? (
                <a
                  href={alert.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="t-caption underline decoration-dotted underline-offset-2 hover:text-[#171717]"
                >
                  {alert.source}
                </a>
              ) : (
                <span className="t-caption">{alert.source}</span>
              )
            ) : (
              <span className="t-caption">Modelled by us — not a live feed</span>
            )}
            {detected && (
              <>
                <MetaDot />
                <span className="t-caption">Detected {detected}</span>
              </>
            )}
            <MetaDot />
            <span className="t-caption">{alert.confidence} confidence</span>
          </div>

          {/* Exactly two choices */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={handleKeep}>
              Keep my plan
            </Button>
            {canOfferAlternatives && (
              <Button size="sm" onClick={handleShowAlternatives}>
                Show alternatives
              </Button>
            )}
          </div>
        </div>
      )}

      {/* --------------------------- Alternatives -------------------------- */}
      {step === "alternatives" && (
        <div className="animate-fade-in mt-2">
          <p className="t-body">
            Replacements for{" "}
            <span className="font-semibold text-[#171717]">
              {alert.affected_place}
            </span>{" "}
            on Day {alert.affected_trip_day}.
          </p>
          <p className="t-caption mt-1">
            Suggestions only — your itinerary has not changed.
          </p>

          {loading && (
            <div className="mt-3 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-[#f2f0ec]" />
              ))}
            </div>
          )}

          {!loading && options.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {options.map((option) => (
                <li key={option.name}>
                  <button
                    onClick={() => {
                      setSelected(option);
                      setStep("confirm");
                    }}
                    className="w-full rounded-xl border border-[rgba(0,0,0,0.08)] p-3 text-left transition hover:border-[#d97745] hover:bg-[#fdfbf9]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-[13px] font-semibold text-[#171717]">
                        {option.name}
                      </p>
                      {option.rating != null && (
                        <Meta className="shrink-0">{option.rating.toFixed(1)}</Meta>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center">
                      <Meta>{option.category}</Meta>
                      {option.distance_from_day_km != null && (
                        <>
                          <MetaDot />
                          <Meta>{option.distance_from_day_km} km away</Meta>
                        </>
                      )}
                      {option.indoor && (
                        <>
                          <MetaDot />
                          <Meta>Mostly indoors</Meta>
                        </>
                      )}
                    </div>
                    {option.why?.length > 0 && (
                      <p className="t-caption mt-1.5">{option.why.join(" · ")}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p className="t-caption mt-3 border-l-2 border-amber-400 py-1.5 pl-2.5 text-amber-900">
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setStep("summary");
                setError(null);
              }}
            >
              Back
            </Button>
            <Button variant="ghost" size="sm" onClick={handleKeep}>
              Keep my plan
            </Button>
          </div>
        </div>
      )}

      {/* ------------------------------ Confirm ---------------------------- */}
      {step === "confirm" && selected && (
        <div className="animate-fade-in mt-2">
          <div className="rounded-xl bg-[#faf9f7] p-3.5">
            <p className="t-label">Confirm this change</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#171717]">
              Replace <span className="font-semibold">{alert.affected_place}</span>{" "}
              with <span className="font-semibold">{selected.name}</span> on Day{" "}
              {alert.affected_trip_day}?
            </p>
            <p className="t-caption mt-2">
              Your itinerary, route, map and budget will update. This is the only
              action that changes your plan.
            </p>
          </div>

          {error && (
            <p className="t-caption mt-3 border-l-2 border-red-400 py-1.5 pl-2.5 text-red-800">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => {
                setSelected(null);
                setStep("alternatives");
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" disabled={loading} onClick={handleConfirmChange}>
              {loading ? "Applying…" : "Confirm change"}
            </Button>
          </div>
        </div>
      )}

      {/* ------------------------------ Applied ---------------------------- */}
      {step === "applied" && (
        <div className="animate-fade-in mt-2 border-l-2 border-emerald-400 py-1.5 pl-3">
          <p className="text-[13px] font-semibold text-emerald-800">Plan updated</p>
          <p className="t-caption mt-0.5">
            {alert.affected_place} was replaced with {appliedTo} on Day{" "}
            {alert.affected_trip_day}. Route, map and budget have been
            recalculated.
          </p>
        </div>
      )}

      {/* -------------------------------- Kept ----------------------------- */}
      {step === "kept" && (
        <div className="animate-fade-in mt-2">
          <p className="text-[13px] font-semibold text-[#171717]">
            Plan kept as it is
          </p>
          <p className="t-caption mt-0.5">
            Nothing has changed.
            {alert.impact ? ` Worth remembering: ${alert.impact.toLowerCase()}.` : ""}
          </p>
          <button
            onClick={() => setStep("summary")}
            className="mt-2 text-[11px] font-semibold text-[#8a5a3b] underline underline-offset-2"
          >
            Reconsider
          </button>
        </div>
      )}
    </article>
  );
}
