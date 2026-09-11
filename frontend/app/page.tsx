"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const POPULAR_DESTINATIONS = [
  {
    name: "Hyderabad",
    state: "Telangana",
    tag: "Heritage & Biryani Capital",
    image:
      "https://images.unsplash.com/photo-1600267197423-8c3f1c3f8f6a?auto=format&fit=crop&w=800&q=80",
    days: "4 Days",
    estBudget: "₹25,000",
    highlights: ["Charminar", "Golconda Fort", "Paradise Dum Biryani"],
  },
  {
    name: "Goa",
    state: "Goa",
    tag: "Sun, Sand & Latin Quarters",
    image:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80",
    days: "3 Days",
    estBudget: "₹20,000",
    highlights: ["Baga Beach", "Dudhsagar Falls", "Fontainhas"],
  },
  {
    name: "Jaipur",
    state: "Rajasthan",
    tag: "The Pink City & Fortresses",
    image:
      "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=800&q=80",
    days: "3 Days",
    estBudget: "₹18,000",
    highlights: ["Amber Fort", "Hawa Mahal", "Johari Bazaar"],
  },
  {
    name: "Mumbai",
    state: "Maharashtra",
    tag: "The City of Dreams & Sea Breeze",
    image:
      "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80",
    days: "3 Days",
    estBudget: "₹22,000",
    highlights: ["Gateway of India", "Marine Drive", "Colaba"],
  },
];

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleQuickPlan = (destinationName?: string) => {
    const dest = destinationName || searchQuery.trim() || "Hyderabad";
    const trip = {
      destination: dest,
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
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfa] text-[#171717]">
      <Navbar />

      <main className="flex-1">
        
        {/* HERO SECTION */}
        <section className="relative overflow-hidden px-5 pt-12 pb-20 md:px-8 md:pt-20 md:pb-28">
          <div className="mx-auto max-w-5xl text-center">
            
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d97745]/20 bg-[#d97745]/10 px-4 py-1.5 text-xs font-semibold text-[#d97745]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d97745]" />
              SIH 2026 Innovation · AI Tourism Ecosystem
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#171717] sm:text-6xl md:text-7xl">
              Plan your entire trip, <br />
              <span className="text-[#d97745]">powered by AI intelligence.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#666660] md:text-lg">
              One unified platform that personalizes your journey, connects local hotels and businesses, clusters routes to reduce travel time, and deterministically optimizes your travel budget.
            </p>

            {/* QUICK SEARCH / PLAN BAR */}
            <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-black/10 bg-white p-2.5 shadow-xl transition-shadow hover:shadow-2xl">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Where do you want to explore? (e.g. Hyderabad, Goa, Jaipur)"
                  className="flex-1 rounded-xl bg-transparent px-4 py-3 text-sm font-medium outline-none placeholder:text-gray-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleQuickPlan();
                  }}
                />
                <button
                  onClick={() => handleQuickPlan()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#171717] px-7 py-3.5 text-sm font-bold text-white shadow transition hover:bg-black"
                >
                  <span>Plan My Trip</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Quick Demo Pill Triggers */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-[#888]">Demo Benchmark:</span>
              <button
                onClick={() => handleQuickPlan("Hyderabad")}
                className="rounded-full border border-[#d97745]/30 bg-[#d97745]/5 px-3 py-1 font-semibold text-[#d97745] hover:bg-[#d97745]/10 transition"
              >
                ✨ Hyderabad (4 Days · ₹25k)
              </button>
              <button
                onClick={() => handleQuickPlan("Goa")}
                className="rounded-full border border-black/10 bg-white px-3 py-1 font-medium text-[#555] hover:border-black transition"
              >
                Goa (3 Days · ₹20k)
              </button>
              <button
                onClick={() => handleQuickPlan("Jaipur")}
                className="rounded-full border border-black/10 bg-white px-3 py-1 font-medium text-[#555] hover:border-black transition"
              >
                Jaipur (3 Days · ₹18k)
              </button>
            </div>

          </div>
        </section>

        {/* STATS & IMPACT (SIH PPT Slide 6) */}
        <section className="border-y border-black/5 bg-white py-10">
          <div className="mx-auto max-w-[1400px] px-5 md:px-8">
            <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
              <div>
                <p className="text-3xl font-extrabold text-[#171717] md:text-4xl">4,286M+</p>
                <p className="mt-1 text-xs text-[#777]">Domestic Tourist Visits (MoT India)</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-[#171717] md:text-4xl">$263.6B</p>
                <p className="mt-1 text-xs text-[#777]">Tourism Economic Impact (WTTC)</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-[#171717] md:text-4xl">40% Less</p>
                <p className="mt-1 text-xs text-[#777]">Travel Transit via Route Clustering</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-[#171717] md:text-4xl">100%</p>
                <p className="mt-1 text-xs text-[#777]">Deterministic Budget Adherence</p>
              </div>
            </div>
          </div>
        </section>

        {/* ONE TOURISM HUB ECOSYSTEM (SIH PPT Slide 2 & 3) */}
        <section id="tourism-hub" className="py-20 px-5 md:px-8">
          <div className="mx-auto max-w-[1400px]">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d97745]">
                One Tourism Hub
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">
                An intelligent ecosystem, not just another booking app.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#666]">
                Replacing multiple fragmented apps with a unified system connecting tourists, local hotels, authentic food businesses, and regional artisans.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              
              <div className="rounded-[24px] border border-black/5 bg-white p-7 shadow-sm transition hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d97745]/10 text-2xl">
                  🤖
                </div>
                <h3 className="mt-5 text-lg font-bold">AI Trip Planner</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#666]">
                  Generates day-by-day itineraries personalized around user budget, time, and specific interests.
                </p>
              </div>

              <div className="rounded-[24px] border border-black/5 bg-white p-7 shadow-sm transition hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-2xl">
                  💰
                </div>
                <h3 className="mt-5 text-lg font-bold">Smart Budgeting</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#666]">
                  Calculates real stay, food, transport, and activity allocations with automated saving alternatives.
                </p>
              </div>

              <div className="rounded-[24px] border border-black/5 bg-white p-7 shadow-sm transition hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-2xl">
                  🗺️
                </div>
                <h3 className="mt-5 text-lg font-bold">Route Optimization</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#666]">
                  Clusters geographically proximate stops per day to minimize zigzagging and urban transit fatigue.
                </p>
              </div>

              <div className="rounded-[24px] border border-black/5 bg-white p-7 shadow-sm transition hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl">
                  🤝
                </div>
                <h3 className="mt-5 text-lg font-bold">Local Business Connect</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#666]">
                  Gives local boutique hotels, street food artisans, and cultural guides direct digital visibility to incoming travelers.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* POPULAR DESTINATIONS GRID */}
        <section className="border-t border-black/5 bg-white py-20 px-5 md:px-8">
          <div className="mx-auto max-w-[1400px]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d97745]">
                  Featured Destinations
                </span>
                <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                  Explore iconic journeys
                </h2>
              </div>
              <Link
                href="/planner"
                className="text-xs font-bold text-[#d97745] hover:underline"
              >
                View all destinations →
              </Link>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {POPULAR_DESTINATIONS.map((dest) => (
                <div
                  key={dest.name}
                  onClick={() => handleQuickPlan(dest.name)}
                  className="group cursor-pointer overflow-hidden rounded-[26px] border border-black/5 bg-[#fbfbfa] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    <img
                      src={dest.image}
                      alt={dest.name}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <span className="absolute bottom-3 left-3 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                      {dest.days}
                    </span>
                    <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-gray-900 shadow-sm backdrop-blur">
                      {dest.estBudget}
                    </span>
                  </div>

                  <div className="p-5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#d97745]">
                      {dest.state}
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-[#171717] group-hover:text-[#d97745] transition">
                      {dest.name}
                    </h3>
                    <p className="mt-1 text-xs text-[#777] line-clamp-1">{dest.tag}</p>

                    <div className="mt-4 flex flex-wrap gap-1">
                      {dest.highlights.map((hl) => (
                        <span
                          key={hl}
                          className="rounded-md bg-white border border-black/5 px-2 py-0.5 text-[10px] text-[#555]"
                        >
                          {hl}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="py-20 px-5 md:px-8">
          <div className="mx-auto max-w-4xl rounded-[36px] bg-[#171717] p-10 text-center text-white shadow-2xl md:p-16">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#dca17e]">
              Smart India Hackathon 2026
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">
              Ready to experience intelligent travel?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-xs leading-relaxed text-white/70 md:text-sm">
              Launch your personalized journey now with AI recommendations, route optimization, and live weather.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/planner"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-[#171717] shadow-lg transition hover:bg-gray-100"
              >
                <span>Launch Trip Planner</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}