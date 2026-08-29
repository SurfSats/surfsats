import type { Metadata } from "next";
import { FeaturedTools } from "@/components/home/FeaturedTools";
import { FromTheCoast } from "@/components/home/FromTheCoast";
import { Hero } from "@/components/home/Hero";
import { HomeClose } from "@/components/home/HomeClose";
import { getTimechainSnapshot } from "@/lib/timechain";

const ogImage = "https://www.surfsats.com/og-home.png";
const ogDescription = "No banks. No bosses. No closed beach signs.";

export const metadata: Metadata = {
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

export default async function HomePage() {
  const snapshot = await getTimechainSnapshot();

  return (
    <>
      <Hero initial={snapshot} />
      <FeaturedTools />
      <FromTheCoast />
      <HomeClose />
    </>
  );
}
