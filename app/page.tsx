import { FeaturedTools } from "@/components/home/FeaturedTools";
import { FromTheCoast } from "@/components/home/FromTheCoast";
import { Hero } from "@/components/home/Hero";
import { HomeClose } from "@/components/home/HomeClose";
import { getTimechainSnapshot } from "@/lib/timechain";

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
