"use client";

/**
 * Map-led discovery layout, shared by Hotels, Places and Explore.
 *
 * The map leads and the list is secondary, synced to the same store: hovering a
 * list row highlights its marker, clicking one selects it and flies the map,
 * and clicking a marker scrolls the list. One shell means those three pages
 * cannot drift apart in behaviour.
 *
 * On mobile the map becomes a full-screen mode behind a toggle rather than a
 * squeezed panel.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import MapCanvas from "./MapCanvas";
import MarkerPreview from "./MarkerPreview";
import { useMapState } from "../../lib/mapStore";
import { Meta } from "../ui/Primitives";

type DiscoveryShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  /** Destination picker, filters, etc. */
  controls?: ReactNode;
  /** One row per marker; keyed by marker id for scroll-into-view. */
  children: ReactNode;
  resultCount?: number;
  loading?: boolean;
  onAddToItinerary?: (markerId: string) => void;
};

export default function DiscoveryShell({
  eyebrow,
  title,
  description,
  controls,
  children,
  resultCount,
  loading,
  onAddToItinerary,
}: DiscoveryShellProps) {
  const { state } = useMapState();
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  /* Map → UI: bring the selected row into view. */
  useEffect(() => {
    if (!state.selectedMarkerId || !listRef.current) return;
    const row = listRef.current.querySelector(
      `[data-marker-id="${state.selectedMarkerId}"]`
    );
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state.selectedMarkerId]);

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:h-[calc(100vh-72px)] lg:flex-row">
        {/* List column */}
        <div className="flex min-w-0 flex-col lg:w-[46%] lg:max-w-[640px]">
          <header className="border-b border-[rgba(0,0,0,0.08)] px-5 py-6 md:px-8">
            <p className="t-label text-[#8a5a3b]">{eyebrow}</p>
            <h1 className="t-headline mt-1.5">{title}</h1>
            {description && <p className="t-body mt-2 max-w-xl">{description}</p>}
            {controls && <div className="mt-4">{controls}</div>}
            {resultCount !== undefined && !loading && (
              <Meta className="mt-3 block">
                {resultCount} result{resultCount === 1 ? "" : "s"}
                {state.activeCategories.length > 0 && " in this filter"}
              </Meta>
            )}
          </header>

          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-5 py-4 md:px-8"
          >
            {children}
          </div>
        </div>

        {/* Map column — leads the page */}
        <aside className="relative hidden lg:block lg:flex-1">
          <MapCanvas />
          <MarkerPreview onAddToItinerary={onAddToItinerary} />
        </aside>
      </div>

      {/* Mobile map mode */}
      <button
        onClick={() => setMobileMapOpen(true)}
        className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full bg-[#171717] px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg lg:hidden"
      >
        Map
      </button>

      {mobileMapOpen && (
        <div className="animate-fade-in fixed inset-0 z-50 lg:hidden">
          <MapCanvas />
          <MarkerPreview onAddToItinerary={onAddToItinerary} />
          <button
            onClick={() => setMobileMapOpen(false)}
            className="absolute right-4 top-4 z-30 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#171717] shadow-lg"
          >
            Close map
          </button>
        </div>
      )}
    </>
  );
}

/** A list row that stays in step with its marker. */
export function DiscoveryRow({
  markerId,
  image,
  title,
  category,
  meta,
  description,
  trailing,
}: {
  markerId: string;
  image?: string;
  title: string;
  category?: string;
  meta?: ReactNode;
  description?: string;
  trailing?: ReactNode;
}) {
  const { state, selectMarker, hoverMarker } = useMapState();
  const selected = state.selectedMarkerId === markerId;

  return (
    <article
      data-marker-id={markerId}
      onClick={() => selectMarker(markerId)}
      onMouseEnter={() => hoverMarker(markerId)}
      onMouseLeave={() => hoverMarker(null)}
      className={`flex cursor-pointer gap-4 rounded-2xl p-3 transition ${
        selected ? "bg-[#f5f3ee]" : "hover:bg-[#faf9f7]"
      }`}
    >
      <div className="h-[88px] w-[110px] shrink-0 overflow-hidden rounded-xl bg-[#eeece7]">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        {category && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f8f88]">
            {category}
          </p>
        )}
        <h3 className="t-title mt-0.5 truncate text-[#171717]">{title}</h3>
        {meta && <div className="mt-1 flex flex-wrap items-center">{meta}</div>}
        {description && (
          <p className="t-body mt-1 line-clamp-2 text-[13px]">{description}</p>
        )}
      </div>

      {trailing && <div className="shrink-0 text-right">{trailing}</div>}
    </article>
  );
}
