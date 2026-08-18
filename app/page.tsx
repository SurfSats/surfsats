import { FeaturedTools } from "@/components/home/FeaturedTools";
import { FromTheCoast } from "@/components/home/FromTheCoast";
import { Hero } from "@/components/home/Hero";
import { HomeClose } from "@/components/home/HomeClose";
import { HomeSignalStrip } from "@/components/home/HomeSignalStrip";
import { getTimechainSnapshot } from "@/lib/timechain";

export const revalidate = 20;

export default async function HomePage() {
  const snapshot = await getTimechainSnapshot();

  return (
    <>
      <Hero />
      <FeaturedTools />
      <HomeSignalStrip initial={snapshot} />
      <FromTheCoast />
      <HomeClose />
    </>
  );
}
