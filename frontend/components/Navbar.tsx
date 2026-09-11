"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-[#fbfbfa]/90 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-5 md:px-8">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-[#171717] md:text-2xl"
          >
            <span>Smart<span className="text-[#d97745]">Tourism</span></span>
          </Link>
          <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 sm:inline-flex">
            SIH 2026
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-[#666660] md:flex">
          <Link
            href="/"
            className="transition hover:text-[#171717]"
          >
            Home
          </Link>
          <Link
            href="/planner"
            className="transition hover:text-[#171717]"
          >
            AI Planner
          </Link>
          <Link
            href="/itinerary"
            className="transition hover:text-[#171717]"
          >
            Itinerary
          </Link>
          <a
            href="#tourism-hub"
            className="transition hover:text-[#171717]"
          >
            Tourism Hub
          </a>
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <Link
            href="/planner"
            className="inline-flex items-center gap-2 rounded-full bg-[#171717] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-black hover:shadow md:text-sm"
          >
            <span>Plan My Trip</span>
            <span className="text-xs">→</span>
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-gray-700 md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-black/5 bg-[#fbfbfa] px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium text-[#444]">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-black"
            >
              Home
            </Link>
            <Link
              href="/planner"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-black"
            >
              AI Trip Planner
            </Link>
            <Link
              href="/itinerary"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-black"
            >
              My Itinerary
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
