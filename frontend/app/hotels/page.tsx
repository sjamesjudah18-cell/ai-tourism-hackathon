"use client";

/**
 * Hotels — map-led discovery.
 *
 * New surface. The backend endpoint existed but nothing in the frontend ever
 * consumed it, so this is a first build rather than a redesign.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import DiscoveryShell, { DiscoveryRow } from "../../components/map/DiscoveryShell";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import {
  Meta,
  MetaDot,
  PlaceCardSkeleton,
  ProvenanceBadge,
  UnavailableNote,
} from "../../components/ui/Primitives";
import { fetchHotels, type HotelItem } from "../../lib/api";
import { fitViewport, useMapState, type MapMarker } from "../../lib/mapStore";

const DESTINATIONS = ["Hyderabad", "Goa", "Jaipur", "New Delhi", "Mumbai", "Kochi"];
const TIERS = ["Budget", "Comfort", "Luxury"];

export default function HotelsPage() {
  const { setMarkers, setViewport, setDestination, setCategories } = useMapState();

  const [destination, setDest] = useState("Hyderabad");
  const [tier, setTier] = useState("Comfort");
  const [hotels, setHotels] = useState<HotelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const result = await fetchHotels({ destination, preference: tier, limit: 12 });
    if (!result) {
      setFailed(true);
      setHotels([]);
    } else {
      setHotels(result.hotels);
    }
    setLoading(false);
  }, [destination, tier]);

  useEffect(() => {
    setDestination(destination);
    setCategories(["hotel"]);
    load();
  }, [destination, tier, load, setDestination, setCategories]);

  /* Publish hotels to the shared canvas. */
  useEffect(() => {
    const markers: MapMarker[] = hotels
      .filter((h) => h.latitude != null && h.longitude != null)
      .map((hotel, index) => ({
        id: `hotel-${hotel.id ?? index}`,
        name: hotel.name,
        category: "hotel" as const,
        lat: hotel.latitude as number,
        lng: hotel.longitude as number,
        image: hotel.image,
        rating: hotel.rating,
        cost: hotel.price_per_night,
        description: hotel.description,
      }));

    setMarkers(markers);
    if (markers.length > 0) setViewport(fitViewport(markers));
  }, [hotels, setMarkers, setViewport]);

  const controls = useMemo(
    () => (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {DESTINATIONS.map((city) => (
            <button
              key={city}
              onClick={() => setDest(city)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                destination === city
                  ? "bg-[#171717] text-white"
                  : "border border-[rgba(0,0,0,0.12)] text-[#6b6b66] hover:bg-[#f5f3ee]"
              }`}
            >
              {city}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TIERS.map((option) => (
            <button
              key={option}
              onClick={() => setTier(option)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                tier === option
                  ? "bg-[#f3efe9] text-[#8a5a3b]"
                  : "text-[#8f8f88] hover:text-[#171717]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    ),
    [destination, tier]
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <DiscoveryShell
        eyebrow="Stays"
        title={`Hotels in ${destination}`}
        description="Indicative nightly rates from our curated data — not live booking quotes. Select one to see it on the map."
        controls={controls}
        resultCount={hotels.length}
        loading={loading}
      >
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <PlaceCardSkeleton key={i} />
            ))}
          </div>
        )}

        {failed && !loading && (
          <UnavailableNote
            title="Hotels"
            reason="We couldn't reach the hotel service. Nothing else on the site is affected."
            onRetry={load}
          />
        )}

        {!loading && !failed && hotels.length === 0 && (
          <p className="t-body py-8 text-center">
            No {tier.toLowerCase()} stays are recorded for {destination} yet.
          </p>
        )}

        {!loading &&
          hotels.map((hotel, index) => (
            <DiscoveryRow
              key={hotel.id ?? hotel.name}
              markerId={`hotel-${hotel.id ?? index}`}
              image={hotel.image}
              title={hotel.name}
              category={hotel.tier}
              description={hotel.description}
              meta={
                <>
                  {hotel.rating != null && (
                    <>
                      <Meta>{hotel.rating.toFixed(1)}</Meta>
                      <MetaDot />
                    </>
                  )}
                  <Meta>
                    ₹{Math.round(hotel.price_per_night).toLocaleString("en-IN")} / night
                  </Meta>
                  <MetaDot />
                  <ProvenanceBadge label="APPROXIMATE" />
                </>
              }
            />
          ))}

        <p className="t-caption mt-6 border-t border-[rgba(0,0,0,0.08)] pt-4">
          Rates are indicative and change. Confirm with the property before booking —
          we have no live availability or booking integration.
        </p>
      </DiscoveryShell>

      <Footer />
    </div>
  );
}
