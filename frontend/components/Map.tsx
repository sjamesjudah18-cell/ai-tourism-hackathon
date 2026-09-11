"use client";

import { useMemo, useState } from "react";
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
} from "@vis.gl/react-google-maps";

export type MapLocation = {
  id: string | number;
  name: string;
  category: "place" | "hotel" | "food" | "activity";
  lat: number;
  lng: number;
  time?: string;
  cost?: number;
  /** Set when an alert names this stop, so the map can flag it. */
  affected?: boolean;
  affectedReason?: string;
};

type MapProps = {
  destination?: string;
  selectedDay?: number;
  customLocations?: MapLocation[];
};

const hyderabadLocations: MapLocation[] = [
  { id: 1, name: "Charminar", category: "place", lat: 17.3616, lng: 78.4747, time: "Morning" },
  { id: 2, name: "Laad Bazaar & Choodi Market", category: "place", lat: 17.3618, lng: 78.4728, time: "Morning" },
  { id: 3, name: "Chowmahalla Palace", category: "place", lat: 17.3578, lng: 78.4717, time: "Afternoon" },
  { id: 4, name: "Golconda Fort", category: "activity", lat: 17.3833, lng: 78.4011, time: "Morning" },
  { id: 5, name: "Paradise Biryani Landmark", category: "food", lat: 17.4415, lng: 78.4872, time: "Afternoon" },
  { id: 6, name: "Taj Falaknuma Palace", category: "hotel", lat: 17.3314, lng: 78.4674 },
  { id: 7, name: "Radisson Blu Banjara Hills", category: "hotel", lat: 17.4239, lng: 78.4482 },
  { id: 8, name: "Hussain Sagar Lake", category: "activity", lat: 17.4239, lng: 78.4738, time: "Evening" },
  { id: 9, name: "Nimrah Cafe & Bakery", category: "food", lat: 17.3615, lng: 78.4742, time: "Evening" },
];

const filters = [
  { id: "all", label: "All Stops" },
  { id: "place", label: "Heritage & Sights" },
  { id: "hotel", label: "Hotels" },
  { id: "food", label: "Culinary" },
  { id: "activity", label: "Activities" },
];

function getMarkerIcon(category: MapLocation["category"]) {
  switch (category) {
    case "hotel":
      return "🏨";
    case "food":
      return "🍲";
    case "activity":
      return "★";
    default:
      return "📍";
  }
}

export default function Map({
  destination = "Hyderabad",
  selectedDay = 1,
  customLocations,
}: MapProps) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedMarker, setSelectedMarker] = useState<MapLocation | null>(null);

  const isHyderabad = destination.toLowerCase().includes("hyderabad");

  const baseLocations = useMemo(() => {
    if (customLocations && customLocations.length > 0) {
      return customLocations;
    }
    // The demo set is Hyderabad-specific, so it is only ever shown for
    // Hyderabad. Showing these pins for Goa or Jaipur - which the previous
    // fallback did - would be fabricated data on the most visible surface
    // in the product.
    return isHyderabad ? hyderabadLocations : [];
  }, [customLocations, isHyderabad]);

  const filteredLocations = useMemo(() => {
    if (activeFilter === "all") {
      return baseLocations;
    }
    return baseLocations.filter((loc) => loc.category === activeFilter);
  }, [activeFilter, baseLocations]);

  // Compute map center
  const center = useMemo(() => {
    if (filteredLocations.length > 0) {
      const avgLat =
        filteredLocations.reduce((sum, l) => sum + l.lat, 0) /
        filteredLocations.length;
      const avgLng =
        filteredLocations.reduce((sum, l) => sum + l.lng, 0) /
        filteredLocations.length;
      return { lat: avgLat, lng: avgLng };
    }
    return { lat: 17.385, lng: 78.4867 };
  }, [filteredLocations]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative h-full min-h-[520px] w-full overflow-hidden rounded-[28px] bg-[#e5e3df]">
        <GoogleMap
          center={center}
          zoom={12}
          gestureHandling="greedy"
          disableDefaultUI={true}
          zoomControl={true}
          mapId="DEMO_MAP_ID"
          className="h-full w-full"
        >
          {filteredLocations.map((location, idx) => (
            <AdvancedMarker
              key={`${location.id}-${idx}`}
              position={{
                lat: location.lat,
                lng: location.lng,
              }}
              title={location.name}
              onClick={() => setSelectedMarker(location)}
            >
              <div className="group relative cursor-pointer">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm shadow-xl transition-transform duration-200 group-hover:scale-110 ${
                    location.affected
                      ? "border-amber-400 bg-amber-500 text-white"
                      : "border-white bg-[#171717] text-white"
                  }`}
                >
                  {getMarkerIcon(location.category)}
                </div>

                {/* Affected stops get a pulse so they read at a glance */}
                {location.affected && (
                  <span
                    className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-amber-400/40"
                    aria-hidden="true"
                  />
                )}

                {/* Marker tooltip */}
                <div className="pointer-events-none absolute bottom-12 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-xl bg-[#171717] px-3.5 py-2 text-xs font-medium text-white shadow-2xl group-hover:block">
                  <p className="font-semibold">{location.name}</p>
                  {location.time && (
                    <span className="text-[10px] text-[#dca17e]">
                      {location.time}
                    </span>
                  )}
                  {location.affectedReason && (
                    <p className="mt-0.5 max-w-[220px] whitespace-normal text-[10px] text-amber-300">
                      {location.affectedReason}
                    </p>
                  )}
                </div>
              </div>
            </AdvancedMarker>
          ))}
        </GoogleMap>

        {/* Honest empty state rather than pins from another city */}
        {filteredLocations.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
            <div className="pointer-events-auto max-w-xs rounded-2xl border border-black/5 bg-white/95 px-4 py-3.5 text-center shadow-lg backdrop-blur">
              <p className="text-sm font-semibold text-[#171717]">
                No mapped stops
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#6b6b66]">
                {activeFilter === "all"
                  ? `We don't have mapped coordinates for ${destination} on this day yet.`
                  : "No stops match this filter for the selected day."}
              </p>
            </div>
          </div>
        )}

        {/* Selected Marker Detail Card */}
        {selectedMarker && (
          <div className="absolute left-4 right-4 top-20 z-30 mx-auto max-w-sm rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur border border-black/5 animate-fadeIn">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded-full bg-[#f3efe9] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#d97745]">
                  {selectedMarker.category}
                </span>
                <h5 className="mt-1 font-bold text-sm text-[#171717]">
                  {selectedMarker.name}
                </h5>
                {selectedMarker.time && (
                  <p className="text-xs text-[#666]">
                    Scheduled for {selectedMarker.time}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedMarker(null)}
                className="rounded-full p-1 text-xs text-gray-400 hover:text-black"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* MAP HEADER OVERLAY */}
        <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3 pointer-events-none">
          <div className="pointer-events-auto rounded-2xl bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur border border-black/5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#999991]">
              Route Map
            </p>
            <p className="text-xs font-bold text-[#171717]">
              {destination} · Day {selectedDay}
            </p>
          </div>

          <div className="pointer-events-auto rounded-full bg-[#171717] px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg">
            {filteredLocations.length} active stops
          </div>
        </div>

        {/* FILTER CHIPS AT BOTTOM */}
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {filters.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur transition ${
                    active
                      ? "bg-[#171717] text-white"
                      : "bg-white/95 text-[#55554f] hover:bg-white"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </APIProvider>
  );
}