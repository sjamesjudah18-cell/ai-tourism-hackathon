"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { createTrip } from "../../lib/api";

const PRESETS = [
  {
    label: "✨ Hyderabad Benchmark (4 Days · ₹25k)",
    destination: "Hyderabad",
    days: "4",
    travelers: "2",
    budget: "25000",
    interests: ["🍜 Food", "🎭 Culture", "🎢 Adventure"],
    transport: "Any",
    hotel: "Comfort",
  },
  {
    label: "🏖️ Goa Coastal Escape (3 Days · ₹20k)",
    destination: "Goa",
    days: "3",
    travelers: "2",
    budget: "20000",
    interests: ["🏖️ Beaches", "🍜 Food", "🎢 Adventure"],
    transport: "Car",
    hotel: "Comfort",
  },
  {
    label: "🏰 Jaipur Royal Heritage (3 Days · ₹18k)",
    destination: "Jaipur",
    days: "3",
    travelers: "2",
    budget: "18000",
    interests: ["🏛️ History", "🎭 Culture", "🛍️ Shopping"],
    transport: "Taxi / Cab",
    hotel: "Budget",
  },
];

const POPULAR_DESTINATIONS = [
  "Hyderabad",
  "Goa",
  "Jaipur",
  "New Delhi",
  "Mumbai",
  "Kochi",
];

const INTEREST_OPTIONS = [
  "🏛️ History",
  "🍜 Food",
  "🏖️ Beaches",
  "🏔️ Nature",
  "📸 Photography",
  "🎭 Culture",
  "🛍️ Shopping",
  "🎢 Adventure",
];

const GENERATION_STEPS = [
  "Scoring tourist attractions and regional heritage sites...",
  "Clustering geographical routes to minimize transit times...",
  "Optimizing accommodation and daily dining budget...",
  "Consulting Gemini 3.6 Flash for authentic local insider tips...",
  "Finalizing your personalized travel blueprint...",
];

export default function PlannerPage() {
  const router = useRouter();

  const [destination, setDestination] = useState("Hyderabad");
  const [days, setDays] = useState("4");
  const [travelers, setTravelers] = useState("2");
  const [budget, setBudget] = useState("25000");
  const [transport, setTransport] = useState("Any");
  const [hotel, setHotel] = useState("Comfort");
  const [interests, setInterests] = useState<string[]>([
    "🍜 Food",
    "🎭 Culture",
    "🎢 Adventure",
  ]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setDestination(preset.destination);
    setDays(preset.days);
    setTravelers(preset.travelers);
    setBudget(preset.budget);
    setInterests(preset.interests);
    setTransport(preset.transport);
    setHotel(preset.hotel);
  };

  const toggleInterest = (interest: string) => {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!destination.trim()) {
      alert("Please enter a destination.");
      return;
    }

    if (!budget || Number(budget) <= 0) {
      alert("Please enter a valid total budget.");
      return;
    }

    const cleanInterests = interests.map((i) =>
      i.replace(/^[^\w\s]+/, "").trim()
    );

    const tripData = {
      destination: destination.trim(),
      number_of_days: Number(days),
      days: Number(days),
      travelers: Number(travelers),
      number_of_travelers: Number(travelers),
      budget: Number(budget),
      total_budget: Number(budget),
      interests: cleanInterests,
      transport_preference: transport,
      transport,
      accommodation_preference: hotel,
      hotel,
    };

    // Save locally for instant availability
    sessionStorage.setItem("smartTourismTrip", JSON.stringify(tripData));

    // Show step-by-step loading animation
    setIsGenerating(true);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < GENERATION_STEPS.length) {
        setLoadingStepIndex(step);
      }
    }, 600);

    // Persist to backend
    try {
      await createTrip({
        user_id: 1,
        destination: destination.trim(),
        number_of_days: Number(days),
        total_budget: Number(budget),
        number_of_travelers: Number(travelers),
        interests: cleanInterests,
        transport_preference: transport,
        accommodation_preference: hotel,
      });
    } catch (error) {
      console.warn("Backend trip save notice:", error);
    }

    setTimeout(() => {
      clearInterval(interval);
      router.push("/itinerary");
    }, 2800);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfa] text-[#171717]">
      <Navbar />

      <main className="flex-1 px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-3xl">
          
          {/* Header */}
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d97745]/20 bg-[#d97745]/10 px-3.5 py-1 text-xs font-semibold text-[#d97745]">
              ✨ AI Travel Planner
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#171717] md:text-5xl">
              Plan your personalized journey
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#6b6b64] md:text-base">
              Specify your destination, time, and budget. Our recommendation and route optimization algorithms design your complete trip in seconds.
            </p>
          </div>

          {/* Quick Demo Presets */}
          <div className="mt-8 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#888880]">
              Quick Demo Presets
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded-full border border-black/10 bg-[#f7f6f2] px-3.5 py-1.5 text-xs font-medium text-[#444] transition hover:border-black hover:bg-white"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Card */}
          <div className="mt-6 rounded-[28px] border border-black/5 bg-white p-6 shadow-xl md:p-10">
            <form onSubmit={handleSubmit} className="space-y-7">
              
              {/* Destination */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#555]">
                  📍 Destination City
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Hyderabad, Goa, Jaipur, Mumbai..."
                  className="mt-2.5 w-full rounded-xl border border-black/15 bg-[#fbfbfa] px-4 py-3.5 text-sm font-medium outline-none transition focus:border-black focus:bg-white"
                  required
                />
                {/* Popular city chips */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-[#888]">Popular:</span>
                  {POPULAR_DESTINATIONS.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setDestination(city)}
                      className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
                        destination.toLowerCase() === city.toLowerCase()
                          ? "bg-[#171717] text-white"
                          : "bg-[#eee] text-[#555] hover:bg-[#ddd]"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration & Travelers */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#555]">
                    📅 Duration
                  </label>
                  <select
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="mt-2.5 w-full rounded-xl border border-black/15 bg-[#fbfbfa] px-4 py-3.5 text-sm font-medium outline-none transition focus:border-black focus:bg-white"
                  >
                    <option value="1">1 Day (Quick Stop)</option>
                    <option value="2">2 Days (Weekend Trip)</option>
                    <option value="3">3 Days (Long Weekend)</option>
                    <option value="4">4 Days (Recommended)</option>
                    <option value="5">5 Days (Immersive)</option>
                    <option value="7">7 Days (Full Week)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#555]">
                    👥 Travelers
                  </label>
                  <select
                    value={travelers}
                    onChange={(e) => setTravelers(e.target.value)}
                    className="mt-2.5 w-full rounded-xl border border-black/15 bg-[#fbfbfa] px-4 py-3.5 text-sm font-medium outline-none transition focus:border-black focus:bg-white"
                  >
                    <option value="1">Solo Traveler (1)</option>
                    <option value="2">Couple / Duo (2)</option>
                    <option value="3">Small Group (3)</option>
                    <option value="4">Family / Friends (4)</option>
                    <option value="6">Group (6+)</option>
                  </select>
                </div>
              </div>

              {/* Total Budget */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#555]">
                  💰 Total Trip Budget (INR)
                </label>
                <div className="relative mt-2.5">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. 25000"
                    min="1000"
                    step="500"
                    className="w-full rounded-xl border border-black/15 bg-[#fbfbfa] py-3.5 pl-9 pr-4 text-sm font-semibold outline-none transition focus:border-black focus:bg-white"
                    required
                  />
                </div>
                <p className="mt-1 text-[11px] text-[#888]">
                  Our budget optimizer automatically allocates funds across Stay (35%), Food (20%), Activities (20%), Transport (15%), and Reserve (10%).
                </p>
              </div>

              {/* Interests */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#555]">
                  ❤️ What are your interests?
                </label>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {INTEREST_OPTIONS.map((interest) => {
                    const active = interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`rounded-xl border py-2.5 px-3 text-xs font-semibold transition ${
                          active
                            ? "border-[#171717] bg-[#171717] text-white shadow-sm"
                            : "border-black/10 bg-[#fbfbfa] text-[#555] hover:border-black/30 hover:bg-white"
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Transport & Stays */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#555]">
                    🚗 Transport Preference
                  </label>
                  <select
                    value={transport}
                    onChange={(e) => setTransport(e.target.value)}
                    className="mt-2.5 w-full rounded-xl border border-black/15 bg-[#fbfbfa] px-4 py-3.5 text-sm font-medium outline-none transition focus:border-black focus:bg-white"
                  >
                    <option value="Any">Any Mode (Optimal)</option>
                    <option value="Taxi / Cab">Taxi / Cab</option>
                    <option value="Public Transport">Public Transport / Metro</option>
                    <option value="Car">Self-drive Car</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#555]">
                    🏨 Accommodation Tier
                  </label>
                  <select
                    value={hotel}
                    onChange={(e) => setHotel(e.target.value)}
                    className="mt-2.5 w-full rounded-xl border border-black/15 bg-[#fbfbfa] px-4 py-3.5 text-sm font-medium outline-none transition focus:border-black focus:bg-white"
                  >
                    <option value="Comfort">Comfort (3★ - 4★ Hotels)</option>
                    <option value="Budget">Budget (Clean Inns & Hostels)</option>
                    <option value="Luxury">Luxury (5★ Heritage Palaces)</option>
                  </select>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full rounded-xl bg-[#171717] py-4 text-base font-bold text-white shadow-xl transition hover:bg-black hover:shadow-2xl disabled:opacity-50"
                >
                  {isGenerating ? "Building Your Itinerary..." : "✨ Create My Trip Blueprint"}
                </button>
              </div>

            </form>
          </div>

        </div>
      </main>

      {/* Loading Modal Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-6">
          <div className="w-full max-w-md rounded-[28px] bg-white p-8 text-center shadow-2xl animate-scaleUp">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#d97745]/10 text-3xl">
              ✈️
            </div>
            <h3 className="mt-5 text-xl font-bold text-[#171717]">
              Crafting your {destination} Journey
            </h3>
            <p className="mt-2 text-xs font-medium text-[#d97745] min-h-[32px] transition-all">
              {GENERATION_STEPS[loadingStepIndex]}
            </p>

            {/* Progress bar */}
            <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#171717] transition-all duration-500 ease-out"
                style={{
                  width: `${((loadingStepIndex + 1) / GENERATION_STEPS.length) * 100}%`,
                }}
              />
            </div>

            <p className="mt-4 text-[11px] text-gray-400">
              Powered by Recommendation Engine, Route Optimizer & Gemini AI
            </p>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}