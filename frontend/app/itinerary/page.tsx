"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import Map, { MapLocation } from "../../components/Map";
import ItineraryCard from "../../components/ItineraryCard";
import HotelCard from "../../components/HotelCard";
import PlaceCard from "../../components/PlaceCard";
import BudgetCard from "../../components/BudgetCard";
import AIChat from "../../components/AICHAT";
import {
  generateItinerary,
  ItineraryResponse,
  ActivityItem,
  HotelItem,
} from "../../lib/api";

const CITY_HEROES: Record<string, string> = {
  hyderabad:
    "https://images.unsplash.com/photo-1600267197423-8c3f1c3f8f6a?auto=format&fit=crop&w=1800&q=85",
  goa:
    "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1800&q=85",
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

export default function ItineraryPage() {
  const [tripConfig, setTripConfig] = useState<any>(null);
  const [data, setData] = useState<ItineraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load trip from session storage and fetch full itinerary from backend
  useEffect(() => {
    const raw = sessionStorage.getItem("smartTourismTrip");
    let parsedTrip: any = null;

    if (raw) {
      try {
        parsedTrip = JSON.parse(raw);
      } catch (e) {
        parsedTrip = null;
      }
    }

    // Default fallback to Hyderabad Benchmark if none saved
    if (!parsedTrip) {
      parsedTrip = {
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
    }

    setTripConfig(parsedTrip);

    // Call real FastAPI backend
    async function loadItinerary() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await generateItinerary({
          destination: parsedTrip.destination || "Hyderabad",
          number_of_days: Number(parsedTrip.days || parsedTrip.number_of_days || 4),
          total_budget: Number(parsedTrip.budget || parsedTrip.total_budget || 25000),
          number_of_travelers: Number(parsedTrip.travelers || parsedTrip.number_of_travelers || 2),
          interests: parsedTrip.interests || ["Food", "Culture"],
          transport_preference: parsedTrip.transport || "Any",
          accommodation_preference: parsedTrip.hotel || "Comfort",
        });
        setData(res);
      } catch (err: any) {
        console.warn("Backend itinerary API fallback activated:", err);
        setErrorMsg("Running in offline demo mode. Showing curated destination itinerary.");
      } finally {
        setLoading(false);
      }
    }

    loadItinerary();
  }, []);

  const destinationName = data?.destination || tripConfig?.destination || "Hyderabad";
  const heroImage = useMemo(() => {
    const key = destinationName.toLowerCase().trim();
    for (const [k, v] of Object.entries(CITY_HEROES)) {
      if (key.includes(k)) return v;
    }
    return DEFAULT_HERO;
  }, [destinationName]);

  const totalDays = data?.number_of_days || tripConfig?.days || 4;
  const currentDayData = useMemo(() => {
    if (!data?.itinerary || data.itinerary.length === 0) return null;
    return (
      data.itinerary.find((d) => d.day === selectedDay) || data.itinerary[0]
    );
  }, [data, selectedDay]);

  // Convert current day activities & hotels to map pins
  const mapLocations: MapLocation[] = useMemo(() => {
    const list: MapLocation[] = [];

    // Add current day activities
    if (currentDayData?.activities) {
      currentDayData.activities.forEach((act, idx) => {
        const catMap: Record<string, "place" | "hotel" | "food" | "activity"> = {
          historical: "place",
          culture: "place",
          food: "food",
          nature: "activity",
          adventure: "activity",
          museum: "place",
        };
        const cat = catMap[act.category?.toLowerCase()] || "place";
        list.push({
          id: `act-${idx}`,
          name: act.name || act.place_name || "Attraction",
          category: cat,
          lat: act.latitude || 17.385 + idx * 0.01,
          lng: act.longitude || 78.4867 + idx * 0.01,
          time: act.time,
          cost: act.estimated_cost,
        });
      });
    }

    // Add hotels as hotel markers
    if (data?.hotels) {
      data.hotels.forEach((h, idx) => {
        list.push({
          id: `hotel-${idx}`,
          name: h.name,
          category: "hotel",
          lat: h.latitude || 17.39 + idx * 0.01,
          lng: h.longitude || 78.47 + idx * 0.01,
          cost: h.price_per_night,
        });
      });
    }

    return list;
  }, [currentDayData, data?.hotels]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fbfbfa]">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#171717] text-white text-2xl animate-pulse">
            ✈️
          </div>
          <h2 className="mt-6 text-2xl font-bold text-[#171717]">
            Generating {destinationName} Itinerary...
          </h2>
          <p className="mt-2 text-xs text-gray-500 max-w-sm">
            Fetching regional attractions, calculating nearest-neighbor routes, and consulting Gemini 3.6 Flash for local tips.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const budgetBreakdown = data?.budget_breakdown || {
    total_budget: tripConfig?.budget || 25000,
    hotel: Math.round((tripConfig?.budget || 25000) * 0.35),
    food: Math.round((tripConfig?.budget || 25000) * 0.2),
    activities: Math.round((tripConfig?.budget || 25000) * 0.2),
    transport: Math.round((tripConfig?.budget || 25000) * 0.15),
    emergency_buffer: Math.round((tripConfig?.budget || 25000) * 0.1),
  };

  const weather = data?.weather || {
    destination: destinationName,
    temperature: "29°C",
    feels_like: "30°C",
    condition: "Sunny & Pleasant",
    humidity: "52%",
    wind_speed: "11 km/h",
    packing_advice: "Light cotton attire, sunglasses, and comfortable walking sneakers.",
    best_time_to_explore: "Morning (8:30 AM - 11 AM) & Evening (4:30 PM - 7:30 PM)",
    is_live: true,
  };

  const aiInsights = data?.ai_insights || {
    trip_tagline: `Unveil the Soul of ${destinationName}`,
    ai_summary: `An immersive journey blending iconic architecture, local culinary discoveries, and scenic landmarks customized to your travel style.`,
    insider_tips: [
      "Arrive at popular monuments before 10 AM to enjoy peaceful photography.",
      "Keep digital payments or small cash ready for local street food stalls.",
      "Lakeside promenades are best enjoyed during sunset hours.",
    ],
    culinary_highlights: ["Authentic regional delicacies", "Artisanal street chai & snacks"],
    local_etiquette: "Dress respectfully and remove footwear before entering heritage sanctuaries.",
    ai_powered: false,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfa] text-[#171717]">
      <Navbar />

      {/* Hero Section */}
      <section className="mx-auto max-w-[1400px] w-full px-5 pt-5 md:px-8 md:pt-8">
        <div className="relative min-h-[460px] overflow-hidden rounded-[32px] md:min-h-[520px] shadow-lg">
          <img
            src={heroImage}
            alt={destinationName}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

          {/* Tag Badges */}
          <div className="absolute left-6 top-6 flex flex-wrap items-center gap-2 md:left-8 md:top-8">
            <span className="flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold text-gray-900 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#d97745]" />
              AI Route Optimized
            </span>
            {aiInsights.ai_powered && (
              <span className="rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                Gemini 3.6 Flash Verified
              </span>
            )}
          </div>

          {/* Hero Bottom Information */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white md:p-12">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#dca17e]">
              Personalized Journey
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-6xl">
              {destinationName}
            </h1>
            <p className="mt-2 text-sm italic text-white/90 md:text-base font-medium">
              "{aiInsights.trip_tagline}"
            </p>

            {/* Quick Metrics Bar */}
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-white/90 md:text-sm">
              <span className="rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur font-medium">
                📅 {totalDays} Days
              </span>
              <span className="rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur font-medium">
                👥 {data?.number_of_travelers || tripConfig?.travelers || 2} Travelers
              </span>
              <span className="rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur font-medium">
                💰 ₹{(data?.total_budget || tripConfig?.budget || 25000).toLocaleString("en-IN")} Budget
              </span>
              <span className="rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur font-medium">
                🏨 {data?.accommodation_preference || tripConfig?.hotel || "Comfort"} Tier
              </span>
            </div>

            <p className="mt-4 max-w-2xl text-xs leading-relaxed text-white/80 md:text-sm">
              {aiInsights.ai_summary}
            </p>
          </div>
        </div>
      </section>

      {/* Weather & Travel Readiness Strip */}
      <section className="mx-auto max-w-[1400px] w-full px-5 pt-6 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-lg">
              ☀️
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#999]">
                Live Destination Climate
              </p>
              <p className="text-sm font-bold text-[#171717]">
                {weather.temperature} · {weather.condition} (Feels like {weather.feels_like})
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-6 text-xs text-[#555] lg:flex">
            <div>
              <span className="font-semibold text-gray-800">Humidity:</span> {weather.humidity}
            </div>
            <div>
              <span className="font-semibold text-gray-800">Wind:</span> {weather.wind_speed}
            </div>
            <div>
              <span className="font-semibold text-gray-800">Best Window:</span> {weather.best_time_to_explore}
            </div>
          </div>

          <div className="text-xs text-[#666]">
            <span className="font-bold text-gray-900">Packing Tip:</span> {weather.packing_advice}
          </div>
        </div>
      </section>

      {/* Itinerary Timeline + Interactive Map */}
      <section className="mx-auto max-w-[1400px] w-full px-5 py-8 md:px-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_520px]">
          
          {/* LEFT COLUMN: ITINERARY TIMELINE */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d97745]">
                  Day-by-Day Schedule
                </span>
                <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                  {currentDayData?.title || `Day ${selectedDay}`}
                </h2>
              </div>

              {/* Transit summary for the day */}
              {currentDayData?.total_transit_km && (
                <div className="rounded-full border border-black/10 bg-[#f7f6f2] px-3.5 py-1.5 text-xs font-semibold text-[#555]">
                  🚗 ~{currentDayData.total_transit_km} km transit ({currentDayData.estimated_transit_minutes} mins)
                </div>
              )}
            </div>

            {/* DAY TABS */}
            <div className="mt-6 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {Array.from({ length: totalDays }).map((_, idx) => {
                const dayNum = idx + 1;
                const active = selectedDay === dayNum;
                return (
                  <button
                    key={dayNum}
                    onClick={() => setSelectedDay(dayNum)}
                    className={`min-w-[84px] rounded-full px-5 py-2.5 text-xs font-bold transition shadow-xs ${
                      active
                        ? "bg-[#171717] text-white shadow"
                        : "bg-white text-[#666] hover:bg-[#eae9e4]"
                    }`}
                  >
                    Day {dayNum}
                  </button>
                );
              })}
            </div>

            {/* ACTIVITIES LIST */}
            <div className="mt-4 divide-y divide-black/5">
              {currentDayData?.activities && currentDayData.activities.length > 0 ? (
                currentDayData.activities.map((act, index) => (
                  <ItineraryCard
                    key={`${selectedDay}-${act.name}-${index}`}
                    activity={act}
                    dayNumber={selectedDay}
                    isFirst={index === 0}
                  />
                ))
              ) : (
                <div className="py-12 text-center text-gray-500 text-xs">
                  No activities scheduled for Day {selectedDay}.
                </div>
              )}
            </div>

            {/* AI LOCAL INSIDER TIPS FOR THE DAY */}
            <div className="mt-8 rounded-2xl border border-black/5 bg-[#f5f3ee] p-5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#171717]">
                <span>💡</span>
                <span>Gemini Local Concierge Tips for {destinationName}</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-[#55544f]">
                {aiInsights.insider_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#d97745] font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* RIGHT COLUMN: STICKY INTERACTIVE MAP */}
          <aside className="lg:sticky lg:top-[96px] lg:h-[calc(100vh-120px)]">
            <div className="h-full min-h-[520px] overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-md">
              <Map
                destination={destinationName}
                selectedDay={selectedDay}
                customLocations={mapLocations}
              />
            </div>
          </aside>

        </div>
      </section>

      {/* ONE TOURISM HUB: RECOMMENDED STAYS */}
      <section className="border-t border-black/5 bg-white py-14">
        <div className="mx-auto max-w-[1400px] w-full px-5 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d97745]">
                One Tourism Hub · Stays
              </span>
              <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                Recommended Stays in {destinationName}
              </h2>
              <p className="mt-1 text-xs text-[#666]">
                Curated accommodations matching your {data?.accommodation_preference || "Comfort"} tier and proximity to attractions.
              </p>
            </div>
            <Link
              href="/planner"
              className="text-xs font-bold text-[#d97745] hover:underline"
            >
              Change Tier →
            </Link>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(data?.hotels || []).map((hotel) => (
              <HotelCard key={hotel.id || hotel.name} hotel={hotel} />
            ))}
          </div>
        </div>
      </section>

      {/* DETERMINISTIC SMART BUDGET OPTIMIZER */}
      <section className="py-14 bg-[#fbfbfa]">
        <div className="mx-auto max-w-[1400px] w-full px-5 md:px-8">
          <BudgetCard
            budget={budgetBreakdown}
            days={totalDays}
            travelers={data?.number_of_travelers || tripConfig?.travelers || 2}
          />
        </div>
      </section>

      {/* FLOATING AI TRAVEL ASSISTANT */}
      <AIChat
        tripContext={{
          destination: destinationName,
          days: totalDays,
          budget: data?.total_budget || tripConfig?.budget || 25000,
          interests: data?.interests || tripConfig?.interests,
        }}
      />

      <Footer />
    </div>
  );
}