import type { Metadata } from "next";
import { IBM_Plex_Mono, Oxanium } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { LiveSignalBar } from "@/components/layout/LiveSignalBar";
import { Navbar } from "@/components/layout/Navbar";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { Watermark } from "@/components/layout/Watermark";
import { OG_HOME, SITE_ORIGIN, pageMeta } from "@/lib/seo";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  ...pageMeta({
    title: "SurfSats · no banks, no bosses",
    description:
      "Lightning sandbox. Five machines on the floor. 21 sats. No accounts.",
    path: "/",
    absoluteTitle: true,
    image: OG_HOME,
  }),
  title: {
    default: "SurfSats · no banks, no bosses",
    template: "%s · SurfSats",
  },
  icons: {
    icon: "/brand/mark-circle-512.png",
    apple: "/brand/mark-circle-512.png",
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
        <SiteChrome>
          <Navbar />
          <LiveSignalBar initial={snapshot} />
        </SiteChrome>
        <main className="relative z-0 min-w-0 flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
