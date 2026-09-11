"use client";

/**
 * The Reality Check, as a briefing.
 *
 * Reads top-to-bottom like something a knowledgeable friend wrote: the
 * readiness statement leads at display size, decisions come next, then the
 * eight categories as sections of a document rather than a grid of stat cards.
 *
 * It is map-aware - the stops an alert affects are published to the shared map
 * store and marked there, so the text and the canvas tell the same story.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AssistantPanel from "../../components/assistant/AssistantPanel";
import Footer from "../../components/Footer";
import MapCanvas from "../../components/map/MapCanvas";
import MarkerPreview from "../../components/map/MarkerPreview";
import Navbar from "../../components/Navbar";
import RealitySectionBlock from "../../components/reality/RealitySection";
import TravelUpdateCard from "../../components/reality/TravelUpdateCard";
import {
  BriefingSkeleton,
  Button,
  Meta,
  MetaDot,
  Skeleton,
  SourceLine,
  StatusMark,
  UnavailableNote,
  relativeTime,
} from "../../components/ui/Primitives";
import {
  fitViewport,
  toMarkerCategory,
  useMapState,
  type MapMarker,
} from "../../lib/mapStore";
import {
  fetchRealityCheck,
  generateItinerary,
  type ItineraryDay,
} from "../../lib/api";
import type { TravelAlert, TravelReality } from "../../types/reality";

const STORAGE_KEY = "smartTourismTrip";
const ITINERARY_KEY = "aiTourismItinerary";

const DEFAULT_TRIP = {
  destination: "Hyderabad",
  days: 4,
  travelers: 2,
  budget: 25000,
  interests: ["Food", "Culture", "Adventure"],
  hotel: "Comfort",
};

export default function RealityPage() {
  const { setMarkers, setViewport, setDestination } = useMapState();

  const [trip, setTrip] = useState<any>(null);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [reality, setReality] = useState<TravelReality | null>(null);

  const [loadingItinerary, setLoadingItinerary] = useState(true);
  const [loadingReality, setLoadingReality] = useState(true);
  const [realityFailed, setRealityFailed] = useState(false);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);

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
    setDestination(resolved.destination ?? "Hyderabad");

    // Reuse a plan the traveller already confirmed changes on.
    let existing: ItineraryDay[] | null = null;
    try {
      const rawItinerary = sessionStorage.getItem(ITINERARY_KEY);
      if (rawItinerary) {
        const stored = JSON.parse(rawItinerary);
        if (
          stored?.destination === (resolved.destination ?? "") &&
          stored?.itinerary?.length
        ) {
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
          number_of_days: Number(resolved.days ?? 4),
          total_budget: Number(resolved.budget ?? 25000),
          number_of_travelers: Number(resolved.travelers ?? 2),
          interests: resolved.interests ?? DEFAULT_TRIP.interests,
          accommodation_preference: resolved.hotel ?? "Comfort",
        });
        setItinerary(result.itinerary ?? []);
      } catch {
        setItinerary([]);
      } finally {
        setLoadingItinerary(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------- Gather reality --------------------------- */
  const loadReality = useCallback(
    async (plan: ItineraryDay[], currentTrip: any) => {
      if (!currentTrip) return;
      setLoadingReality(true);
      setRealityFailed(false);

      const result = await fetchRealityCheck({
        destination: currentTrip.destination ?? "Hyderabad",
        number_of_days: Number(currentTrip.days ?? 4),
        total_budget: Number(currentTrip.budget ?? 25000),
        number_of_travelers: Number(currentTrip.travelers ?? 2),
        interests: currentTrip.interests ?? DEFAULT_TRIP.interests,
        accommodation_preference: currentTrip.hotel ?? "Comfort",
        start_date: currentTrip.start_date || undefined,
        origin: currentTrip.origin || undefined,
        itinerary: plan,
      });

      if (!result) setRealityFailed(true);
      else setReality(result);
      setLoadingReality(false);
    },
    []
  );

  useEffect(() => {
    if (loadingItinerary || !trip) return;
    loadReality(itinerary, trip);
  }, [loadingItinerary, trip, itinerary, loadReality]);

  /* ------------------ Publish affected stops to the map ---------------- */
  const alertsByPlace = useMemo(() => {
    const out = new Map<string, TravelAlert[]>();
    (reality?.alerts ?? []).forEach((alert) => {
      [alert.affected_place, ...(alert.also_affected ?? [])].forEach((name) => {
        if (!name) return;
        out.set(name, [...(out.get(name) ?? []), alert]);
      });
    });
    return out;
  }, [reality]);

  useEffect(() => {
    if (itinerary.length === 0) return;

    const markers: MapMarker[] = [];
    itinerary.forEach((day) => {
      day.activities.forEach((act, index) => {
        if (act.latitude == null || act.longitude == null) return;
        const name = act.name || act.place_name || "Stop";
        const stopAlerts = alertsByPlace.get(name);
        markers.push({
          id: `stop-${day.day}-${index}`,
          name,
          category: toMarkerCategory(act.category),
          lat: act.latitude,
          lng: act.longitude,
          day: day.day,
          sequence: index,
          image: act.image,
          rating: act.rating,
          cost: act.estimated_cost,
          description: act.description,
          affected: Boolean(stopAlerts?.length),
          affectedReason: stopAlerts?.[0]?.impact ?? undefined,
          isPlaceholder: Boolean((act as any).is_placeholder),
        });
      });
    });

    setMarkers(markers);
    if (markers.length > 0) setViewport(fitViewport(markers));
  }, [itinerary, alertsByPlace, setMarkers, setViewport]);

  const handleConfirmed = useCallback(
    (updated: ItineraryDay[]) => {
      setItinerary(updated);
      try {
        sessionStorage.setItem(
          ITINERARY_KEY,
          JSON.stringify({ destination: trip?.destination, itinerary: updated })
        );
      } catch {
        /* non-fatal */
      }
      loadReality(updated, trip);
    },
    [trip, loadReality]
  );

  const destination = reality?.destination ?? trip?.destination ?? "Hyderabad";

  const decisions = useMemo(
    () => (reality?.alerts ?? []).filter((a) => a.severity !== "INFO"),
    [reality]
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:flex-row">
        {/* The briefing */}
        <div className="min-w-0 flex-1 px-5 py-10 md:px-8 lg:w-[58%] lg:max-w-[820px]">
          {/* ------------------------- Readiness ------------------------- */}
          <header>
            <p className="t-label text-[#8a5a3b]">Reality Check</p>

            {loadingReality && !reality ? (
              <>
                <Skeleton className="mt-4 h-12 w-4/5" />
                <Skeleton className="mt-3 h-12 w-3/5" />
              </>
            ) : (
              <>
                <h1 className="t-display mt-3 text-[#171717]">
                  {reality?.readiness_summary ??
                    `We couldn't gather live conditions for ${destination}.`}
                </h1>

                {reality && (
                  <div className="mt-5 flex flex-wrap items-center">
                    <StatusMark status={reality.overall_status} />
                    <MetaDot />
                    <Meta>{reality.confidence} confidence</Meta>
                    <MetaDot />
                    <Meta>
                      Checked {relativeTime(reality.last_updated) ?? "just now"}
                    </Meta>
                  </div>
                )}
              </>
            )}

            {trip && (
              <div className="mt-4 flex flex-wrap items-center">
                <Meta>{destination}</Meta>
                <MetaDot />
                <Meta>{trip.days ?? 4} days</Meta>
                <MetaDot />
                <Meta>{trip.travelers ?? 2} travellers</Meta>
                <MetaDot />
                <Meta>
                  ₹{Number(trip.budget ?? 25000).toLocaleString("en-IN")}
                </Meta>
                <MetaDot />
                <Link
                  href="/planner"
                  className="t-meta font-semibold text-[#8a5a3b] hover:underline"
                >
                  Change trip
                </Link>
              </div>
            )}
          </header>

          {/* ------------------------- Decisions ------------------------- */}
          {decisions.length > 0 && (
            <section className="mt-10">
              <h2 className="t-title">Needs your decision</h2>
              <p className="t-body mt-1">Nothing changes unless you confirm it.</p>

              <div className="mt-4 space-y-2">
                {decisions.map((alert) => (
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

          {/* ------------------------- The sections ---------------------- */}
          <div className="mt-12">
            {loadingReality && !reality && (
              <div>
                {[
                  "Weather", "Traffic", "Local Updates", "Cost Reality",
                  "Transport", "Accommodation", "Food", "Things To Know",
                ].map((title) => (
                  <BriefingSkeleton key={title} title={title} />
                ))}
              </div>
            )}

            {realityFailed && !reality && (
              <UnavailableNote
                title="Reality Check"
                reason="We couldn't reach the reality service. Your itinerary is unaffected."
                onRetry={() => loadReality(itinerary, trip)}
              />
            )}

            {reality && (
              <>
                {/* Contents, as a document would have */}
                <nav className="mb-2 flex flex-wrap gap-x-4 gap-y-1.5 border-b border-[rgba(0,0,0,0.08)] pb-5">
                  {reality.sections.map((section, index) => (
                    <a
                      key={section.key}
                      href={`#${section.key}`}
                      className={`t-meta transition hover:text-[#171717] ${
                        section.available ? "" : "text-[#c9c9c2] line-through"
                      }`}
                    >
                      <span className="tabular-nums text-[#c9c9c2]">
                        {String(index + 1).padStart(2, "0")}
                      </span>{" "}
                      {section.title}
                    </a>
                  ))}
                </nav>

                {reality.sections.map((section, index) => (
                  <RealitySectionBlock
                    key={section.key}
                    section={section}
                    index={index}
                  />
                ))}

                <footer className="border-t border-[rgba(0,0,0,0.08)] pt-6">
                  <p className="t-label">Everything above came from</p>
                  <SourceLine
                    sources={reality.sources}
                    lastUpdated={reality.last_updated}
                    className="mt-1.5"
                  />
                  <p className="t-caption mt-3 max-w-2xl">
                    Values are marked Live, Estimated, Approximate, Reference or
                    Unavailable so you can tell what we checked from what we
                    worked out. Traffic figures are modelled from typical peak
                    hours, not a live traffic feed.
                  </p>
                </footer>
              </>
            )}
          </div>
        </div>

        {/* Shared map — affected stops are marked here too */}
        <aside className="relative hidden lg:block lg:flex-1">
          <div className="sticky top-[72px] h-[calc(100vh-72px)]">
            <MapCanvas />
            <MarkerPreview />
          </div>
        </aside>
      </main>

      <button
        onClick={() => setMobileMapOpen(true)}
        className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full bg-[#171717] px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg lg:hidden"
      >
        Map
      </button>

      {mobileMapOpen && (
        <div className="animate-fade-in fixed inset-0 z-50 lg:hidden">
          <MapCanvas />
          <MarkerPreview />
          <button
            onClick={() => setMobileMapOpen(false)}
            className="absolute right-4 top-4 z-30 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#171717] shadow-lg"
          >
            Close map
          </button>
        </div>
      )}

      <AssistantPanel
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
