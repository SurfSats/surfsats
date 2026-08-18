import type { Metadata } from "next";
import { IBM_Plex_Mono, Oxanium } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const oxanium = Oxanium({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "SurfSats",
    template: "%s · SurfSats",
  },
  description:
    "Bitcoin + surf lifestyle. Stories from the lineup and a global jukebox you can feed with 21 sats.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plexMono.variable} ${oxanium.variable} flex min-h-screen flex-col bg-background font-mono text-foreground`}
      >
        <div className="crt-overlay" aria-hidden="true" />
        <div className="noise-overlay" aria-hidden="true" />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
