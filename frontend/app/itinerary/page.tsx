"use client";

/**
 * The itinerary.
 *
 * The map is now a co-equal half of the screen rather than a small fixed side
 * panel, and it is the SHARED canvas from the map store - selecting a day moves
 * the map, clicking a marker scrolls the list, and both are the same state
 * change rather than two systems kept in sync.
 *
 * Loading is still staged: the plan renders first, then reality fills in behind
 * it, so the itinerary is never held up by an API it does not depend on.
 */

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import AssistantPanel from "../../components/assistant/AssistantPanel";
import DayRail from "../../components/itinerary/DayRail";
import Footer from "../../components/Footer";
import ItineraryCard from "../../components/ItineraryCard";
import MapCanvas from "../../components/map/MapCanvas";
import MarkerPreview from "../../components/map/MarkerPreview";
import Navbar from "../../components/Navbar";
import AirportTransferCard from "../../components/planner/AirportTransferCard";
import BudgetOptimizer from "../../components/planner/BudgetOptimizer";
import DayTimeline from "../../components/planner/DayTimeline";
import FlightOptions from "../../components/planner/FlightOptions";
import VehicleCostCard from "../../components/planner/VehicleCostCard";
import TravelUpdateCard from "../../components/reality/TravelUpdateCard";
import {
  BriefingSkeleton,
  Button,
  Meta,
  MetaDot,
  Skeleton,
  StatusMark,
  relativeTime,
} from "../../components/ui/Primitives";
import {
  fitViewport,
  toMarkerCategory,
  useMapState,
  type MapMarker,
} from "../../lib/mapStore";
import {
  ItineraryDay,
  ItineraryResponse,
  fetchRealityCheck,
  fetchTripPlan,
  generateItinerary,
} from "../../lib/api";
import type { RealityStatus, TravelAlert, TravelReality } from "../../types/reality";
import type { TripPlanResponse, VehicleConfig } from "../../types/planner";

const STORAGE_KEY = "smartTourismTrip";
const ITINERARY_KEY = "aiTourismItinerary";

const DEFAULT_TRIP = {
  destination: "Hyderabad",
  days: 4,
  travelers: 2,
  budget: 25000,
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
  const {
    state: mapState,
    setDestination,
    setMarkers,
    setViewport,
    setActiveDay,
    selectMarker,
    hoverMarker,
  } = useMapState();

  const [tripConfig, setTripConfig] = useState<any>(null);
  const [data, setData] = useState<ItineraryResponse | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [reality, setReality] = useState<TravelReality | null>(null);
  const [loadingReality, setLoadingReality] = useState(false);

  const [tripPlan, setTripPlan] = useState<TripPlanResponse | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [selectedOutboundFlightId, setSelectedOutboundFlightId] = useState<string | null>(null);
  const [selectedReturnFlightId, setSelectedReturnFlightId] = useState<string | null>(null);

  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const stopRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectedDay = mapState.activeDay ?? 1;

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
    setDestination(parsedTrip.destination || "Hyderabad");

    const dayParam = Number(searchParams.get("day"));
    setActiveDay(dayParam > 0 ? dayParam : 1);

    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await generateItinerary({
          destination: parsedTrip.destination || "Hyderabad",
          number_of_days: Number(parsedTrip.days || parsedTrip.number_of_days || 4),
          total_budget: Number(parsedTrip.budget || parsedTrip.total_budget || 25000),
          number_of_travelers: Number(
            parsedTrip.travelers || parsedTrip.number_of_travelers || 2
          ),
          interests: parsedTrip.interests || ["Food", "Culture"],
          transport_preference: parsedTrip.transport || "Any",
          accommodation_preference: parsedTrip.hotel || "Comfort",
        });
        setData(res);
        setItinerary(res.itinerary ?? []);
      } catch {
        setErrorMsg(
          "We couldn't reach the planning service. Check that the backend is running, then try again."
        );
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------- Gather reality separately --------------------- */
  const loadReality = useCallback(
    async (plan: ItineraryDay[], trip: any) => {
      if (!trip || plan.length === 0) return;
      setLoadingReality(true);
      const result = await fetchRealityCheck({
        destination: trip.destination || "Hyderabad",
        number_of_days: Number(trip.days || trip.number_of_days || 4),
        total_budget: Number(trip.budget || trip.total_budget || 25000),
        number_of_travelers: Number(trip.travelers || trip.number_of_travelers || 2),
        interests: trip.interests || DEFAULT_TRIP.interests,
        accommodation_preference: trip.hotel || "Comfort",
        start_date: trip.start_date || undefined,
        origin: trip.origin || undefined,
        itinerary: plan,
      });
      if (result) setReality(result);
      setLoadingReality(false);
    },
    []
  );

  useEffect(() => {
    if (loading || itinerary.length === 0 || !tripConfig) return;
    loadReality(itinerary, tripConfig);
  }, [loading, itinerary, tripConfig, loadReality]);

  /* --------------- The connected plan: flights, transfer, budget -------- */
  const loadPlan = useCallback(async (trip: any) => {
    if (!trip) return;
    setLoadingPlan(true);
    const transportPref: string = trip.transport || "Any";
    const wantsVehicle = ["car", "bike"].includes(transportPref.trim().toLowerCase());
    const vehicle: VehicleConfig | null = wantsVehicle
      ? {
          vehicle_type: transportPref.trim().toLowerCase() as "car" | "bike",
          ownership: trip.vehicle_ownership === "rental" ? "rental" : "personal",
          fuel_type: trip.vehicle_fuel_type || "petrol",
          mileage_kmpl: trip.vehicle_mileage ? Number(trip.vehicle_mileage) : undefined,
          fuel_price_per_liter: trip.vehicle_fuel_price ? Number(trip.vehicle_fuel_price) : undefined,
          rental_cost_per_day: trip.vehicle_rental_cost ? Number(trip.vehicle_rental_cost) : undefined,
        }
      : null;

    const result = await fetchTripPlan({
      destination: trip.destination || "Hyderabad",
      origin: trip.origin || undefined,
      number_of_days: Number(trip.days || trip.number_of_days || 4),
      total_budget: Number(trip.budget || trip.total_budget || 25000),
      number_of_travelers: Number(trip.travelers || trip.number_of_travelers || 2),
      interests: trip.interests || DEFAULT_TRIP.interests,
      transport_preference: transportPref,
      accommodation_preference: trip.hotel || "Comfort",
      start_date: trip.start_date || undefined,
      selected_flight_id: selectedOutboundFlightId,
      selected_return_flight_id: selectedReturnFlightId,
      vehicle,
    });
    if (result) setTripPlan(result);
    setLoadingPlan(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOutboundFlightId, selectedReturnFlightId]);

  useEffect(() => {
    if (loading || !tripConfig) return;
    loadPlan(tripConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, tripConfig, loadPlan]);

  useEffect(() => {
    if (itinerary.length === 0 || !tripConfig) return;
    try {
      sessionStorage.setItem(
        ITINERARY_KEY,
        JSON.stringify({ destination: tripConfig.destination, itinerary })
      );
    } catch {
      /* storage unavailable is not fatal */
    }
  }, [itinerary, tripConfig]);

  /* --------------------------- Derived state --------------------------- */
  const destinationName =
    data?.destination || tripConfig?.destination || "Hyderabad";

  const currentPlanDay = useMemo(
    () => tripPlan?.itinerary.find((d) => d.day === selectedDay) ?? null,
    [tripPlan, selectedDay]
  );
  const isFirstDay = selectedDay === 1;
  const isLastDay = selectedDay === itinerary.length;

  const currentDay = useMemo(
    () => itinerary.find((d) => d.day === selectedDay) ?? itinerary[0] ?? null,
    [itinerary, selectedDay]
  );

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

  const alertDays = useMemo(
    () =>
      Array.from(
        new Set(
          (reality?.alerts ?? [])
            .filter((a) => a.affected_trip_day && a.severity !== "INFO")
            .map((a) => a.affected_trip_day as number)
        )
      ),
    [reality]
  );

  const weatherSection = reality?.sections.find((s) => s.key === "weather");
  const trafficSection = reality?.sections.find((s) => s.key === "traffic");

  const dayForecast = useMemo(() => {
    const forecast: any[] = weatherSection?.details?.forecast ?? [];
    return forecast.find((f) => f.trip_day === selectedDay) ?? null;
  }, [weatherSection, selectedDay]);

  const realisticMinutesByDay = useMemo(() => {
    const out: Record<number, number> = {};
    ((trafficSection?.details?.days as any[]) ?? []).forEach((d) => {
      out[d.day] = d.realistic_minutes;
    });
    return out;
  }, [trafficSection]);

  const dayTraffic = useMemo(() => {
    const days: any[] = trafficSection?.details?.days ?? [];
    return days.find((d) => d.day === selectedDay) ?? null;
  }, [trafficSection, selectedDay]);

  const realisticByPlace = useMemo(() => {
    const out = new Map<string, number>();
    (dayTraffic?.legs ?? []).forEach((leg: any) => {
      if (leg.to_place) out.set(leg.to_place, leg.realistic_minutes);
    });
    return out;
  }, [dayTraffic]);

  const alertsByPlace = useMemo(() => {
    const out = new Map<string, TravelAlert[]>();
    dayAlerts.forEach((alert) => {
      [alert.affected_place, ...(alert.also_affected ?? [])].forEach((name) => {
        if (!name) return;
        out.set(name, [...(out.get(name) ?? []), alert]);
      });
    });
    return out;
  }, [dayAlerts]);

  /* ------------------ Publish markers to the shared map ---------------- */
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
          duration: act.duration,
          affected: Boolean(stopAlerts?.length),
          affectedReason: stopAlerts?.[0]?.impact ?? undefined,
          isPlaceholder: Boolean((act as any).is_placeholder),
        });
      });
    });

    (data?.hotels ?? []).forEach((hotel, index) => {
      if (hotel.latitude == null || hotel.longitude == null) return;
      markers.push({
        id: `hotel-${index}`,
        name: hotel.name,
        category: "hotel",
        lat: hotel.latitude,
        lng: hotel.longitude,
        image: hotel.image,
        rating: hotel.rating,
        cost: hotel.price_per_night,
        description: hotel.description,
      });
    });

    setMarkers(markers);
  }, [itinerary, data?.hotels, alertsByPlace, setMarkers]);

  /* Frame the map on the active day's stops whenever the day changes. */
  useEffect(() => {
    if (!currentDay) return;
    const points = currentDay.activities
      .filter((a) => a.latitude != null && a.longitude != null)
      .map((a) => ({ lat: a.latitude as number, lng: a.longitude as number }));
    if (points.length === 0) return;
    setViewport(fitViewport(points));
  }, [currentDay, setViewport]);

  /* Map → UI: selecting a marker scrolls its stop into view. */
  useEffect(() => {
    if (!mapState.selectedMarkerId) return;
    const node = stopRefs.current[mapState.selectedMarkerId];
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [mapState.selectedMarkerId]);

  const handleConfirmed = useCallback(
    (updated: ItineraryDay[]) => {
      setItinerary(updated);
      loadReality(updated, tripConfig);
    },
    [tripConfig, loadReality]
  );

  /* ------------------------------ Render ------------------------------- */
  if (loading) return <LoadingShell destination={destinationName} />;

  if (errorMsg && !data) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <h2 className="t-headline">We couldn&apos;t build your itinerary</h2>
          <p className="t-body mt-2 max-w-md">{errorMsg}</p>
          <Link href="/planner" className="mt-5">
            <Button>Back to planner</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* ---------------------------- Trip header --------------------------- */}
      <header className="border-b border-[rgba(0,0,0,0.08)] bg-white">
        <div className="mx-auto w-full max-w-[1600px] px-5 py-6 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="t-label text-[#8a5a3b]">Your itinerary</p>
              <h1 className="t-headline mt-1.5">{destinationName}</h1>
              <div className="mt-2 flex flex-wrap items-center">
                <Meta>{itinerary.length} days</Meta>
                <MetaDot />
                <Meta>
                  {data?.number_of_travelers || tripConfig?.travelers || 2} travellers
                </Meta>
                <MetaDot />
                <Meta>
                  ₹
                  {(data?.total_budget || tripConfig?.budget || 25000).toLocaleString(
                    "en-IN"
                  )}
                </Meta>
                <MetaDot />
                <Meta>
                  {data?.accommodation_preference || tripConfig?.hotel || "Comfort"} stay
                </Meta>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {loadingReality && !reality ? (
                <Skeleton className="h-8 w-40" />
              ) : reality ? (
                <Link
                  href="/reality"
                  className="flex items-center gap-2.5 rounded-full border border-[rgba(0,0,0,0.12)] px-3.5 py-2 transition hover:bg-[#f5f3ee]"
                >
                  <span className="t-label">Readiness</span>
                  <StatusMark status={reality.overall_status} />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------ Content + map split ----------------------- */}
      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:flex-row">
        {/* Left: the plan */}
        <div className="min-w-0 flex-1 px-5 py-6 md:px-8 lg:w-1/2 lg:max-w-[760px]">
          {/* Trip-wide alerts (cost, city-wide news) */}
          {tripWideAlerts.length > 0 && (
            <section className="mb-6 space-y-2">
              {tripWideAlerts.map((alert) => (
                <TravelUpdateCard
                  key={alert.id}
                  alert={alert}
                  itinerary={itinerary}
                  destination={destinationName}
                  onConfirmed={handleConfirmed}
                />
              ))}
            </section>
          )}

          {/* Flights — only once we know where the traveller is starting from */}
          {tripPlan && !tripPlan.flights.requires_origin && (
            <section className="mb-6 space-y-4 border-b border-[rgba(0,0,0,0.08)] pb-6">
              <p className="t-label text-[#8a5a3b]">Flights</p>
              <FlightOptions
                title="Outbound"
                result={tripPlan.flights.outbound}
                selectedId={tripPlan.flights.selected_outbound_id}
                onSelect={setSelectedOutboundFlightId}
              />
              <FlightOptions
                title="Return"
                result={tripPlan.flights.return}
                selectedId={tripPlan.flights.selected_return_id}
                onSelect={setSelectedReturnFlightId}
              />
              {tripPlan.airport_transfer.outbound?.available && (
                <AirportTransferCard title="Airport → hotel" plan={tripPlan.airport_transfer.outbound} />
              )}
              {tripPlan.airport_transfer.return?.available && (
                <AirportTransferCard title="Hotel → airport (return)" plan={tripPlan.airport_transfer.return} />
              )}
            </section>
          )}

          {/* Car / bike cost, when self-driving */}
          {tripPlan?.vehicle_cost && (
            <section className="mb-6 border-b border-[rgba(0,0,0,0.08)] pb-6">
              <p className="t-label mb-3 text-[#8a5a3b]">Transport cost</p>
              <VehicleCostCard cost={tripPlan.vehicle_cost} />
            </section>
          )}

          {/* Budget & cost optimization */}
          {tripPlan?.budget && (
            <section className="mb-6 border-b border-[rgba(0,0,0,0.08)] pb-6">
              <BudgetOptimizer budget={tripPlan.budget} />
            </section>
          )}
          {loadingPlan && !tripPlan && (
            <div className="mb-6">
              <BriefingSkeleton title="Building your full trip plan" />
            </div>
          )}

          <DayRail
            days={itinerary}
            activeDay={selectedDay}
            alertDays={alertDays}
            realisticMinutesByDay={realisticMinutesByDay}
            onSelectDay={(day) => setActiveDay(day)}
          />

          {/* Day heading */}
          <div className="mt-6 border-b border-[rgba(0,0,0,0.08)] pb-4">
            <h2 className="t-title">{currentDay?.title ?? `Day ${selectedDay}`}</h2>
            <div className="mt-1.5 flex flex-wrap items-center">
              <Meta>
                {currentDay?.total_transit_km ?? 0} km · {currentDay?.estimated_transit_minutes ?? 0} min planned
              </Meta>
              {dayTraffic && dayTraffic.added_minutes > 0 && (
                <>
                  <MetaDot />
                  <Meta className="text-amber-700">
                    ~{dayTraffic.added_minutes} min more in traffic
                  </Meta>
                </>
              )}
              {dayForecast && (
                <>
                  <MetaDot />
                  <Meta>{dayForecast.condition}</Meta>
                </>
              )}
            </div>
          </div>

          {/* Realistic clock-time schedule for the day, including flight/transfer/checkin buffers */}
          {currentPlanDay?.timeline && currentPlanDay.timeline.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[rgba(0,0,0,0.07)] bg-[#faf9f7] p-4">
              <p className="t-label mb-3">
                {isFirstDay ? "Arrival day schedule" : isLastDay ? "Departure day schedule" : "Today's schedule"}
              </p>
              <DayTimeline blocks={currentPlanDay.timeline} />
            </div>
          )}

          {/* Alerts for this day — one component, one visual language */}
          {dayAlerts.length > 0 && (
            <section className="mt-4 space-y-2">
              {dayAlerts.map((alert) => (
                <TravelUpdateCard
                  key={alert.id}
                  alert={alert}
                  itinerary={itinerary}
                  destination={destinationName}
                  onConfirmed={handleConfirmed}
                />
              ))}
            </section>
          )}

          {/* Stops */}
          <div className="mt-4">
            {currentDay?.activities?.length ? (
              currentDay.activities.map((act, index) => {
                const name = act.name || act.place_name || "";
                const markerId = `stop-${selectedDay}-${index}`;
                return (
                  <div
                    key={markerId}
                    ref={(node) => {
                      stopRefs.current[markerId] = node;
                    }}
                  >
                    <ItineraryCard
                      activity={act}
                      dayNumber={selectedDay}
                      isFirst={index === 0}
                      realisticTransitMinutes={realisticByPlace.get(name) ?? null}
                      weatherSuitability={
                        (dayForecast?.outdoor_suitability as RealityStatus) ?? null
                      }
                      weatherNote={dayForecast?.advice?.[0] ?? null}
                      alerts={alertsByPlace.get(name) ?? []}
                      isSelected={mapState.selectedMarkerId === markerId}
                      onSelect={() => selectMarker(markerId)}
                      onHover={(hovering) =>
                        hoverMarker(hovering ? markerId : null)
                      }
                    />
                  </div>
                );
              })
            ) : (
              <p className="t-body py-10 text-center">
                No stops scheduled for Day {selectedDay}.
              </p>
            )}
          </div>

          {loadingReality && !reality && (
            <div className="mt-6">
              <BriefingSkeleton title="Checking conditions" />
            </div>
          )}

          <div className="mt-8 border-t border-[rgba(0,0,0,0.08)] pt-5">
            <Link href="/reality" className="t-body font-semibold text-[#8a5a3b] hover:underline">
              See the full Reality Check →
            </Link>
            {reality && (
              <p className="t-caption mt-1">
                Conditions checked {relativeTime(reality.last_updated)}
              </p>
            )}
          </div>
        </div>

        {/* Right: the shared map — co-equal, sticky, full height */}
        <aside className="relative hidden lg:block lg:w-1/2">
          <div className="sticky top-[72px] h-[calc(100vh-72px)]">
            <MapCanvas />
            <MarkerPreview />
          </div>
        </aside>
      </main>

      {/* Mobile: map as a full-screen mode, not a squeezed panel */}
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
          destination: destinationName,
          days: itinerary.length,
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
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:flex-row">
        <div className="min-w-0 flex-1 px-5 py-8 md:px-8 lg:w-1/2 lg:max-w-[760px]">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-9 w-2/3" />
          <p className="t-body mt-4">
            Building your {destination} itinerary — scoring attractions and
            optimising the route between them.
          </p>
          <div className="mt-6 flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[92px] w-[124px] rounded-xl" />
            ))}
          </div>
          <div className="mt-6 space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-[104px] w-[132px] rounded-xl" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <aside className="hidden lg:block lg:w-1/2">
          <div className="sticky top-[72px] h-[calc(100vh-72px)] bg-[#eeece7]" />
        </aside>
      </main>
    </div>
  );
}
