import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}