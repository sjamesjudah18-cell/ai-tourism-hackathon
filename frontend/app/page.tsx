"use client";

/**
 * Home — the map IS the hero.
 *
 * Second pass. The first redesign put the map in a hero column beside copy;
 * this one removes the column. The map fills the viewport, the navbar floats
 * over it, and a single search cluster sits on top of the scene rather than
 * above it. Selecting a destination flies the shared canvas and reveals a
 * compact, honest preview - no fabricated weather or numbers we don't have -
 * built from data the app actually fetched for it.
 *
 * Below the fold, the provenance explainer and featured strip from the first
 * pass are kept (they were already the substance of the page) but recoloured
 * to the new dark system rather than removed.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "../components/Footer";
import MapCanvas from "../components/map/MapCanvas";
import Navbar from "../components/Navbar";
import { ProvenanceBadge } from "../components/ui/Primitives";
import { fetchDestinations, fetchPlaces, type DestinationRow, type PlaceRow } from "../lib/api";
import {
  fitViewport,
  toMarkerCategory,
  useMapState,
  type MapMarker,
  type MarkerCategory,
} from "../lib/mapStore";

const QUICK_PICKS = ["Goa", "Hyderabad", "Jaipur", "Mumbai"];

type FilterKey = "for-you" | "experiences" | "food" | "stays" | "places";

const FILTERS: { key: FilterKey; label: string; categories: MarkerCategory[] }[] = [
  { key: "for-you", label: "For you", categories: [] },
  { key: "experiences", label: "Experiences", categories: ["activity", "culture"] },
  { key: "food", label: "Food", categories: ["food"] },
  { key: "stays", label: "Stays", categories: ["hotel"] },
  { key: "places", label: "Places", categories: ["place", "beach"] },
];

const FEATURED = [
  {
    name: "Hyderabad",
    state: "Telangana",
    tag: "Heritage, biryani and the Old City",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Charminar_12032013.jpg/960px-Charminar_12032013.jpg",
    days: "4",
    budget: "25000",
    interests: ["Food", "Culture", "Adventure"],
    hotel: "Comfort",
  },
  {
    name: "Goa",
    state: "Goa",
    tag: "Coastline, Latin Quarter and seafood",
    image:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=900&q=80",
    days: "3",
    budget: "20000",
    interests: ["Beaches", "Food", "Adventure"],
    hotel: "Comfort",
  },
  {
    name: "Jaipur",
    state: "Rajasthan",
    tag: "Forts, bazaars and Rajasthani cooking",
    image:
      "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=900&q=80",
    days: "3",
    budget: "18000",
    interests: ["History", "Culture", "Shopping"],
    hotel: "Budget",
  },
  {
    name: "Mumbai",
    state: "Maharashtra",
    tag: "Sea Link, Marine Drive and Colaba",
    image:
      "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=900&q=80",
    days: "3",
    budget: "22000",
    interests: ["Culture", "Food", "History"],
    hotel: "Comfort",
  },
];

const PROVENANCE_COLUMNS = [
  {
    label: "LIVE" as const,
    title: "Fetched now",
    body: "Weather, forecast, air quality and sea conditions from Open-Meteo. Local disruption reports from published news sources, linked so you can read them yourself.",
  },
  {
    label: "ESTIMATE" as const,
    title: "Worked out by us",
    body: "Realistic travel time modelled from distance, time of day and city size. We have no live traffic feed, and we never pretend otherwise.",
  },
  {
    label: "APPROXIMATE" as const,
    title: "Ranges, not quotes",
    body: "Costs are given as ranges across stay, food, transport, attractions and a buffer — never as a guaranteed price.",
  },
  {
    label: "UNAVAILABLE" as const,
    title: "When we don't know",
    body: "If a source is down or the data doesn't exist, we say so. An honest gap is more useful than a confident guess.",
  },
];

export default function Home() {
  const router = useRouter();
  const {
    setDestination: setMapDestination,
    setMarkers,
    setViewport,
    setCategories,
  } = useMapState();

  const [searchQuery, setSearchQuery] = useState("");
  const [destinations, setDestinations] = useState<DestinationRow[]>([]);
  const [activeDestination, setActiveDestination] = useState<DestinationRow | null>(null);
  const [activePlaces, setActivePlaces] = useState<PlaceRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("for-you");

  useEffect(() => {
    (async () => {
      const rows = await fetchDestinations();
      if (rows) setDestinations(rows);
    })();
  }, []);

  /** Live map response as soon as a real destination is recognised. */
  const previewDestination = useCallback(
    async (name: string) => {
      const match = destinations.find(
        (d) => d.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (!match) {
        setActiveDestination(null);
        setActivePlaces([]);
        return;
      }

      setActiveDestination(match);
      setMapDestination(match.name);
      if (match.latitude != null && match.longitude != null) {
        setViewport({ lat: match.latitude, lng: match.longitude, zoom: 11 });
      }

      const places = await fetchPlaces(match.id);
      if (!places) return;
      setActivePlaces(places);

      const markers: MapMarker[] = places
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((place) => ({
          id: `home-preview-${place.id}`,
          name: place.name,
          category: toMarkerCategory(place.category),
          lat: place.latitude as number,
          lng: place.longitude as number,
          rating: place.rating ?? undefined,
        }));
      setMarkers(markers);
      if (markers.length > 0) setViewport(fitViewport(markers));
    },
    [destinations, setMapDestination, setMarkers, setViewport]
  );

  // Preview the default destination as soon as the list resolves, so the map
  // is never empty on first paint.
  useEffect(() => {
    if (destinations.length > 0) previewDestination("Hyderabad");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinations]);

  function applyFilter(filter: (typeof FILTERS)[number]) {
    setActiveFilter(filter.key);
    setCategories(filter.categories);
  }

  const tripPayload = useCallback(
    (preset?: (typeof FEATURED)[number]) =>
      preset
        ? {
            destination: preset.name,
            days: Number(preset.days),
            number_of_days: Number(preset.days),
            travelers: 2,
            number_of_travelers: 2,
            budget: Number(preset.budget),
            total_budget: Number(preset.budget),
            interests: preset.interests,
            transport: "Any",
            hotel: preset.hotel,
          }
        : {
            destination: (activeDestination?.name || searchQuery).trim() || "Hyderabad",
            days: 4,
            number_of_days: 4,
            travelers: 2,
            number_of_travelers: 2,
            budget: 25000,
            total_budget: 25000,
            interests: ["Food", "Culture", "Adventure"],
            transport: "Any",
            hotel: "Comfort",
          },
    [activeDestination, searchQuery]
  );

  const handleQuickPlan = useCallback(
    (preset?: (typeof FEATURED)[number]) => {
      sessionStorage.setItem("smartTourismTrip", JSON.stringify(tripPayload(preset)));
      router.push("/planner");
    },
    [tripPayload, router]
  );

  const handleRealityCheck = useCallback(() => {
    sessionStorage.setItem("smartTourismTrip", JSON.stringify(tripPayload()));
    router.push("/reality");
  }, [tripPayload, router]);

  /** Real "good for" tags — drawn from the places we actually fetched, not invented. */
  const goodFor = useMemo(() => {
    const seen = new Set<string>();
    for (const place of activePlaces) {
      const label = (place.category || "").trim();
      if (label) seen.add(label[0].toUpperCase() + label.slice(1).toLowerCase());
      if (seen.size >= 4) break;
    }
    return Array.from(seen);
  }, [activePlaces]);

  const heroDestinationLabel = useMemo(
    () => searchQuery.trim() || activeDestination?.name || "Hyderabad",
    [searchQuery, activeDestination]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0d0f]">
      {/* ============================== Hero ============================== */}
      <section className="relative h-[100svh] w-full overflow-hidden">
        <div className="animate-hero-map absolute inset-0">
          <MapCanvas showCategoryFilter={false} />
        </div>

        {/* Cinematic vignette — keeps chrome legible without boxing the map */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/5 to-black/65" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/10" />
        {/* Soft spotlight behind the command cluster — the map's own labels and
            markers cluster near the centre too, so text needs a quiet backdrop
            wherever the destination happens to place them. */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[min(90vw,780px)] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(6,7,9,0.62) 0%, rgba(6,7,9,0.34) 45%, rgba(6,7,9,0) 72%)",
          }}
        />

        <div className="relative z-10 flex h-full flex-col">
          <Navbar transparent />

          {/* Command cluster */}
          <div className="flex flex-1 flex-col items-center justify-center px-5">
            <div
              className="animate-hero-in w-full max-w-xl text-center"
              style={{ ["--d" as string]: "150ms" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
                Travel Reality Intelligence
              </p>
              <h1
                className="mt-3 text-[28px] leading-tight text-white sm:text-[34px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Where do you want to go?
              </h1>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleQuickPlan();
                }}
                className="mt-6 flex flex-col gap-2 rounded-2xl border border-white/12 bg-[#15191d]/85 p-2 shadow-2xl backdrop-blur-xl sm:flex-row"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim()) previewDestination(e.target.value);
                  }}
                  placeholder="Search destinations, places, hotels…"
                  className="flex-1 rounded-xl bg-transparent px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/40"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e0935f] px-5 py-3 text-[13px] font-semibold text-[#171009] transition hover:bg-[#eba46f]"
                >
                  Plan my trip →
                </button>
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-1 gap-y-1.5">
                {QUICK_PICKS.map((preset, i) => (
                  <span key={preset} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery(preset);
                        previewDestination(preset);
                      }}
                      className={`px-2 text-[12px] font-medium transition ${
                        heroDestinationLabel.toLowerCase() === preset.toLowerCase()
                          ? "text-white"
                          : "text-white/55 hover:text-white"
                      }`}
                    >
                      {preset}
                    </button>
                    {i < QUICK_PICKS.length - 1 && (
                      <span className="text-white/25">·</span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Filter row — quiet text controls, not a wall of pills */}
            <div
              className="animate-hero-in mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
              style={{ ["--d" as string]: "280ms" }}
            >
              {FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => applyFilter(filter)}
                  className={`relative pb-1 text-[13px] font-medium transition ${
                    activeFilter === filter.key
                      ? "text-white"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {filter.label}
                  {activeFilter === filter.key && (
                    <span className="absolute inset-x-0 -bottom-0.5 h-px bg-[#e0935f]" />
                  )}
                </button>
              ))}
              <button
                onClick={handleRealityCheck}
                className="pb-1 text-[13px] font-medium text-white/50 transition hover:text-white/80"
              >
                Reality
              </button>
            </div>
          </div>

          {/* Destination preview — appears once a real destination resolves */}
          {activeDestination && (
            <div
              className="animate-hero-in relative z-10 mx-auto mb-6 w-[calc(100%-2.5rem)] max-w-sm sm:absolute sm:bottom-8 sm:left-8 sm:mx-0 sm:mb-0 sm:w-[320px]"
              style={{ ["--d" as string]: "420ms" }}
            >
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#12151a]/90 shadow-2xl backdrop-blur-xl">
                <div className="flex items-start justify-between gap-3 px-4 pt-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                      {activeDestination.country}
                      {activeDestination.state ? ` · ${activeDestination.state}` : ""}
                    </p>
                    <h2
                      className="mt-0.5 truncate text-[22px] text-white"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {activeDestination.name}
                    </h2>
                  </div>
                </div>

                {goodFor.length > 0 && (
                  <p className="mt-2 px-4 text-[12px] text-white/55">
                    Good for {goodFor.join(" · ")}
                  </p>
                )}

                {activeDestination.description && (
                  <p className="mt-2 line-clamp-2 px-4 text-[13px] leading-relaxed text-white/70">
                    {activeDestination.description}
                  </p>
                )}

                <div className="mt-4 flex gap-2 border-t border-white/8 px-4 py-3.5">
                  <button
                    onClick={() => handleQuickPlan()}
                    className="flex-1 rounded-full bg-[#e0935f] px-4 py-2 text-[12px] font-semibold text-[#171009] transition hover:bg-[#eba46f]"
                  >
                    Explore {activeDestination.name}
                  </button>
                  <button
                    onClick={handleRealityCheck}
                    className="rounded-full border border-white/15 px-3.5 py-2 text-[12px] font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    Reality Check
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* --------------------- What we actually check --------------------- */}
      <section className="bg-[#101316] py-16">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e0935f]">
                What we actually check
              </p>
              <h2
                className="mt-2 text-[26px] text-white sm:text-[32px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Every figure is labelled by where it came from.
              </h2>
            </div>
            <Link
              href="/reality"
              className="text-[13px] font-semibold text-white/80 hover:text-white hover:underline"
            >
              See a Reality Check →
            </Link>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PROVENANCE_COLUMNS.map((column) => (
              <div key={column.label}>
                <ProvenanceBadge label={column.label} />
                <h3 className="mt-3 text-[17px] text-white">{column.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#9b9a93]">
                  {column.body}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-3xl border-t border-white/10 pt-6 text-[13px] leading-relaxed text-[#8f8e88]">
            When conditions affect a stop on your plan, we tell you what
            happened, why it matters and the likely impact — then you choose.
            Keep your plan, or see alternatives. Nothing changes until you
            confirm it.
          </p>
        </div>
      </section>

      {/* -------------------------- Featured trips -------------------------- */}
      <section className="border-t border-white/8 bg-[#0b0d0f] py-16">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e0935f]">
                Featured trips
              </p>
              <h2
                className="mt-2 text-[26px] text-white sm:text-[32px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Start from somewhere real
              </h2>
            </div>
            <Link
              href="/planner"
              className="text-[13px] font-semibold text-white/80 hover:text-white hover:underline"
            >
              Plan something else →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED.map((trip) => (
              <button
                key={trip.name}
                onClick={() => handleQuickPlan(trip)}
                className="group overflow-hidden rounded-2xl bg-[#12151a] text-left transition hover:bg-[#171b21]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#1b2025]">
                  <img
                    src={trip.image}
                    alt={trip.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                    {trip.days} days
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#e0935f]">
                    {trip.state}
                  </p>
                  <h3 className="mt-1 text-[17px] text-white transition group-hover:text-[#eba46f]">
                    {trip.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[13px] text-[#9b9a93]">{trip.tag}</p>
                  <p className="mt-2.5 text-[12px] tabular-nums text-[#6f6e68]">
                    ₹{Number(trip.budget).toLocaleString("en-IN")} estimated
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
