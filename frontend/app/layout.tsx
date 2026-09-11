import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { MapProvider } from "../lib/mapStore";

/**
 * Two faces, one job each.
 *
 * Fraunces is an editorial serif with a soft, slightly warm character - it
 * carries destination names and section titles so the product reads as travel
 * writing rather than a monitoring console. Inter handles every piece of UI and
 * body text.
 *
 * Both are self-hosted at build time by next/font, so there is no runtime
 * request to Google and no layout shift.
 */
const serifDisplay = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif-display",
  axes: ["SOFT", "WONK", "opsz"],
});

const sansUi = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-ui",
});

export const metadata: Metadata = {
  title: "AI Tourism — Travel with the full picture",
  description:
    "Travel reality intelligence: real weather, realistic travel time, honest costs and local disruptions, checked against your actual itinerary.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${serifDisplay.variable} ${sansUi.variable}`}>
      <body>
        {/* The map is shared infrastructure, so its state lives above every
            route rather than being re-created per page. */}
        <MapProvider>{children}</MapProvider>
      </body>
    </html>
  );
}
