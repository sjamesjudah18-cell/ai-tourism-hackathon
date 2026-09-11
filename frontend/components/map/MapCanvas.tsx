"use client";

/**
 * The shared map canvas.
 *
 * Renders whatever is in the map store and writes selections back to it. It
 * owns no content state of its own, so Itinerary, Hotels, Places, Reality Check
 * and the Assistant all drive the same surface rather than each mounting their
 * own map with its own private state.
 *
 * Default Google chrome is suppressed (see globals.css) in favour of controls
 * that match the type system.
 */

import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { useEffect, useMemo } from "react";
import {
  fitViewport,
  useMapState,
  type MapMarker,
  type MarkerCategory,
} from "../../lib/mapStore";

/** One colour per category — the limited system, not ad hoc per feature. */
const MARKER_COLORS: Record<MarkerCategory, string> = {
  place: "#171717",
  hotel: "#6366f1",
  food: "#d97745",
  activity: "#059669",
  beach: "#0891b2",
  culture: "#7c3aed",
};

export const CATEGORY_LABELS: Record<MarkerCategory, string> = {
  place: "Sights",
  hotel: "Hotels",
  food: "Food",
  activity: "Activities",
  beach: "Beaches",
  culture: "Culture",
};

/**
 * Drives the underlying map imperatively when store viewport changes.
 * `flyToken` increments on every intentional move, so repeated moves to the
 * same coordinates still animate.
 */
function ViewportController() {
  const map = useMap();
  const { state } = useMapState();

  useEffect(() => {
    if (!map || !state.viewport) return;

    map.panTo({ lat: state.viewport.lat, lng: state.viewport.lng });
    // Zoom is set separately so the pan animation is not cut short by it.
    const timer = window.setTimeout(() => {
      map.setZoom(state.viewport!.zoom);
    }, 120);

    return () => window.clearTimeout(timer);
    // flyToken is the intent signal; viewport alone would re-fire on identity
    // changes that are not user-initiated moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, state.flyToken]);

  return null;
}

/** Draws the active day's route as a soft dotted line between its stops. */
function RouteLine() {
  const map = useMap();
  // Loading the library through the hook keeps this typed without depending on
  // the `google` global being present at compile time. Polyline lives in
  // "maps", but the SymbolPath enum lives in "core" — both must be loaded.
  const mapsLibrary = useMapsLibrary("maps");
  const coreLibrary = useMapsLibrary("core");
  const { routePath } = useMapState();

  useEffect(() => {
    if (!map || !mapsLibrary || !coreLibrary || routePath.length < 2) return;

    const line = new mapsLibrary.Polyline({
      path: routePath.map((m) => ({ lat: m.lat, lng: m.lng })),
      geodesic: true,
      strokeColor: "#171717",
      // Dotted rather than solid: the real route follows roads we have not
      // computed, and a solid line would overstate what we actually know.
      strokeOpacity: 0,
      icons: [
        {
          icon: {
            path: coreLibrary.SymbolPath.CIRCLE,
            fillOpacity: 1,
            fillColor: "#171717",
            strokeOpacity: 0,
            scale: 2,
          },
          offset: "0",
          repeat: "12px",
        },
      ],
    });

    line.setMap(map);
    return () => line.setMap(null);
  }, [map, mapsLibrary, coreLibrary, routePath]);

  return null;
}

function MarkerPin({
  marker,
  dimmed,
  selected,
  onSelect,
  onHover,
}: {
  marker: MapMarker;
  dimmed: boolean;
  selected: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
}) {
  const color = MARKER_COLORS[marker.category] ?? MARKER_COLORS.place;

  return (
    <AdvancedMarker
      position={{ lat: marker.lat, lng: marker.lng }}
      title={marker.name}
      onClick={onSelect}
      zIndex={selected ? 100 : dimmed ? 1 : 10}
    >
      <div
        className="group relative cursor-pointer"
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        style={{ opacity: dimmed ? 0.32 : 1, transition: "opacity 240ms" }}
      >
        {/* Quiet ring for alert-affected stops, rather than a loud red pin */}
        {marker.affected && !dimmed && (
          <span
            className="animate-affected-ring absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ backgroundColor: "#d97706" }}
            aria-hidden="true"
          />
        )}

        <span
          className={`relative flex items-center justify-center rounded-full border-2 border-white shadow-md transition-transform duration-200 group-hover:scale-110 ${
            selected ? "h-6 w-6" : "h-4 w-4"
          }`}
          style={{
            backgroundColor: color,
            boxShadow: selected
              ? `0 0 0 4px ${color}33, 0 2px 8px rgba(0,0,0,0.25)`
              : undefined,
          }}
        >
          {marker.sequence !== undefined && !dimmed && (
            <span className="text-[9px] font-bold leading-none text-white">
              {marker.sequence + 1}
            </span>
          )}
        </span>

        {/* Hover label */}
        <span className="pointer-events-none absolute bottom-7 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#171717] px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg group-hover:block">
          {marker.name}
          {marker.affected && (
            <span className="ml-1.5 text-amber-300">needs attention</span>
          )}
        </span>
      </div>
    </AdvancedMarker>
  );
}

export default function MapCanvas({
  className = "",
  showCategoryFilter = true,
}: {
  className?: string;
  showCategoryFilter?: boolean;
}) {
  const {
    state,
    renderedMarkers,
    selectMarker,
    hoverMarker,
    toggleCategory,
    setViewport,
  } = useMapState();

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const center = useMemo(() => {
    if (state.viewport) {
      return { lat: state.viewport.lat, lng: state.viewport.lng };
    }
    return fitViewport(renderedMarkers.filter((m) => !m.dimmed));
  }, [state.viewport, renderedMarkers]);

  /** Categories actually present, so we never offer an empty filter. */
  const availableCategories = useMemo(() => {
    const seen = new Set<MarkerCategory>();
    state.markers.forEach((m) => seen.add(m.category));
    return Array.from(seen);
  }, [state.markers]);

  if (!apiKey) {
    return (
      <div
        className={`flex items-center justify-center bg-[#eeece7] p-8 text-center ${className}`}
      >
        <div>
          <p className="t-label">Map unavailable</p>
          <p className="t-body mt-1.5 max-w-xs">
            No Google Maps key is configured, so the map cannot load. Everything
            else on this page works.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className={`relative h-full w-full overflow-hidden bg-[#e8e6e1] ${className}`}>
        <GoogleMap
          defaultCenter={center}
          defaultZoom={state.viewport?.zoom ?? 11}
          gestureHandling="greedy"
          disableDefaultUI
          mapId="DEMO_MAP_ID"
          className="h-full w-full"
          onClick={() => selectMarker(null)}
        >
          <ViewportController />
          <RouteLine />

          {renderedMarkers.map((marker) => (
            <MarkerPin
              key={marker.id}
              marker={marker}
              dimmed={marker.dimmed}
              selected={state.selectedMarkerId === marker.id}
              onSelect={() => selectMarker(marker.id)}
              onHover={(hovering) => hoverMarker(hovering ? marker.id : null)}
            />
          ))}
        </GoogleMap>

        {/* Honest empty state instead of pins from somewhere else */}
        {renderedMarkers.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="pointer-events-auto max-w-xs rounded-2xl bg-white/95 px-4 py-3.5 text-center shadow-lg backdrop-blur">
              <p className="text-sm font-semibold text-[#171717]">
                Nothing mapped yet
              </p>
              <p className="t-caption mt-1">
                {state.destination
                  ? `We don't have mapped coordinates for ${state.destination} yet.`
                  : "Choose a destination to see it on the map."}
              </p>
            </div>
          </div>
        )}

        {/* Category filters — styled to the type system, not map-provider chrome */}
        {showCategoryFilter && availableCategories.length > 1 && (
          <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap gap-1.5">
            {availableCategories.map((category) => {
              const active =
                state.activeCategories.length === 0 ||
                state.activeCategories.includes(category);
              return (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur transition ${
                    active
                      ? "bg-[#171717] text-white"
                      : "bg-white/90 text-[#8f8f88] hover:text-[#171717]"
                  }`}
                >
                  <span
                    className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                    style={{ backgroundColor: MARKER_COLORS[category] }}
                  />
                  {CATEGORY_LABELS[category]}
                </button>
              );
            })}
          </div>
        )}

        {/* Custom zoom controls */}
        <ZoomControls onZoom={(delta) => {
          if (!state.viewport) return;
          setViewport(
            {
              ...state.viewport,
              zoom: Math.min(20, Math.max(3, state.viewport.zoom + delta)),
            },
            false
          );
        }} />
      </div>
    </APIProvider>
  );
}

function ZoomControls({ onZoom }: { onZoom: (delta: number) => void }) {
  const map = useMap();

  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col overflow-hidden rounded-xl border border-black/5 bg-white/95 shadow-sm backdrop-blur">
      {[
        { label: "+", delta: 1, title: "Zoom in" },
        { label: "−", delta: -1, title: "Zoom out" },
      ].map((control) => (
        <button
          key={control.label}
          title={control.title}
          aria-label={control.title}
          onClick={() => {
            // Drive the live map directly for responsiveness, and keep the
            // store in step so other surfaces stay accurate.
            if (map) map.setZoom((map.getZoom() ?? 11) + control.delta);
            onZoom(control.delta);
          }}
          className="flex h-8 w-8 items-center justify-center text-sm text-[#55554f] transition hover:bg-[#f5f3ee] hover:text-[#171717]"
        >
          {control.label}
        </button>
      ))}
    </div>
  );
}
