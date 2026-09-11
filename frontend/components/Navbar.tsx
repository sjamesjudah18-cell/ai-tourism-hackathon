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
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-[#fbfbfa]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-5 md:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-baseline gap-2 text-xl font-semibold tracking-tight text-[#171717] md:text-2xl"
          >
            <span>
              AI<span className="text-[#d97745]"> Tourism</span>
            </span>
          </Link>
          <span className="hidden text-[11px] font-medium text-[#8f8f88] sm:inline">
            Travel with the full picture
          </span>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-7 text-sm font-medium text-[#6b6b66] md:flex">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition hover:text-[#171717] ${
                  active ? "text-[#171717]" : ""
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
            className="hidden rounded-full bg-[#171717] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-black sm:inline-flex md:text-sm"
          >
            Plan a trip
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[#55554f] md:hidden"
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
        <div className="border-b border-black/5 bg-[#fbfbfa] px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium text-[#55554f]">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#171717]"
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
