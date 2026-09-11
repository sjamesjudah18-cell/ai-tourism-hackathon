"use client";

/**
 * Home.
 *
 * The previous version was a textbook centered-hero template — pill badge,
 * centered H1, centered search bar, text links below — with no map presence
 * despite the map being the product's core interaction, and an emoji-icon
 * feature grid that read as a generic dashboard rather than a travel product.
 *
 * The map is now IN the hero, driven by the same shared store every other page
 * reads from: typing or picking a destination flies it there live, so the
 * first thing a visitor does is point at a place rather than read about one.
 * The honest four-column provenance section is kept — it was already the
 * strongest part of the page — just given room to breathe. The emoji-card
 * feature grid and the "Smart India Hackathon 2026" CTA block are gone;
 * destinations are now one imagery-forward section, not two competing grids.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "../components/Footer";
import MapCanvas from "../components/map/MapCanvas";
import Navbar from "../components/Navbar";
import { Button, Meta, MetaDot, ProvenanceBadge } from "../components/ui/Primitives";
import { fetchDestinations, fetchPlaces, type DestinationRow } from "../lib/api";
import {
  fitViewport,
  toMarkerCategory,
  useMapState,
  type MapMarker,
} from "../lib/mapStore";

/** Featured trips — matches the planner's presets, since clicking one leads there. */
const FEATURED = [
  {
    name: "Hyderabad",
    state: "Telangana",
    tag: "Heritage, biryani and the Old City",
    image:
      "https://images.unsplash.com/photo-1600267197423-8c3f1c3f8f6a?auto=format&fit=crop&w=900&q=80",
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
  } = useMapState();

  const [searchQuery, setSearchQuery] = useState("");
  const [destinations, setDestinations] = useState<DestinationRow[]>([]);

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
      if (!match) return;

      setMapDestination(match.name);
      if (match.latitude != null && match.longitude != null) {
        setViewport({ lat: match.latitude, lng: match.longitude, zoom: 11 });
      }

      const places = await fetchPlaces(match.id);
      if (!places) return;

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

  const handleQuickPlan = useCallback(
    (preset?: (typeof FEATURED)[number]) => {
      const trip = preset
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
            destination: searchQuery.trim() || "Hyderabad",
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

      sessionStorage.setItem("smartTourismTrip", JSON.stringify(trip));
      router.push("/planner");
    },
    [searchQuery, router]
  );

  const heroDestinationLabel = useMemo(
    () => searchQuery.trim() || "Hyderabad",
    [searchQuery]
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* ------------------------------- Hero -------------------------------
            The map is IN the hero, not absent from the page. Typing a real
            destination flies the shared canvas there live. */}
        <section className="border-b border-[rgba(0,0,0,0.08)]">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col lg:flex-row">
            {/* Copy + search */}
            <div className="flex flex-1 flex-col justify-center px-5 py-14 md:px-8 md:py-20 lg:w-[46%] lg:max-w-[620px]">
              <p className="t-label text-[#8a5a3b]">Travel Reality Intelligence</p>

              <h1 className="t-display mt-4">
                You know where you&apos;re going.
                <br />
                <span className="text-[#d97745]">Know what to really expect.</span>
              </h1>

              <p className="t-body-lg mt-6 max-w-lg">
                Most trips don&apos;t go wrong because the itinerary was bad. They
                go wrong because of rain on the wrong afternoon, an hour lost to
                traffic, or costs nobody budgeted for. We check real conditions
                against your actual plan — and tell you what we verified, what
                we estimated, and what we simply don&apos;t know.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleQuickPlan();
                }}
                className="mt-8 flex flex-col gap-2 rounded-2xl border border-[rgba(0,0,0,0.1)] bg-white p-2 shadow-sm sm:flex-row"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim()) previewDestination(e.target.value);
                  }}
                  placeholder="Where do you want to explore?"
                  className="flex-1 rounded-xl bg-transparent px-3.5 py-3 text-sm outline-none placeholder:text-[#b5b5ad]"
                />
                <Button type="submit" size="md">
                  Plan my trip →
                </Button>
              </form>

              <div className="mt-4 flex flex-wrap items-center">
                <Meta>Try</Meta>
                <MetaDot />
                {FEATURED.slice(0, 3).map((preset, i) => (
                  <span key={preset.name}>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery(preset.name);
                        previewDestination(preset.name);
                      }}
                      className="t-meta font-semibold text-[#8a5a3b] hover:underline"
                    >
                      {preset.name}
                    </button>
                    {i < 2 && <MetaDot />}
                  </span>
                ))}
              </div>
            </div>

            {/* The live map — hidden on small screens in favour of the
                imagery-forward destination cards further down the page. */}
            <div className="relative hidden h-[calc(100vh-72px)] lg:block lg:flex-1">
              <MapCanvas showCategoryFilter={false} />
              <div className="pointer-events-none absolute left-5 top-5 rounded-xl bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
                <p className="t-label">Previewing</p>
                <p className="t-title mt-0.5 text-[17px]">{heroDestinationLabel}</p>
              </div>
            </div>
          </div>
        </section>

        {/* --------------------- What we actually check ---------------------
            Kept — this was already the strongest part of the page. Given
            more room and the shared provenance badge rather than one-off
            colour classes. */}
        <section className="bg-white py-16">
          <div className="mx-auto max-w-[1400px] px-5 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="t-label text-[#8a5a3b]">What we actually check</p>
                <h2 className="t-headline mt-2">
                  Every figure is labelled by where it came from.
                </h2>
              </div>
              <Link href="/reality" className="t-body font-semibold text-[#171717] hover:underline">
                See a Reality Check →
              </Link>
            </div>

            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {PROVENANCE_COLUMNS.map((column) => (
                <div key={column.label}>
                  <ProvenanceBadge label={column.label} />
                  <h3 className="t-title mt-3 text-[17px]">{column.title}</h3>
                  <p className="t-body mt-2">{column.body}</p>
                </div>
              ))}
            </div>

            <p className="t-caption mt-10 max-w-3xl border-t border-[rgba(0,0,0,0.08)] pt-6">
              When conditions affect a stop on your plan, we tell you what
              happened, why it matters and the likely impact — then you choose.
              Keep your plan, or see alternatives. Nothing changes until you
              confirm it.
            </p>
          </div>
        </section>

        {/* -------------------------- Featured trips -------------------------
            Replaces the old emoji-icon feature grid and the separate
            destination grid with one imagery-forward section. */}
        <section className="border-t border-[rgba(0,0,0,0.08)] py-16">
          <div className="mx-auto max-w-[1400px] px-5 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="t-label text-[#8a5a3b]">Featured trips</p>
                <h2 className="t-headline mt-2">Start from somewhere real</h2>
              </div>
              <Link href="/planner" className="t-body font-semibold text-[#171717] hover:underline">
                Plan something else →
              </Link>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURED.map((trip) => (
                <button
                  key={trip.name}
                  onClick={() => handleQuickPlan(trip)}
                  className="group overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white text-left transition hover:border-[rgba(0,0,0,0.2)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#eeece7]">
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
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a5a3b]">
                      {trip.state}
                    </p>
                    <h3 className="t-title mt-1 text-[17px] text-[#171717] transition group-hover:text-[#d97745]">
                      {trip.name}
                    </h3>
                    <p className="t-body mt-1 text-[13px] line-clamp-2">{trip.tag}</p>
                    <Meta className="mt-2.5 block">
                      ₹{Number(trip.budget).toLocaleString("en-IN")} estimated
                    </Meta>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------- CTA ---------------------------------
            Simplified. The hackathon-branding block is gone; this links
            onward to the surfaces that actually exist. */}
        <section className="border-t border-[rgba(0,0,0,0.08)] bg-white py-16">
          <div className="mx-auto max-w-[1400px] px-5 md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-[#171717] px-8 py-10 text-white md:px-12 md:py-14">
              <div className="max-w-lg">
                <h2 className="t-headline text-white">
                  Plan with the full picture.
                </h2>
                <p className="t-body mt-3 text-white/70">
                  Real weather, realistic travel time, honest costs — checked
                  against the plan you actually build.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Link href="/planner">
                  <Button variant="accent" size="lg">Plan a trip</Button>
                </Link>
                <Link href="/hotels">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="border-white/25 text-white hover:bg-white/10"
                  >
                    Browse hotels
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
