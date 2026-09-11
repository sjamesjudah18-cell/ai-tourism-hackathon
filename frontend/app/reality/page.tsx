"use client";

/**
 * The Reality Check.
 *
 * The product's main surface: trip readiness, the eight category sections, and
 * every alert routed through the shared KEEP / SHOW ALTERNATIVES / CONFIRM
 * flow.
 *
 * Loading is deliberately staged. The itinerary resolves first so the page has
 * something real on screen quickly, then the reality gather - which fans out to
 * several external APIs - fills in behind a skeleton. A failure in either
 * degrades to a notice rather than an empty page.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AIChat from "../../components/AICHAT";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import {
  SectionSkeleton,
  SourceStamp,
  StatusBadge,
  UnavailableNotice,
  relativeTime,
} from "../../components/reality/RealityPrimitives";
import RealitySectionCard from "../../components/reality/RealitySection";
import TravelUpdateCard from "../../components/reality/TravelUpdateCard";
import {
  fetchRealityCheck,
  generateItinerary,
  type ItineraryDay,
} from "../../lib/api";
import type { TravelAlert, TravelReality } from "../../types/reality";

const STORAGE_KEY = "smartTourismTrip";
const ITINERARY_KEY = "aiTourismItinerary";

/** The Hyderabad benchmark, used when no trip has been planned yet. */
const DEFAULT_TRIP = {
  destination: "Hyderabad",
  days: 4,
  travelers: 2,
  budget: 25000,
  interests: ["Food", "Culture", "Adventure"],
  hotel: "Comfort",
  transport: "Any",
};

export default function RealityPage() {
  const [trip, setTrip] = useState<any>(null);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [reality, setReality] = useState<TravelReality | null>(null);

  const [loadingItinerary, setLoadingItinerary] = useState(true);
  const [loadingReality, setLoadingReality] = useState(true);
  const [realityFailed, setRealityFailed] = useState(false);

  /* --------------------------- Load the trip --------------------------- */
  useEffect(() => {
    let parsed: any = null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    const resolved = parsed ?? DEFAULT_TRIP;
    setTrip(resolved);

    // Reuse an itinerary already confirmed on the itinerary page, so a change
    // the traveller made there is reflected here rather than being regenerated
    // away.
    let existing: ItineraryDay[] | null = null;
    try {
      const rawItinerary = sessionStorage.getItem(ITINERARY_KEY);
      if (rawItinerary) {
        const stored = JSON.parse(rawItinerary);
        if (stored?.destination === (resolved.destination ?? "") && stored?.itinerary?.length) {
          existing = stored.itinerary;
        }
      }
    } catch {
      existing = null;
    }

    if (existing) {
      setItinerary(existing);
      setLoadingItinerary(false);
      return;
    }

    (async () => {
      try {
        const result = await generateItinerary({
          destination: resolved.destination ?? "Hyderabad",
          number_of_days: Number(resolved.days ?? resolved.number_of_days ?? 4),
          total_budget: Number(resolved.budget ?? resolved.total_budget ?? 25000),
          number_of_travelers: Number(
            resolved.travelers ?? resolved.number_of_travelers ?? 2
          ),
          interests: resolved.interests ?? DEFAULT_TRIP.interests,
          accommodation_preference: resolved.hotel ?? "Comfort",
          transport_preference: resolved.transport ?? "Any",
        });
        setItinerary(result.itinerary ?? []);
      } catch {
        // The reality check still works without an itinerary - the
        // destination-level sections do not depend on one.
        setItinerary([]);
      } finally {
        setLoadingItinerary(false);
      }
    })();
  }, []);

  /* -------------------------- Gather reality --------------------------- */
  const loadReality = useCallback(
    async (currentItinerary: ItineraryDay[], currentTrip: any) => {
      if (!currentTrip) return;

      setLoadingReality(true);
      setRealityFailed(false);

      const result = await fetchRealityCheck({
        destination: currentTrip.destination ?? "Hyderabad",
        number_of_days: Number(currentTrip.days ?? currentTrip.number_of_days ?? 4),
        total_budget: Number(currentTrip.budget ?? currentTrip.total_budget ?? 25000),
        number_of_travelers: Number(
          currentTrip.travelers ?? currentTrip.number_of_travelers ?? 2
        ),
        interests: currentTrip.interests ?? DEFAULT_TRIP.interests,
        accommodation_preference: currentTrip.hotel ?? "Comfort",
        start_date: currentTrip.start_date || undefined,
        origin: currentTrip.origin || undefined,
        itinerary: currentItinerary,
      });

      if (!result) {
        setRealityFailed(true);
      } else {
        setReality(result);
      }
      setLoadingReality(false);
    },
    []
  );

  useEffect(() => {
    if (loadingItinerary || !trip) return;
    loadReality(itinerary, trip);
  }, [loadingItinerary, trip, itinerary, loadReality]);

  /* ------------------- Confirmed change from an alert ------------------ */
  const handleConfirmed = useCallback(
    (updated: ItineraryDay[]) => {
      setItinerary(updated);
      try {
        sessionStorage.setItem(
          ITINERARY_KEY,
          JSON.stringify({ destination: trip?.destination, itinerary: updated })
        );
      } catch {
        // Storage being unavailable must not break the confirmed change.
      }
      // Conditions are re-assessed against the new plan.
      loadReality(updated, trip);
    },
    [trip, loadReality]
  );

  const destination = reality?.destination ?? trip?.destination ?? "Hyderabad";

  const actionableAlerts = useMemo(
    () => (reality?.alerts ?? []).filter((a) => a.severity !== "INFO"),
    [reality]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfbfa] text-[#171717]">
      <Navbar />

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-8 md:px-8 md:py-12">
        {/* ---------------------------- Header --------------------------- */}
        <header className="border-b border-black/10 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a5a3b]">
            Reality Check
          </p>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {destination}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#55554f]">
                {loadingReality && !reality
                  ? "Gathering live conditions for your travel dates…"
                  : reality?.readiness_summary ??
                    "We could not gather live conditions for this destination."}
              </p>
            </div>

            {reality && (
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#8f8f88]">
                    Trip readiness
                  </span>
                  <StatusBadge status={reality.overall_status} size="lg" />
                </div>
                <p className="text-[11px] text-[#8f8f88]">
                  {reality.confidence} confidence ·{" "}
                  {relativeTime(reality.last_updated) ?? "just now"}
                </p>
              </div>
            )}
          </div>

          {/* Trip parameters */}
          {trip && (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#6b6b66]">
              <span>{trip.days ?? trip.number_of_days ?? 4} days</span>
              <span>
                {trip.travelers ?? trip.number_of_travelers ?? 2} travellers
              </span>
              <span>
                ₹
                {Number(trip.budget ?? trip.total_budget ?? 25000).toLocaleString(
                  "en-IN"
                )}{" "}
                budget
              </span>
              <span>{trip.hotel ?? "Comfort"} stay</span>
              <Link
                href="/planner"
                className="font-semibold text-[#8a5a3b] hover:underline"
              >
                Change trip
              </Link>
            </div>
          )}
        </header>

        {/* ------------------------ Needs a decision --------------------- */}
        {actionableAlerts.length > 0 && (
          <section className="mt-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">
                Needs your decision
              </h2>
              <span className="text-[11px] text-[#8f8f88]">
                {actionableAlerts.length} update
                {actionableAlerts.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#6b6b66]">
              Nothing changes unless you confirm it.
            </p>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {actionableAlerts.map((alert: TravelAlert) => (
                <TravelUpdateCard
                  key={alert.id}
                  alert={alert}
                  itinerary={itinerary}
                  destination={destination}
                  onConfirmed={handleConfirmed}
                />
              ))}
            </div>
          </section>
        )}

        {/* --------------------------- Sections -------------------------- */}
        <section className="mt-10">
          {loadingReality && !reality && (
            <div className="space-y-3">
              {[
                "Weather",
                "Traffic",
                "Local Updates",
                "Cost Reality",
                "Transport",
                "Accommodation",
                "Food",
                "Things To Know",
              ].map((title) => (
                <SectionSkeleton key={title} title={title} />
              ))}
            </div>
          )}

          {realityFailed && !reality && (
            <UnavailableNotice
              title="Reality Check"
              reason="We could not reach the reality service. Your itinerary is unaffected."
              onRetry={() => loadReality(itinerary, trip)}
            />
          )}

          {reality && (
            <>
              {/* Jump links */}
              <nav className="mb-5 flex flex-wrap gap-1.5">
                {reality.sections.map((section) => (
                  <a
                    key={section.key}
                    href={`#${section.key}`}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      section.available
                        ? "border-black/10 text-[#55554f] hover:bg-white"
                        : "border-dashed border-black/10 text-[#b5b5ad]"
                    }`}
                  >
                    {section.title}
                  </a>
                ))}
              </nav>

              <div className="space-y-3">
                {reality.sections.map((section) => (
                  <RealitySectionCard key={section.key} section={section} />
                ))}
              </div>

              <div className="mt-8 border-t border-black/10 pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8f88]">
                  Everything on this page came from
                </p>
                <SourceStamp
                  sources={reality.sources}
                  lastUpdated={reality.last_updated}
                  className="mt-1.5"
                />
                <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-[#8f8f88]">
                  Values are labelled Live, Estimate, Approximate, Reference or
                  Unavailable so you can tell what we checked from what we worked
                  out. Traffic figures are modelled from typical peak hours, not a
                  live traffic feed.
                </p>
              </div>
            </>
          )}
        </section>
      </main>

      <AIChat
        tripContext={{
          destination,
          days: Number(trip?.days ?? 4),
          budget: Number(trip?.budget ?? 25000),
          interests: trip?.interests,
        }}
        itinerary={itinerary}
        reality={reality}
      />

      <Footer />
    </div>
  );
}
