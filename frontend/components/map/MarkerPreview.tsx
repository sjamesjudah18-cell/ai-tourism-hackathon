"use client";

/**
 * Marker → UI.
 *
 * Clicking a marker opens this in-context rather than navigating away, which
 * is what keeps the map feeling like a canvas you stay inside. On desktop it
 * sits as a panel over the map; on mobile it becomes a bottom sheet, which is
 * the pattern people already know from every maps app.
 */

import { CATEGORY_LABELS } from "./MapCanvas";
import { useMapState } from "../../lib/mapStore";
import {
  Button,
  CategoryLabel,
  Meta,
  MetaDot,
  ProvenanceBadge,
} from "../ui/Primitives";

export default function MarkerPreview({
  onAddToItinerary,
}: {
  onAddToItinerary?: (markerId: string) => void;
}) {
  const { selectedMarker, selectMarker } = useMapState();

  if (!selectedMarker) return null;

  const marker = selectedMarker;

  return (
    <div
      className="
        animate-sheet-up absolute inset-x-0 bottom-0 z-20 mx-auto w-full
        overflow-hidden rounded-t-2xl border-t border-black/10 bg-white shadow-2xl
        sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-[330px] sm:rounded-2xl sm:border
      "
      role="dialog"
      aria-label={marker.name}
    >
      {marker.image && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#eeece7]">
          <img
            src={marker.image}
            alt={marker.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CategoryLabel>
              {CATEGORY_LABELS[marker.category] ?? marker.category}
            </CategoryLabel>
            <h3 className="t-title mt-1 truncate text-[#171717]">
              {marker.name}
            </h3>
          </div>

          <button
            onClick={() => selectMarker(null)}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#b5b5ad] transition hover:bg-[#f5f3ee] hover:text-[#171717]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Metadata as plain text, not a row of chips */}
        <div className="mt-2 flex flex-wrap items-center">
          {marker.rating != null && (
            <>
              <Meta>{marker.rating.toFixed(1)} rating</Meta>
              <MetaDot />
            </>
          )}
          {marker.day !== undefined && (
            <>
              <Meta>Day {marker.day}</Meta>
              <MetaDot />
            </>
          )}
          {marker.duration && (
            <>
              <Meta>{marker.duration}</Meta>
              <MetaDot />
            </>
          )}
          {marker.cost != null && (
            <Meta>
              {marker.cost > 0
                ? `₹${marker.cost.toLocaleString("en-IN")}`
                : "Free"}
            </Meta>
          )}
        </div>

        {marker.description && (
          <p className="t-body mt-2.5 line-clamp-3">{marker.description}</p>
        )}

        {/* A placeholder is never passed off as a verified venue */}
        {marker.isPlaceholder && (
          <p className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-[#faf9f7] px-2.5 py-2">
            <ProvenanceBadge label="ESTIMATE" />
            <span className="t-caption flex-1">
              A suggested area to explore, not a venue we have verified. Check
              locally before planning around it.
            </span>
          </p>
        )}

        {marker.affected && marker.affectedReason && (
          <p className="mt-2.5 border-l-2 border-amber-400 bg-amber-50/60 py-2 pl-2.5 pr-2">
            <span className="t-caption text-amber-900">
              {marker.affectedReason}
            </span>
          </p>
        )}

        {onAddToItinerary && (
          <Button
            size="sm"
            className="mt-3.5 w-full"
            onClick={() => onAddToItinerary(marker.id)}
          >
            Add to itinerary
          </Button>
        )}
      </div>
    </div>
  );
}
