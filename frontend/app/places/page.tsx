"use client";

/**
 * Places — map-led discovery.
 *
 * New surface, same shell as Hotels so the two behave identically. Places are
 * fetched by destination id, so the destination list is resolved first.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import DiscoveryShell, { DiscoveryRow } from "../../components/map/DiscoveryShell";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import {
  Meta,
  MetaDot,
  PlaceCardSkeleton,
  UnavailableNote,
} from "../../components/ui/Primitives";
import {
  fetchDestinations,
  fetchPlaces,
  type DestinationRow,
  type PlaceRow,
} from "../../lib/api";
import {
  fitViewport,
  toMarkerCategory,
  useMapState,
  type MapMarker,
} from "../../lib/mapStore";

/** Category images, reusing the same approach the backend already uses. */
const CATEGORY_IMAGES: Record<string, string> = {
  historical:
    "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=600&q=80",
  culture:
    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=600&q=80",
  food: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80",
  nature:
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
  adventure:
    "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=600&q=80",
  beach:
    "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80",
  shopping:
    "https://images.unsplash.com/photo-1481437156560-3205f6a55735?auto=format&fit=crop&w=600&q=80",
};

function imageFor(category?: string | null) {
  return (
    CATEGORY_IMAGES[(category ?? "").toLowerCase()] ?? CATEGORY_IMAGES.historical
  );
}

export default function PlacesPage() {
  const { setMarkers, setViewport, setDestination, setCategories } = useMapState();

  const [destinations, setDestinations] = useState<DestinationRow[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      const rows = await fetchDestinations();
      if (!rows || rows.length === 0) {
        setFailed(true);
        setLoading(false);
        return;
      }
      setDestinations(rows);
      setActiveId(rows[0].id);
    })();
    setCategories([]);
  }, [setCategories]);

  const activeDestination = useMemo(
    () => destinations.find((d) => d.id === activeId) ?? null,
    [destinations, activeId]
  );

  const load = useCallback(async () => {
    if (activeId == null) return;
    setLoading(true);
    setFailed(false);
    const rows = await fetchPlaces(activeId);
    if (!rows) {
      setFailed(true);
      setPlaces([]);
    } else {
      setPlaces(rows);
    }
    setLoading(false);
  }, [activeId]);

  useEffect(() => {
    if (activeId == null) return;
    load();
  }, [activeId, load]);

  useEffect(() => {
    if (activeDestination) setDestination(activeDestination.name);
  }, [activeDestination, setDestination]);

  useEffect(() => {
    const markers: MapMarker[] = places
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((place) => ({
        id: `place-${place.id}`,
        name: place.name,
        category: toMarkerCategory(place.category),
        lat: place.latitude as number,
        lng: place.longitude as number,
        image: imageFor(place.category),
        rating: place.rating ?? undefined,
        description: place.description ?? undefined,
      }));

    setMarkers(markers);
    if (markers.length > 0) setViewport(fitViewport(markers));
  }, [places, setMarkers, setViewport]);

  const controls = (
    <div className="flex flex-wrap gap-1.5">
      {destinations.map((row) => (
        <button
          key={row.id}
          onClick={() => setActiveId(row.id)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            activeId === row.id
              ? "bg-[#171717] text-white"
              : "border border-[rgba(0,0,0,0.12)] text-[#6b6b66] hover:bg-[#f5f3ee]"
          }`}
        >
          {row.name}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <DiscoveryShell
        eyebrow="Discover"
        title={
          activeDestination ? `Places in ${activeDestination.name}` : "Places"
        }
        description="Researched attractions, filterable by category on the map. Select one to centre it."
        controls={controls}
        resultCount={places.length}
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
            title="Places"
            reason="We couldn't reach the places service. Nothing else on the site is affected."
            onRetry={load}
          />
        )}

        {!loading &&
          places.map((place) => (
            <DiscoveryRow
              key={place.id}
              markerId={`place-${place.id}`}
              image={imageFor(place.category)}
              title={place.name}
              category={place.category}
              description={place.description ?? undefined}
              meta={
                <>
                  {place.rating != null && (
                    <>
                      <Meta>{place.rating.toFixed(1)}</Meta>
                      <MetaDot />
                    </>
                  )}
                  <Meta>
                    {place.price_level === 1
                      ? "Inexpensive"
                      : place.price_level === 2
                      ? "Moderate"
                      : place.price_level === 3
                      ? "Premium"
                      : "Price varies"}
                  </Meta>
                </>
              }
            />
          ))}
      </DiscoveryShell>

      <Footer />
    </div>
  );
}
