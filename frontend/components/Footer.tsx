import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-black/10 bg-[#171717] text-[#a0a09a]">
      <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          
          {/* Col 1: Brand & SIH */}
          <div className="md:col-span-1">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-white md:text-2xl"
            >
              Smart<span className="text-[#d97745]">Tourism</span>
            </Link>
            <p className="mt-3 text-xs leading-6 text-[#8e8e88]">
              An AI-powered unified tourism ecosystem connecting travelers with authentic local businesses, smart budgeting, and optimized journeys.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Smart India Hackathon 2026
            </div>
          </div>

          {/* Col 2: Core Platform */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white">
              Platform Features
            </p>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link href="/planner" className="hover:text-white transition">
                  AI Trip Planner
                </Link>
              </li>
              <li>
                <Link href="/itinerary" className="hover:text-white transition">
                  Day-by-Day Itineraries
                </Link>
              </li>
              <li>
                <span className="text-[#6e6e68]">Deterministic Budget Optimizer</span>
              </li>
              <li>
                <span className="text-[#6e6e68]">Intelligent Route Clustering</span>
              </li>
              <li>
                <span className="text-[#6e6e68]">Real-time Travel Concierge</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Ecosystem Hub */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white">
              Tourism Ecosystem
            </p>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <span className="text-[#6e6e68]">Local Hotel & Homestay Connect</span>
              </li>
              <li>
                <span className="text-[#6e6e68]">Regional Artisans & Street Food</span>
              </li>
              <li>
                <span className="text-[#6e6e68]">Heritage Preservation Guides</span>
              </li>
              <li>
                <span className="text-[#6e6e68]">Sustainable Tourism Promotion</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Hackathon Credentials */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white">
              SIH 2026 Project
            </p>
            <div className="mt-4 space-y-2 text-xs">
              <p><span className="text-white">Team:</span> Travel Warriors</p>
              <p><span className="text-white">Problem ID:</span> SIH26204</p>
              <p><span className="text-white">Theme:</span> Travel and Tourism</p>
              <p className="text-[11px] leading-5 text-[#73736d] pt-2">
                Referenced with India Tourism Data Portal & WTTC India Economic Impact metrics.
              </p>
            </div>
          </div>

        </div>

        <div className="mt-12 flex flex-col items-center justify-between border-t border-white/10 pt-8 text-xs text-[#73736d] sm:flex-row">
          <p>© 2026 SmartTourism Ecosystem · Built for Smart India Hackathon 2026</p>
          <p className="mt-3 sm:mt-0">Powered by Gemini 3.6 Flash & Open-Meteo</p>
        </div>
      </div>
    </footer>
  );
}
