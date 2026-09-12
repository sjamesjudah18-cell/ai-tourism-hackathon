"use client";

/**
 * The planner, as a progressive sequence.
 *
 * Previously every field sat in one large white card at uniform visual weight,
 * so choosing a destination looked exactly as consequential as ticking an
 * optional start date. It now moves through four weighted steps, with the map
 * beside it responding as soon as a destination is picked - so the place comes
 * into focus while you answer rather than only after you submit.
 *
 * Every original field is preserved. This is sequencing and visual weight, not
 * feature removal.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../components/Footer";
import MapCanvas from "../../components/map/MapCanvas";
import Navbar from "../../components/Navbar";
import { Button, Field, Meta, MetaDot, inputClass } from "../../components/ui/Primitives";
import {
  fetchDestinations,
  fetchPlaces,
  createTrip,
  type DestinationRow,
} from "../../lib/api";
import {
  fitViewport,
  toMarkerCategory,
  useMapState,
  type MapMarker,
} from "../../lib/mapStore";

/** Featured trips, with real imagery rather than small bordered chips. */
const FEATURED = [
  {
    label: "Hyderabad",
    tagline: "Heritage, biryani, and the Old City",
    destination: "Hyderabad",
    days: "4",
    travelers: "2",
    budget: "25000",
    interests: ["Food", "Culture", "Adventure"],
    transport: "Any",
    hotel: "Comfort",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Charminar_12032013.jpg/960px-Charminar_12032013.jpg",
  },
  {
    label: "Goa",
    tagline: "Coastline, Latin quarter, and seafood",
    destination: "Goa",
    days: "3",
    travelers: "2",
    budget: "20000",
    interests: ["Beaches", "Food", "Adventure"],
    transport: "Car",
    hotel: "Comfort",
    image:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Jaipur",
    tagline: "Forts, bazaars, and Rajasthani cooking",
    destination: "Jaipur",
    days: "3",
    travelers: "2",
    budget: "18000",
    interests: ["History", "Culture", "Shopping"],
    transport: "Taxi / Cab",
    hotel: "Budget",
    image:
      "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=800&q=80",
  },
];

const POPULAR = ["Hyderabad", "Goa", "Jaipur", "New Delhi", "Mumbai", "Kochi"];

/** Image-backed interest selector, replacing the 2x4 toggle grid. */
const INTERESTS = [
  { label: "History", image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=400&q=70" },
  { label: "Food", image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=70" },
  { label: "Beaches", image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=70" },
  { label: "Nature", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=70" },
  { label: "Photography", image: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=400&q=70" },
  { label: "Culture", image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=400&q=70" },
  { label: "Shopping", image: "https://images.unsplash.com/photo-1481437156560-3205f6a55735?auto=format&fit=crop&w=400&q=70" },
  { label: "Adventure", image: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=400&q=70" },
];

export default function PlannerPage() {
  const router = useRouter();
  const { setDestination: setMapDestination, setMarkers, setViewport } = useMapState();

  const [destination, setDestination] = useState("Hyderabad");
  const [days, setDays] = useState("4");
  const [travelers, setTravelers] = useState("2");
  const [budget, setBudget] = useState("25000");
  const [transport, setTransport] = useState("Any");
  const [hotel, setHotel] = useState("Comfort");
  const [startDate, setStartDate] = useState("");
  const [origin, setOrigin] = useState("");
  const [vehicleOwnership, setVehicleOwnership] = useState("personal");
  const [vehicleFuelType, setVehicleFuelType] = useState("petrol");
  const [vehicleMileage, setVehicleMileage] = useState("");
  const [vehicleFuelPrice, setVehicleFuelPrice] = useState("");
  const [vehicleRentalCost, setVehicleRentalCost] = useState("");
  const [interests, setInterests] = useState<string[]>([
    "Food",
    "Culture",
    "Adventure",
  ]);

  const [destinations, setDestinations] = useState<DestinationRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Home's quick-plan buttons and featured destinations write a trip here
  // before navigating in. Reading it once on mount is what makes "tap Goa on
  // the homepage" actually land on Goa here, instead of the hardcoded default.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("smartTourismTrip");
      if (!raw) return;
      const stored = JSON.parse(raw);
      if (stored.destination) setDestination(stored.destination);
      if (stored.days) setDays(String(stored.days));
      if (stored.travelers) setTravelers(String(stored.travelers));
      if (stored.budget) setBudget(String(stored.budget));
      if (stored.interests) setInterests(stored.interests);
      if (stored.transport) setTransport(stored.transport);
      if (stored.hotel) setHotel(stored.hotel);
    } catch {
      /* malformed or unavailable storage — defaults stand */
    }
  }, []);

  useEffect(() => {
    (async () => {
      const rows = await fetchDestinations();
      if (rows) setDestinations(rows);
    })();
  }, []);

  /* The destination coming into focus on the map as it is chosen. */
  const previewDestination = useCallback(
    async (name: string) => {
      setMapDestination(name);
      const match = destinations.find(
        (d) => d.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (!match) {
        setMarkers([]);
        return;
      }

      if (match.latitude != null && match.longitude != null) {
        setViewport({ lat: match.latitude, lng: match.longitude, zoom: 11 });
      }

      const places = await fetchPlaces(match.id);
      if (!places) return;

      const markers: MapMarker[] = places
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((place) => ({
          id: `preview-${place.id}`,
          name: place.name,
          category: toMarkerCategory(place.category),
          lat: place.latitude as number,
          lng: place.longitude as number,
          rating: place.rating ?? undefined,
          description: place.description ?? undefined,
        }));

      setMarkers(markers);
      if (markers.length > 0) setViewport(fitViewport(markers));
    },
    [destinations, setMapDestination, setMarkers, setViewport]
  );

  useEffect(() => {
    if (destinations.length === 0) return;
    previewDestination(destination);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinations]);

  function applyFeatured(preset: (typeof FEATURED)[number]) {
    setDestination(preset.destination);
    setDays(preset.days);
    setTravelers(preset.travelers);
    setBudget(preset.budget);
    setInterests(preset.interests);
    setTransport(preset.transport);
    setHotel(preset.hotel);
    previewDestination(preset.destination);
  }

  function toggleInterest(interest: string) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((i) => i !== interest)
        : [...current, interest]
    );
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    if (!destination.trim()) {
      setError("Tell us where you're going.");
      return;
    }
    if (!budget || Number(budget) <= 0) {
      setError("Enter a total budget so we can check whether the plan fits it.");
      return;
    }

    const tripData = {
      destination: destination.trim(),
      number_of_days: Number(days),
      days: Number(days),
      travelers: Number(travelers),
      number_of_travelers: Number(travelers),
      budget: Number(budget),
      total_budget: Number(budget),
      interests,
      transport_preference: transport,
      transport,
      accommodation_preference: hotel,
      hotel,
      start_date: startDate || undefined,
      origin: origin.trim() || undefined,
      vehicle_ownership: vehicleOwnership,
      vehicle_fuel_type: vehicleFuelType,
      vehicle_mileage: vehicleMileage || undefined,
      vehicle_fuel_price: vehicleFuelPrice || undefined,
      vehicle_rental_cost: vehicleRentalCost || undefined,
    };

    sessionStorage.setItem("smartTourismTrip", JSON.stringify(tripData));
    // A fresh plan supersedes any previously stored one.
    sessionStorage.removeItem("aiTourismItinerary");

    setSubmitting(true);
    try {
      await createTrip({
        user_id: 1,
        destination: tripData.destination,
        number_of_days: tripData.number_of_days,
        total_budget: tripData.total_budget,
        number_of_travelers: tripData.number_of_travelers,
        interests,
        transport_preference: transport,
        accommodation_preference: hotel,
        start_date: startDate || undefined,
      });
    } catch {
      // Saving the trip is a convenience; planning proceeds regardless.
    }

    router.push("/itinerary");
  }

  const stepNumber = useMemo(
    () => ({
      destination: "01",
      basics: "02",
      interests: "03",
      refine: "04",
    }),
    []
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:flex-row">
        {/* Sequence */}
        <div className="min-w-0 flex-1 px-5 py-10 md:px-8 lg:w-[56%] lg:max-w-[760px]">
          <p className="t-label text-[#8a5a3b]">Plan a trip</p>
          <h1 className="t-display mt-3">Where are you going?</h1>

          <form onSubmit={handleSubmit} className="mt-10 space-y-14">
            {/* ---------------------- 01 Destination ---------------------- */}
            <section>
              <Step number={stepNumber.destination} title="Destination" />

              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onBlur={() => previewDestination(destination)}
                placeholder="Hyderabad, Goa, Jaipur…"
                className="mt-5 w-full border-0 border-b border-[rgba(0,0,0,0.14)] bg-transparent px-0 pb-3 text-3xl font-normal tracking-tight text-[#171717] outline-none transition placeholder:text-[#c9c9c2] focus:border-[#171717] md:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
                required
              />

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {POPULAR.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      setDestination(city);
                      previewDestination(city);
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      destination.toLowerCase() === city.toLowerCase()
                        ? "bg-[#171717] text-white"
                        : "text-[#8f8f88] hover:bg-[#f5f3ee] hover:text-[#171717]"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>

              {/* Featured trips, with imagery */}
              <div className="mt-7">
                <p className="t-label">Or start from a featured trip</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {FEATURED.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyFeatured(preset)}
                      className="group overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white text-left transition hover:border-[rgba(0,0,0,0.2)]"
                    >
                      <div className="aspect-[16/10] overflow-hidden bg-[#eeece7]">
                        <img
                          src={preset.image}
                          alt={preset.label}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-3">
                        <p className="t-title text-[15px]">{preset.label}</p>
                        <p className="t-caption mt-0.5 line-clamp-2">
                          {preset.tagline}
                        </p>
                        <Meta className="mt-1.5 block">
                          {preset.days} days · ₹
                          {Number(preset.budget).toLocaleString("en-IN")}
                        </Meta>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ------------------------ 02 Basics ------------------------- */}
            <section>
              <Step
                number={stepNumber.basics}
                title="The basics"
                description="How long, how many, and how much."
              />

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field label="Duration">
                  <select
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className={inputClass}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={String(n)}>
                        {n} day{n === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Travellers">
                  <select
                    value={travelers}
                    onChange={(e) => setTravelers(e.target.value)}
                    className={inputClass}
                  >
                    {[1, 2, 3, 4, 6].map((n) => (
                      <option key={n} value={String(n)}>
                        {n} traveller{n === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Total budget (INR)"
                  hint="We check the plan against this and tell you honestly if it won't fit."
                >
                  <input
                    type="number"
                    min={0}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Start date"
                  optional
                  hint="Aligns the weather forecast to your actual travel days."
                >
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inputClass}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field
                    label="Starting from"
                    optional
                    hint="Lets us compare how to get there. Without it, travel to the destination is left out of cost estimates."
                  >
                    <input
                      type="text"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      placeholder="e.g. Bengaluru"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </section>

            {/* ----------------------- 03 Interests ----------------------- */}
            <section>
              <Step
                number={stepNumber.interests}
                title="What are you here for?"
                description="We weight the plan towards whatever you pick."
              />

              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {INTERESTS.map((interest) => {
                  const active = interests.includes(interest.label);
                  return (
                    <button
                      key={interest.label}
                      type="button"
                      onClick={() => toggleInterest(interest.label)}
                      aria-pressed={active}
                      className={`group relative aspect-[4/3] overflow-hidden rounded-xl transition ${
                        active
                          ? "ring-2 ring-[#171717] ring-offset-2 ring-offset-[#fbfbfa]"
                          : ""
                      }`}
                    >
                      <img
                        src={interest.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <span
                        className={`absolute inset-0 transition ${
                          active ? "bg-black/45" : "bg-black/30 group-hover:bg-black/40"
                        }`}
                      />
                      <span className="absolute inset-x-0 bottom-0 p-2.5 text-left text-[13px] font-semibold text-white">
                        {interest.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <Meta className="mt-3 block">
                {interests.length} selected
              </Meta>
            </section>

            {/* ------------------------ 04 Refine ------------------------- */}
            <section>
              <Step
                number={stepNumber.refine}
                title="Refine"
                description="How you'll get around, and where you'll stay."
              />

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field label="Transport preference">
                  <select
                    value={transport}
                    onChange={(e) => setTransport(e.target.value)}
                    className={inputClass}
                  >
                    {["Any", "Public transport", "Taxi / Cab", "Car", "Bike", "Walking"].map(
                      (option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      )
                    )}
                  </select>
                </Field>

                <Field label="Accommodation">
                  <select
                    value={hotel}
                    onChange={(e) => setHotel(e.target.value)}
                    className={inputClass}
                  >
                    {["Budget", "Comfort", "Luxury"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Vehicle details, only relevant when self-driving */}
              {(transport === "Car" || transport === "Bike") && (
                <div className="mt-5 grid gap-5 rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#faf9f7] p-4 sm:grid-cols-2">
                  <Field label="Ownership">
                    <select
                      value={vehicleOwnership}
                      onChange={(e) => setVehicleOwnership(e.target.value)}
                      className={inputClass}
                    >
                      <option value="personal">Personal vehicle</option>
                      <option value="rental">Rental</option>
                    </select>
                  </Field>

                  <Field label="Fuel type">
                    <select
                      value={vehicleFuelType}
                      onChange={(e) => setVehicleFuelType(e.target.value)}
                      className={inputClass}
                    >
                      <option value="petrol">Petrol</option>
                      {transport === "Car" && <option value="diesel">Diesel</option>}
                      <option value="electric">Electric</option>
                    </select>
                  </Field>

                  <Field
                    label="Mileage (km/L)"
                    optional
                    hint={`Defaults to a typical ${transport.toLowerCase()} if left blank.`}
                  >
                    <input
                      type="number"
                      min={0}
                      value={vehicleMileage}
                      onChange={(e) => setVehicleMileage(e.target.value)}
                      placeholder={transport === "Bike" ? "40" : "15"}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Fuel price (₹/L)" optional hint="Defaults to a reviewed reference price.">
                    <input
                      type="number"
                      min={0}
                      value={vehicleFuelPrice}
                      onChange={(e) => setVehicleFuelPrice(e.target.value)}
                      placeholder="105"
                      className={inputClass}
                    />
                  </Field>

                  {vehicleOwnership === "rental" && (
                    <Field label="Rental cost (₹/day)" optional>
                      <input
                        type="number"
                        min={0}
                        value={vehicleRentalCost}
                        onChange={(e) => setVehicleRentalCost(e.target.value)}
                        placeholder={transport === "Bike" ? "500" : "1800"}
                        className={inputClass}
                      />
                    </Field>
                  )}
                </div>
              )}
            </section>

            {error && (
              <p className="border-l-2 border-red-400 py-2 pl-3 text-[13px] text-red-800">
                {error}
              </p>
            )}

            <div className="border-t border-[rgba(0,0,0,0.08)] pt-7">
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? "Building your plan…" : "Build my itinerary"}
              </Button>
              <p className="t-caption mt-3">
                We'll generate the plan, then check real conditions against it.
              </p>
            </div>
          </form>
        </div>

        {/* The destination coming into focus */}
        <aside className="relative hidden lg:block lg:flex-1">
          <div className="sticky top-[72px] h-[calc(100vh-72px)]">
            <MapCanvas showCategoryFilter={false} />
            <div className="pointer-events-none absolute left-4 top-4 rounded-xl bg-white/95 px-3.5 py-2.5 shadow-sm backdrop-blur">
              <p className="t-label">Previewing</p>
              <p className="t-title mt-0.5 text-[15px]">{destination || "—"}</p>
            </div>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="t-caption tabular-nums text-[#c9c9c2]">{number}</span>
      <div>
        <h2 className="t-title">{title}</h2>
        {description && <p className="t-body mt-1">{description}</p>}
      </div>
    </div>
  );
}
