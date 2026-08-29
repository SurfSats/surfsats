import type { Metadata } from "next";
import { IBM_Plex_Mono, Oxanium } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { LiveSignalBar } from "@/components/layout/LiveSignalBar";
import { Navbar } from "@/components/layout/Navbar";
import { Watermark } from "@/components/layout/Watermark";
import { getTimechainSnapshot } from "@/lib/timechain";
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

const ogImage = "https://www.surfsats.com/og-home.png";
const ogDescription = "No banks. No bosses. No closed beach signs.";

export const metadata: Metadata = {
  title: {
    default: "SurfSats",
    template: "%s · SurfSats",
  },
  description:
    "Bitcoin + surf lifestyle. Stories from the lineup and a global jukebox you can feed with 21 sats.",
  openGraph: {
    title: "SurfSats",
    description: ogDescription,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImage],
  },
};

export const revalidate = 20;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const snapshot = await getTimechainSnapshot();

  return (
    <html lang="en">
      <body
        className={`${plexMono.variable} ${oxanium.variable} flex min-h-screen flex-col bg-background font-mono text-foreground`}
      >
        <Watermark />
        <div className="crt-overlay" aria-hidden="true" />
        <div className="noise-overlay" aria-hidden="true" />
        <div className="sticky top-0 z-50">
          <Navbar initial={snapshot} />
          <LiveSignalBar initial={snapshot} />
        </div>
        <main className="relative z-0 min-w-0 flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
