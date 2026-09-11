"use client";

/**
 * The navbar notification centre.
 *
 * Reads the same alert objects everything else uses - there is no separate
 * notification format. Each entry shows title, explanation, time, severity,
 * the affected day/place, and one action.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  dismissNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/api";
import type { TravelNotification } from "../types/reality";
import {
  SEVERITY_STYLES,
  SeverityChip,
  relativeTime,
} from "./reality/RealityPrimitives";

const REFRESH_MS = 120_000;

export default function NotificationCenter({ tripId }: { tripId?: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TravelNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const response = await fetchNotifications(tripId);
    if (response) {
      setItems(response.notifications);
      setUnread(response.unread_count);
    }
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;

    function onClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) load();
  }

  async function handleRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnread((n) => Math.max(0, n - 1));
    await markNotificationRead(id);
  }

  async function handleDismiss(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await dismissNotification(id);
    load();
  }

  async function handleReadAll() {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
    await markAllNotificationsRead(tripId);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[#c9c8c2] transition hover:bg-white/10 hover:text-white"
      >
        {/* Bell, drawn rather than an emoji, to match the restrained UI */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#d97745] px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,400px)] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#171717]">
                Travel updates
              </p>
              <p className="text-[11px] text-[#8f8f88]">
                {items.length === 0
                  ? "Nothing needs your attention"
                  : `${items.length} update${items.length === 1 ? "" : "s"}`}
              </p>
            </div>
            {unread > 0 && (
              <button
                onClick={handleReadAll}
                className="text-[11px] font-semibold text-[#8a5a3b] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && (
              <div className="space-y-2 p-4">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-xl bg-neutral-100"
                  />
                ))}
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium text-[#171717]">All clear</p>
                <p className="mt-1 text-xs leading-relaxed text-[#8f8f88]">
                  No weather, traffic or local issues are currently affecting
                  your plan. We check again every couple of minutes.
                </p>
              </div>
            )}

            {!loading &&
              items.map((item) => {
                const style =
                  SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.INFO;
                const when = relativeTime(item.detected_at);

                return (
                  <div
                    key={item.id}
                    className={`flex gap-3 border-b border-black/5 px-4 py-3.5 transition ${
                      item.is_read ? "bg-white" : "bg-[#fdfbf9]"
                    }`}
                  >
                    <span
                      className={`mt-1 h-full w-0.5 shrink-0 rounded-full ${style.bar}`}
                      aria-hidden="true"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <SeverityChip severity={item.severity} />
                        {item.affected_trip_day && (
                          <span className="text-[10px] font-semibold text-[#8a5a3b]">
                            Day {item.affected_trip_day}
                          </span>
                        )}
                        {when && (
                          <span className="text-[10px] text-[#b5b5ad]">
                            {when}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-[13px] font-semibold leading-snug text-[#171717]">
                        {item.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[#6b6b66]">
                        {item.message}
                      </p>

                      {item.affected_place && (
                        <p className="mt-1 text-[10px] text-[#8f8f88]">
                          Affects: {item.affected_place}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {item.action && renderAction(item, () =>
                          setOpen(false)
                        )}
                        {!item.is_read && (
                          <button
                            onClick={() => handleRead(item.id)}
                            className="text-[10px] font-medium text-[#8f8f88] hover:text-[#171717]"
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          onClick={() => handleDismiss(item.id)}
                          className="text-[10px] font-medium text-[#8f8f88] hover:text-[#171717]"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="border-t border-black/5 px-4 py-2.5">
            <Link
              href="/reality"
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold text-[#171717] hover:underline"
            >
              Open Reality Check →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function renderAction(item: TravelNotification, close: () => void) {
  const action = item.action!;
  const className =
    "rounded-full bg-[#171717] px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-black";

  if (action.target === "source" && action.url) {
    return (
      <a
        href={action.url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {action.label}
      </a>
    );
  }

  if (action.target === "itinerary") {
    return (
      <Link
        href={`/itinerary?day=${action.trip_day ?? 1}`}
        onClick={close}
        className={className}
      >
        {action.label}
      </Link>
    );
  }

  return (
    <Link
      href={action.section ? `/reality#${action.section}` : "/reality"}
      onClick={close}
      className={className}
    >
      {action.label}
    </Link>
  );
}
