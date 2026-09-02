import type { Metadata } from "next";
import { FeaturedTools } from "@/components/home/FeaturedTools";
import { FromTheCoast } from "@/components/home/FromTheCoast";
import { Hero } from "@/components/home/Hero";
import { HomeClose } from "@/components/home/HomeClose";
import { pageMeta } from "@/lib/seo";
import { getTimechainSnapshot } from "@/lib/timechain";

export const metadata: Metadata = pageMeta({
  title: "SurfSats · no banks, no bosses",
  description:
    "Lightning sandbox. Five machines on the floor. 21 sats. No accounts.",
  path: "/",
  absoluteTitle: true,
});

export default async function HomePage() {
  const snapshot = await getTimechainSnapshot();

  return (
    <>
      <Hero />
      <FeaturedTools initial={snapshot} />
      <FromTheCoast />
      <HomeClose />
    </>
  );
}
