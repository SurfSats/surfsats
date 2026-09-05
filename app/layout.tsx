import type { Metadata } from "next";
import { JetBrains_Mono, Syne } from "next/font/google";
import { BitcoinConnectRoot } from "@/components/layout/BitcoinConnectRoot";
import { Footer } from "@/components/layout/Footer";
import { LiveSettlementTape } from "@/components/layout/LiveSettlementTape";
import { LiveSignalBar } from "@/components/layout/LiveSignalBar";
import { Navbar } from "@/components/layout/Navbar";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { Watermark } from "@/components/layout/Watermark";
import { OG_HOME, SITE_ORIGIN, pageMeta } from "@/lib/seo";
import { getTimechainSnapshot } from "@/lib/timechain";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
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
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${syne.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="relative flex min-h-screen flex-col bg-void font-mono text-salt">
        <div className="crt-scanlines" aria-hidden="true" />
        <BitcoinConnectRoot>
          <Watermark />
          <SiteChrome>
            <Navbar />
            <LiveSignalBar initial={snapshot} />
            <LiveSettlementTape />
          </SiteChrome>
          <main className="relative z-0 min-w-0 flex-1">{children}</main>
          <Footer />
        </BitcoinConnectRoot>
      </body>
    </html>
  );
}
