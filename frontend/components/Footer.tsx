import Link from "next/link";

/**
 * Editorial close, not a SaaS sitemap.
 *
 * The previous footer was a four-column dashboard grid with its own brand name
 * ("SmartTourism", against "AI Tourism" everywhere else) and links to features
 * that don't exist ("Local Hotel & Homestay Connect", "Heritage Preservation
 * Guides"). This says only what's true: what the product actually has, and
 * where the numbers actually come from — as quiet text, not badges.
 */

const PRODUCT_LINKS = [
  { href: "/planner", label: "Plan a trip" },
  { href: "/itinerary", label: "Itinerary" },
  { href: "/reality", label: "Reality Check" },
  { href: "/hotels", label: "Hotels" },
  { href: "/places", label: "Places" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#101316] text-[#8f8f88]">
      <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-10">
          <div className="max-w-sm">
            <Link
              href="/"
              className="text-xl font-semibold tracking-tight text-white"
            >
              AI<span className="text-[#e0935f]"> Tourism</span>
            </Link>
            <p className="t-body mt-3 max-w-xs text-[#8f8f88]">
              Real weather, realistic travel time and honest costs, checked
              against the plan you actually build — not just where to go.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-10 gap-y-6">
            <div>
              <p className="t-label text-[#6b6b66]">Product</p>
              <ul className="mt-3 space-y-2">
                {PRODUCT_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="t-body text-[#a8a89f] transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="t-label text-[#6b6b66]">Data</p>
              <ul className="mt-3 max-w-[220px] space-y-2">
                <li className="t-body text-[#a8a89f]">
                  Weather, air quality and sea conditions from Open-Meteo
                </li>
                <li className="t-body text-[#a8a89f]">
                  Local disruption reports from published news sources
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="t-caption text-[#6b6b66]">
            © 2026 AI Tourism. Built for Smart India Hackathon 2026 — Team
            Travel Warriors, Problem ID SIH26204.
          </p>
          <p className="t-caption text-[#6b6b66]">
            Figures are labelled live, estimated or approximate — never
            presented as a guarantee.
          </p>
        </div>
      </div>
    </footer>
  );
}
