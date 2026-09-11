"use client";

/**
 * Shared map state.
 *
 * The map is treated as a canvas that every surface reads from and writes to -
 * not a component owned by any one page. Planner, Itinerary, Reality Check,
 * Hotels, Places and the Assistant all subscribe to this single store, so
 * selecting a day in a list and flying the map are the same state change
 * rather than two systems kept loosely in sync.
 *
 * Deliberately built on useReducer + context rather than a state library: the
 * project has no store dependency today, and the state here is small and
 * highly structured, which is exactly what a reducer is good at.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

export type MarkerCategory =
  | "place"
  | "hotel"
  | "food"
  | "activity"
  | "beach"
  | "culture";

/** One addressable thing on the canvas. */
export type MapMarker = {
  id: string;
  name: string;
  category: MarkerCategory;
  lat: number;
  lng: number;

  /** Which itinerary day this belongs to, when it belongs to one. */
  day?: number;
  /** Order within that day, used to draw the route. */
  sequence?: number;

  image?: string;
  rating?: number;
  cost?: number;
  description?: string;
  duration?: string;

  /** An alert names this stop. Drives the quiet "affected" marker state. */
  affected?: boolean;
  affectedReason?: string;

  /** A suggested area rather than a verified venue. */
  isPlaceholder?: boolean;
};

export type MapViewport = {
  lat: number;
  lng: number;
  zoom: number;
};

export type MapState = {
  destination: string | null;
  viewport: MapViewport | null;

  markers: MapMarker[];
  /** Empty means "show everything". */
  activeCategories: MarkerCategory[];

  selectedMarkerId: string | null;
  hoveredMarkerId: string | null;

  /** null means "show the whole trip" rather than one day. */
  activeDay: number | null;

  /** Set when the map should animate rather than jump. */
  flyToken: number;

  isFullScreen: boolean;
};

type Action =
  | { type: "SET_DESTINATION"; destination: string; viewport?: MapViewport }
  | { type: "SET_MARKERS"; markers: MapMarker[] }
  | { type: "SET_VIEWPORT"; viewport: MapViewport; animate?: boolean }
  | { type: "TOGGLE_CATEGORY"; category: MarkerCategory }
  | { type: "SET_CATEGORIES"; categories: MarkerCategory[] }
  | { type: "SELECT_MARKER"; id: string | null }
  | { type: "HOVER_MARKER"; id: string | null }
  | { type: "SET_ACTIVE_DAY"; day: number | null }
  | { type: "SET_FULLSCREEN"; value: boolean };

const INITIAL_STATE: MapState = {
  destination: null,
  viewport: null,
  markers: [],
  activeCategories: [],
  selectedMarkerId: null,
  hoveredMarkerId: null,
  activeDay: null,
  flyToken: 0,
  isFullScreen: false,
};

function reducer(state: MapState, action: Action): MapState {
  switch (action.type) {
    case "SET_DESTINATION":
      // A new destination invalidates the current selection and day.
      return {
        ...state,
        destination: action.destination,
        viewport: action.viewport ?? state.viewport,
        selectedMarkerId: null,
        activeDay: null,
        flyToken: action.viewport ? state.flyToken + 1 : state.flyToken,
      };

    case "SET_MARKERS": {
      // Keep the selection only if it still exists in the new set.
      const stillExists = state.markers.length
        ? action.markers.some((m) => m.id === state.selectedMarkerId)
        : false;
      return {
        ...state,
        markers: action.markers,
        selectedMarkerId: stillExists ? state.selectedMarkerId : null,
      };
    }

    case "SET_VIEWPORT":
      return {
        ...state,
        viewport: action.viewport,
        flyToken: action.animate === false ? state.flyToken : state.flyToken + 1,
      };

    case "TOGGLE_CATEGORY": {
      const active = state.activeCategories.includes(action.category)
        ? state.activeCategories.filter((c) => c !== action.category)
        : [...state.activeCategories, action.category];
      return { ...state, activeCategories: active };
    }

    case "SET_CATEGORIES":
      return { ...state, activeCategories: action.categories };

    case "SELECT_MARKER":
      return { ...state, selectedMarkerId: action.id };

    case "HOVER_MARKER":
      return { ...state, hoveredMarkerId: action.id };

    case "SET_ACTIVE_DAY":
      // Changing day clears a selection that belongs to a different day.
      return {
        ...state,
        activeDay: action.day,
        selectedMarkerId: null,
        flyToken: state.flyToken + 1,
      };

    case "SET_FULLSCREEN":
      return { ...state, isFullScreen: action.value };

    default:
      return state;
  }
}

type MapContextValue = {
  state: MapState;

  setDestination: (destination: string, viewport?: MapViewport) => void;
  setMarkers: (markers: MapMarker[]) => void;
  setViewport: (viewport: MapViewport, animate?: boolean) => void;
  toggleCategory: (category: MarkerCategory) => void;
  setCategories: (categories: MarkerCategory[]) => void;
  selectMarker: (id: string | null) => void;
  hoverMarker: (id: string | null) => void;
  setActiveDay: (day: number | null) => void;
  setFullScreen: (value: boolean) => void;

  /** Markers after day and category filtering. */
  visibleMarkers: MapMarker[];
  /** All markers, with a `dimmed` flag rather than removal - keeps context. */
  renderedMarkers: (MapMarker & { dimmed: boolean })[];
  selectedMarker: MapMarker | null;
  /** The active day's stops in sequence, for drawing the route. */
  routePath: MapMarker[];
};

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const setDestination = useCallback(
    (destination: string, viewport?: MapViewport) =>
      dispatch({ type: "SET_DESTINATION", destination, viewport }),
    []
  );
  const setMarkers = useCallback(
    (markers: MapMarker[]) => dispatch({ type: "SET_MARKERS", markers }),
    []
  );
  const setViewport = useCallback(
    (viewport: MapViewport, animate = true) =>
      dispatch({ type: "SET_VIEWPORT", viewport, animate }),
    []
  );
  const toggleCategory = useCallback(
    (category: MarkerCategory) => dispatch({ type: "TOGGLE_CATEGORY", category }),
    []
  );
  const setCategories = useCallback(
    (categories: MarkerCategory[]) => dispatch({ type: "SET_CATEGORIES", categories }),
    []
  );
  const selectMarker = useCallback(
    (id: string | null) => dispatch({ type: "SELECT_MARKER", id }),
    []
  );
  const hoverMarker = useCallback(
    (id: string | null) => dispatch({ type: "HOVER_MARKER", id }),
    []
  );
  const setActiveDay = useCallback(
    (day: number | null) => dispatch({ type: "SET_ACTIVE_DAY", day }),
    []
  );
  const setFullScreen = useCallback(
    (value: boolean) => dispatch({ type: "SET_FULLSCREEN", value }),
    []
  );

  const matchesCategory = useCallback(
    (marker: MapMarker) =>
      state.activeCategories.length === 0 ||
      state.activeCategories.includes(marker.category),
    [state.activeCategories]
  );

  const matchesDay = useCallback(
    (marker: MapMarker) =>
      state.activeDay === null ||
      marker.day === undefined ||
      marker.day === state.activeDay,
    [state.activeDay]
  );

  const visibleMarkers = useMemo(
    () => state.markers.filter((m) => matchesCategory(m) && matchesDay(m)),
    [state.markers, matchesCategory, matchesDay]
  );

  /**
   * Other days are dimmed rather than hidden. Removing them entirely loses the
   * spatial context of where the rest of the trip sits.
   */
  const renderedMarkers = useMemo(
    () =>
      state.markers
        .filter(matchesCategory)
        .map((marker) => ({ ...marker, dimmed: !matchesDay(marker) })),
    [state.markers, matchesCategory, matchesDay]
  );

  const selectedMarker = useMemo(
    () => state.markers.find((m) => m.id === state.selectedMarkerId) ?? null,
    [state.markers, state.selectedMarkerId]
  );

  const routePath = useMemo(() => {
    if (state.activeDay === null) return [];
    return state.markers
      .filter((m) => m.day === state.activeDay && m.sequence !== undefined)
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }, [state.markers, state.activeDay]);

  const value = useMemo<MapContextValue>(
    () => ({
      state,
      setDestination,
      setMarkers,
      setViewport,
      toggleCategory,
      setCategories,
      selectMarker,
      hoverMarker,
      setActiveDay,
      setFullScreen,
      visibleMarkers,
      renderedMarkers,
      selectedMarker,
      routePath,
    }),
    [
      state, setDestination, setMarkers, setViewport, toggleCategory,
      setCategories, selectMarker, hoverMarker, setActiveDay, setFullScreen,
      visibleMarkers, renderedMarkers, selectedMarker, routePath,
    ]
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapState(): MapContextValue {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMapState must be used inside a MapProvider");
  }
  return context;
}

/* ------------------------------ Helpers -------------------------------- */

/** Viewport that frames a set of markers, with a little breathing room. */
export function fitViewport(
  markers: { lat: number; lng: number }[],
  fallback: MapViewport = { lat: 17.385, lng: 78.4867, zoom: 11 }
): MapViewport {
  if (markers.length === 0) return fallback;

  if (markers.length === 1) {
    return { lat: markers[0].lat, lng: markers[0].lng, zoom: 14 };
  }

  const lats = markers.map((m) => m.lat);
  const lngs = markers.map((m) => m.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const spread = Math.max(maxLat - minLat, maxLng - minLng);

  // Rough zoom fit. Google's tile scheme roughly halves the visible span per
  // zoom level, so stepping through thresholds is accurate enough here and
  // avoids pulling in a projection library.
  let zoom = 13;
  if (spread > 4) zoom = 6;
  else if (spread > 2) zoom = 7;
  else if (spread > 1) zoom = 8;
  else if (spread > 0.5) zoom = 9;
  else if (spread > 0.25) zoom = 10;
  else if (spread > 0.12) zoom = 11;
  else if (spread > 0.06) zoom = 12;

  return {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
    zoom,
  };
}

/** Maps a backend activity category onto the limited marker-colour system. */
export function toMarkerCategory(category?: string | null): MarkerCategory {
  const lowered = (category ?? "").toLowerCase();
  if (lowered.includes("hotel")) return "hotel";
  if (lowered.includes("food")) return "food";
  if (lowered.includes("beach")) return "beach";
  if (lowered.includes("adventure") || lowered.includes("nature")) return "activity";
  if (lowered.includes("culture") || lowered.includes("museum")) return "culture";
  return "place";
}
