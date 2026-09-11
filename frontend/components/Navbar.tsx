"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import NotificationCenter from "./NotificationCenter";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/planner", label: "Plan" },
  { href: "/itinerary", label: "Itinerary" },
  { href: "/reality", label: "Reality Check" },
  { href: "/hotels", label: "Hotels" },
  { href: "/places", label: "Places" },
];

export default function Navbar({
  transparent = false,
}: {
  /** Home only: floats over the map hero rather than sitting on a solid bar. */
  transparent?: boolean;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header
      className={`sticky top-0 z-50 ${
        transparent
          ? "border-b border-white/0 bg-gradient-to-b from-black/55 via-black/20 to-transparent"
          : "border-b border-white/8 bg-[#101316]/92 backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-5 md:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-baseline gap-2 text-xl font-semibold tracking-tight text-white md:text-2xl"
          >
            <span>
              AI<span className="text-[#e0935f]"> Tourism</span>
            </span>
          </Link>
          <span className="hidden text-[11px] font-medium text-[#9b9a93] sm:inline">
            Travel with the full picture
          </span>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-7 text-sm font-medium text-[#b3b2ab] md:flex">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition hover:text-white ${
                  active ? "text-white" : ""
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <NotificationCenter />

          <Link
            href="/planner"
            className="hidden rounded-full bg-[#e0935f] px-5 py-2.5 text-xs font-semibold text-[#171009] transition hover:bg-[#eba46f] sm:inline-flex md:text-sm"
          >
            Plan a trip
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[#c9c8c2] md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {mobileMenuOpen ? (
                <>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </>
              ) : (
                <>
                  <path d="M3 12h18" />
                  <path d="M3 6h18" />
                  <path d="M3 18h18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-white/8 bg-[#101316] px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium text-[#b3b2ab]">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
