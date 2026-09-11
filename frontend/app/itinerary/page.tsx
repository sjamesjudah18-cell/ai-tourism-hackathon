"use client";

/**
 * The itinerary page.
 *
 * The plan loads first and renders on its own. Reality data - weather,
 * modelled traffic, local news, alerts - is gathered separately afterwards and
 * fills in around it. That separation is deliberate: the itinerary must never
 * be held up, or taken down, by an external API it does not depend on.
 *
 * Alerts affecting the selected day appear above the timeline and route through
 * the shared TravelUpdateCard flow. Nothing here mutates the plan; the only
 * change path is a traveller confirming one of those cards.
 */

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AIChat from "../../components/AICHAT";
import BudgetCard from "../../components/BudgetCard";
import Footer from "../../components/Footer";
import HotelCard from "../../components/HotelCard";
import ItineraryCard from "../../components/ItineraryCard";
// Imported as TripMap so it does not shadow the built-in Map constructor,
// which is used for the lookup tables below.
import TripMap, { MapLocation } from "../../components/Map";
import Navbar from "../../components/Navbar";
import {
  SectionSkeleton,
  StatusBadge,
  relativeTime,
} from "../../components/reality/RealityPrimitives";
import TravelUpdateCard from "../../components/reality/TravelUpdateCard";
import {
  ActivityItem,
  ItineraryDay,
  ItineraryResponse,
  fetchRealityCheck,
  generateItinerary,
} from "../../lib/api";
import type { RealityStatus, TravelAlert, TravelReality } from "../../types/reality";

const STORAGE_KEY = "smartTourismTrip";
const ITINERARY_KEY = "aiTourismItinerary";

const CITY_HEROES: Record<string, string> = {
  hyderabad:
    "https://images.unsplash.com/photo-1600267197423-8c3f1c3f8f6a?auto=format&fit=crop&w=1800&q=85",
  goa: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1800&q=85",
  jaipur:
    "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1800&q=85",
  delhi:
    "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1800&q=85",
  "new delhi":
    "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1800&q=85",
  mumbai:
    "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1800&q=85",
  kochi:
    "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1800&q=85",
};

const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1800&q=85";

const DEFAULT_TRIP = {
  destination: "Hyderabad",
  days: 4,
  number_of_days: 4,
  travelers: 2,
  number_of_travelers: 2,
  budget: 25000,
  total_budget: 25000,
  interests: ["Food", "Culture", "Adventure"],
  transport: "Any",
  hotel: "Comfort",
};

export default function ItineraryPageWrapper() {
  return (
    <Suspense fallback={<LoadingShell destination="your trip" />}>
      <ItineraryPage />
    </Suspense>
  );
}

function ItineraryPage() {
  const searchParams = useSearchParams();

  const [tripConfig, setTripConfig] = useState<any>(null);
  const [data, setData] = useState<ItineraryResponse | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reality loads independently of the plan.
  const [reality, setReality] = useState<TravelReality | null>(null);
  const [loadingReality, setLoadingReality] = useState(false);

  /* ------------------------- Load the itinerary ------------------------ */
  useEffect(() => {
    let parsedTrip: any = null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) parsedTrip = JSON.parse(raw);
    } catch {
      parsedTrip = null;
    }

    if (!parsedTrip) parsedTrip = DEFAULT_TRIP;
    setTripConfig(parsedTrip);

    const dayParam = Number(searchParams.get("day"));
    if (dayParam > 0) setSelectedDay(dayParam);

    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await generateItinerary({
          destination: parsedTrip.destination || "Hyderabad",
          number_of_days: Number(
            parsedTrip.days || parsedTrip.number_of_days || 4
          ),
          total_budget: Number(
            parsedTrip.budget || parsedTrip.total_budget || 25000
          ),
          number_of_travelers: Number(
            parsedTrip.travelers || parsedTrip.number_of_travelers || 2
          ),
          interests: parsedTrip.interests || ["Food", "Culture"],
          transport_preference: parsedTrip.transport || "Any",
          accommodation_preference: parsedTrip.hotel || "Comfort",
        });
        setData(res);
        setItinerary(res.itinerary ?? []);
      } catch (err) {
        setErrorMsg(
          "We could not reach the planning service. Check that the backend is running, then try again."
        );
      } finally {
        setLoading(false);
      }
    })();
    // searchParams is read once on mount deliberately - a day change should
    // not refetch the whole itinerary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------- Gather reality once the plan is on screen ------------- */
  const loadReality = useCallback(
    async (plan: ItineraryDay[], trip: any) => {
      if (!trip || plan.length === 0) return;

      setLoadingReality(true);
      const result = await fetchRealityCheck({
        destination: trip.destination || "Hyderabad",
        number_of_days: Number(trip.days || trip.number_of_days || 4),
        total_budget: Number(trip.budget || trip.total_budget || 25000),
        number_of_travelers: Number(
          trip.travelers || trip.number_of_travelers || 2
        ),
        interests: trip.interests || DEFAULT_TRIP.interests,
        accommodation_preference: trip.hotel || "Comfort",
        start_date: trip.start_date || undefined,
        origin: trip.origin || undefined,
        itinerary: plan,
      });
      // A null result simply means no reality layer this time - the plan
      // stays fully usable.
      if (result) setReality(result);
      setLoadingReality(false);
    },
    []
  );

  useEffect(() => {
    if (loading || itinerary.length === 0 || !tripConfig) return;
    loadReality(itinerary, tripConfig);
  }, [loading, itinerary, tripConfig, loadReality]);

  /* Keep the confirmed plan available to the Reality Check page. */
  useEffect(() => {
    if (itinerary.length === 0 || !tripConfig) return;
    try {
      sessionStorage.setItem(
        ITINERARY_KEY,
        JSON.stringify({ destination: tripConfig.destination, itinerary })
      );
    } catch {
      // Session storage being unavailable is not fatal.
    }
  }, [itinerary, tripConfig]);

  /* --------------------- Confirmed change handler ---------------------- */
  const handleConfirmed = useCallback(
    (updated: ItineraryDay[]) => {
      setItinerary(updated);
      loadReality(updated, tripConfig);
    },
    [tripConfig, loadReality]
  );

  /* ------------------------------ Derived ------------------------------ */
  const destinationName =
    data?.destination || tripConfig?.destination || "Hyderabad";

  const heroImage = useMemo(() => {
    const key = destinationName.toLowerCase().trim();
    for (const [k, v] of Object.entries(CITY_HEROES)) {
      if (key.includes(k)) return v;
    }
    return DEFAULT_HERO;
  }, [destinationName]);

  const totalDays = itinerary.length || data?.number_of_days || tripConfig?.days || 4;

  const currentDayData = useMemo(
    () => itinerary.find((d) => d.day === selectedDay) ?? itinerary[0] ?? null,
    [itinerary, selectedDay]
  );

  /* Alerts and forecast for the selected day. */
  const dayAlerts = useMemo(
    () =>
      (reality?.alerts ?? []).filter(
        (a) => a.affected_trip_day === selectedDay && a.severity !== "INFO"
      ),
    [reality, selectedDay]
  );

  const tripWideAlerts = useMemo(
    () =>
      (reality?.alerts ?? []).filter(
        (a) => !a.affected_trip_day && a.severity !== "INFO"
      ),
    [reality]
  );

  const weatherSection = reality?.sections.find((s) => s.key === "weather");
  const trafficSection = reality?.sections.find((s) => s.key === "traffic");

  const dayForecast = useMemo(() => {
    const forecast: any[] = weatherSection?.details?.forecast ?? [];
    return forecast.find((f) => f.trip_day === selectedDay) ?? null;
  }, [weatherSection, selectedDay]);

  const dayTraffic = useMemo(() => {
    const days: any[] = trafficSection?.details?.days ?? [];
    return days.find((d) => d.day === selectedDay) ?? null;
  }, [trafficSection, selectedDay]);

  /** Realistic minutes per stop, keyed by place name. */
  const realisticByPlace = useMemo(() => {
    const map = new Map<string, number>();
    (dayTraffic?.legs ?? []).forEach((leg: any) => {
      if (leg.to_place) map.set(leg.to_place, leg.realistic_minutes);
    });
    return map;
  }, [dayTraffic]);

  /** Alerts keyed by the stop they name. */
  const alertsByPlace = useMemo(() => {
    const map = new Map<string, TravelAlert[]>();
    dayAlerts.forEach((alert) => {
      const names = [alert.affected_place, ...(alert.also_affected ?? [])];
      names.forEach((name) => {
        if (!name) return;
        map.set(name, [...(map.get(name) ?? []), alert]);
      });
    });
    return map;
  }, [dayAlerts]);

  /* Map pins for the selected day only, with affected stops flagged. */
  const mapLocations: MapLocation[] = useMemo(() => {
    const list: MapLocation[] = [];

    if (currentDayData?.activities) {
      currentDayData.activities.forEach((act, idx) => {
        if (act.latitude == null || act.longitude == null) return;

        const catMap: Record<string, MapLocation["category"]> = {
          historical: "place",
          culture: "place",
          food: "food",
          nature: "activity",
          adventure: "activity",
          museum: "place",
          beach: "activity",
        };
        const name = act.name || act.place_name || "Attraction";
        const stopAlerts = alertsByPlace.get(name);

        list.push({
          id: `act-${idx}`,
          name,
          category: catMap[act.category?.toLowerCase()] || "place",
          lat: act.latitude,
          lng: act.longitude,
          time: act.time,
          cost: act.estimated_cost,
          affected: Boolean(stopAlerts?.length),
          affectedReason: stopAlerts?.[0]?.impact ?? undefined,
        });
      });
    }

    // Hotels are shown alongside the day's stops so the commute is visible.
    (data?.hotels ?? []).forEach((h, idx) => {
      if (h.latitude == null || h.longitude == null) return;
      list.push({
        id: `hotel-${idx}`,
        name: h.name,
        category: "hotel",
        lat: h.latitude,
        lng: h.longitude,
        cost: h.price_per_night,
      });
    });

    return list;
  }, [currentDayData, data?.hotels, alertsByPlace]);

  /* ------------------------------ Render ------------------------------- */
  if (loading) return <LoadingShell destination={destinationName} />;

  if (errorMsg && !data) {
    return (
      <div className="flex min-h-screen flex-col bg-[#fbfbfa]">
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-semibold text-[#171717]">
            We couldn&apos;t build your itinerary
          </h2>
          <p className="mt-2 max-w-md text-sm text-[#6b6b66]">{errorMsg}</p>
          <Link
            href="/planner"
            className="mt-5 rounded-full bg-[#171717] px-5 py-2.5 text-xs font-semibold text-white"
          >
            Back to planner
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const budgetBreakdown = data?.budget_breakdown;
  const aiInsights = data?.ai_insights;

  return (
    <div className="flex min-h-screen flex-col bg-[#fbfbfa] text-[#171717]">
      <Navbar />

      {/* ------------------------------ Hero ------------------------------ */}
      <section className="mx-auto w-full max-w-[1400px] px-5 pt-5 md:px-8 md:pt-8">
        <div className="relative min-h-[420px] overflow-hidden rounded-[28px] shadow-lg md:min-h-[480px]">
          <img
            src={heroImage}
            alt={destinationName}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

          <div className="absolute bottom-0 left-0 right-0 p-6 text-white md:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dca17e]">
              Your itinerary
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              {destinationName}
            </h1>
            {aiInsights?.trip_tagline && (
              <p className="mt-2 text-sm font-medium text-white/90 md:text-base">
                {aiInsights.trip_tagline}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/85 md:text-sm">
              <span>{totalDays} days</span>
              <span>
                {data?.number_of_travelers || tripConfig?.travelers || 2}{" "}
                travellers
              </span>
              <span>
                ₹
                {(
                  data?.total_budget ||
                  tripConfig?.budget ||
                  25000
                ).toLocaleString("en-IN")}
              </span>
              <span>
                {data?.accommodation_preference || tripConfig?.hotel || "Comfort"}{" "}
                stay
              </span>

              {reality && (
                <Link
                  href="/reality"
                  className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur transition hover:bg-white/25"
                >
                  <span>Trip readiness</span>
                  <StatusBadge status={reality.overall_status} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------ Reality strip (loads separately) --------------- */}
      <section className="mx-auto w-full max-w-[1400px] px-5 pt-6 md:px-8">
        {loadingReality && !reality ? (
          <div className="rounded-2xl border border-black/5 bg-white p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-100" />
            <div className="mt-2.5 h-3 w-3/5 animate-pulse rounded bg-neutral-100" />
          </div>
        ) : reality ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white p-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8f8f88]">
                What to expect
              </p>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#55554f]">
                {reality.readiness_summary}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#8f8f88]">
                {relativeTime(reality.last_updated)}
              </span>
              <Link
                href="/reality"
                className="rounded-full border border-black/15 px-3.5 py-1.5 text-xs font-semibold text-[#171717] transition hover:bg-[#f5f3ee]"
              >
                Full Reality Check
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/10 bg-[#faf9f7] p-4 text-xs text-[#6b6b66]">
            Live conditions are temporarily unavailable. Your itinerary below is
            unaffected.
          </div>
        )}
      </section>

      {/* ------------------- Trip-wide alerts (cost etc.) ------------------ */}
      {tripWideAlerts.length > 0 && (
        <section className="mx-auto w-full max-w-[1400px] px-5 pt-4 md:px-8">
          <div className="grid gap-3 lg:grid-cols-2">
            {tripWideAlerts.map((alert) => (
              <TravelUpdateCard
                key={alert.id}
                alert={alert}
                itinerary={itinerary}
                destination={destinationName}
                onConfirmed={handleConfirmed}
                compact
              />
            ))}
          </div>
        </section>
      )}

      {/* -------------------- Timeline + map ------------------------------ */}
      <section className="mx-auto w-full max-w-[1400px] px-5 py-8 md:px-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_500px]">
          {/* Left: the plan */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-5">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d97745]">
                  Day-by-day
                </span>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
                  {currentDayData?.title || `Day ${selectedDay}`}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {currentDayData?.total_transit_km ? (
                  <span className="rounded-full border border-black/10 bg-[#f7f6f2] px-3 py-1.5 font-medium text-[#55554f]">
                    {currentDayData.total_transit_km} km ·{" "}
                    {currentDayData.estimated_transit_minutes} min planned
                  </span>
                ) : null}
                {dayTraffic && dayTraffic.added_minutes > 0 && (
                  <span
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-medium text-amber-900"
                    title="Modelled from typical peak hours, not live traffic"
                  >
                    +{dayTraffic.added_minutes} min realistic
                  </span>
                )}
                {dayForecast && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-[#8f8f88]">
                      {dayForecast.condition}
                    </span>
                    <StatusBadge status={dayForecast.outdoor_suitability} />
                  </span>
                )}
              </div>
            </div>

            {/* Day tabs - these filter the map as well as the list */}
            <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-2">
              {Array.from({ length: totalDays }).map((_, idx) => {
                const dayNum = idx + 1;
                const active = selectedDay === dayNum;
                const hasAlert = (reality?.alerts ?? []).some(
                  (a) => a.affected_trip_day === dayNum && a.severity !== "INFO"
                );

                return (
                  <button
                    key={dayNum}
                    onClick={() => setSelectedDay(dayNum)}
                    className={`relative min-w-[84px] rounded-full px-5 py-2.5 text-xs font-semibold transition ${
                      active
                        ? "bg-[#171717] text-white"
                        : "bg-white text-[#6b6b66] hover:bg-[#eae9e4]"
                    }`}
                  >
                    Day {dayNum}
                    {hasAlert && (
                      <span
                        className="absolute right-3 top-2 h-1.5 w-1.5 rounded-full bg-[#d97745]"
                        aria-label="Has a travel update"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Alerts for this day */}
            {dayAlerts.length > 0 && (
              <div id="day-updates" className="mt-5 scroll-mt-24 space-y-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8f88]">
                  Updates affecting Day {selectedDay}
                </h3>
                {dayAlerts.map((alert) => (
                  <TravelUpdateCard
                    key={alert.id}
                    alert={alert}
                    itinerary={itinerary}
                    destination={destinationName}
                    onConfirmed={handleConfirmed}
                  />
                ))}
              </div>
            )}

            {/* The stops */}
            <div className="mt-4">
              {currentDayData?.activities?.length ? (
                currentDayData.activities.map((act: ActivityItem, index) => {
                  const name = act.name || act.place_name || "";
                  return (
                    <ItineraryCard
                      key={`${selectedDay}-${name}-${index}`}
                      activity={act}
                      dayNumber={selectedDay}
                      isFirst={index === 0}
                      realisticTransitMinutes={
                        realisticByPlace.get(name) ?? null
                      }
                      weatherSuitability={
                        (dayForecast?.outdoor_suitability as RealityStatus) ??
                        null
                      }
                      weatherNote={dayForecast?.advice?.[0] ?? null}
                      alerts={alertsByPlace.get(name) ?? []}
                    />
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-gray-500">
                  No activities scheduled for Day {selectedDay}.
                </div>
              )}
            </div>

            {aiInsights?.insider_tips?.length ? (
              <div className="mt-8 rounded-2xl border border-black/5 bg-[#f5f3ee] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8f88]">
                  Local tips
                </p>
                <ul className="mt-2.5 space-y-1.5">
                  {aiInsights.insider_tips.map((tip, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs leading-relaxed text-[#55554f]"
                    >
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#d97745]" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
                {!aiInsights.ai_powered && (
                  <p className="mt-2.5 text-[10px] text-[#8f8f88]">
                    General guidance — the AI service was unavailable when this
                    was generated.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {/* Right: map, filtered to the selected day */}
          <aside className="lg:sticky lg:top-[96px] lg:h-[calc(100vh-120px)]">
            <div className="h-full min-h-[520px] overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-md">
              <TripMap
                destination={destinationName}
                selectedDay={selectedDay}
                customLocations={mapLocations}
              />
            </div>
          </aside>
        </div>
      </section>

      {/* --------------------------- Stays -------------------------------- */}
      {data?.hotels?.length ? (
        <section className="border-t border-black/5 bg-white py-14">
          <div className="mx-auto w-full max-w-[1400px] px-5 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d97745]">
                  Stays
                </span>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
                  Where to stay in {destinationName}
                </h2>
                <p className="mt-1 text-xs text-[#6b6b66]">
                  Indicative rates, not live booking quotes. See the Reality
                  Check for distance from your stops.
                </p>
              </div>
              <Link
                href="/reality#hotel_reality"
                className="text-xs font-semibold text-[#d97745] hover:underline"
              >
                Accommodation reality →
              </Link>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {data.hotels.map((hotel) => (
                <HotelCard key={hotel.id || hotel.name} hotel={hotel} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* --------------------------- Budget ------------------------------- */}
      {budgetBreakdown && (
        <section className="bg-[#fbfbfa] py-14">
          <div className="mx-auto w-full max-w-[1400px] px-5 md:px-8">
            <BudgetCard
              budget={budgetBreakdown}
              days={totalDays}
              travelers={data?.number_of_travelers || tripConfig?.travelers || 2}
            />
            <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4">
              <p className="text-xs text-[#6b6b66]">
                This is your budget split by category. For a bottom-up estimate
                of what the plan will actually cost — with every figure labelled
                — see{" "}
                <Link
                  href="/reality#cost_reality"
                  className="font-semibold text-[#8a5a3b] hover:underline"
                >
                  Cost Reality
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      )}

      <AIChat
        tripContext={{
          destination: destinationName,
          days: totalDays,
          budget: data?.total_budget || tripConfig?.budget || 25000,
          interests: data?.interests || tripConfig?.interests,
        }}
        itinerary={itinerary}
        reality={reality}
      />

      <Footer />
    </div>
  );
}

function LoadingShell({ destination }: { destination: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#fbfbfa]">
      <Navbar />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-10 md:px-8">
        <div className="h-[420px] animate-pulse rounded-[28px] bg-neutral-100" />
        <p className="mt-6 text-sm text-[#6b6b66]">
          Building your {destination} itinerary — scoring attractions and
          optimising the route between them.
        </p>
        <div className="mt-6 space-y-3">
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
      </main>
      <Footer />
    </div>
  );
}
