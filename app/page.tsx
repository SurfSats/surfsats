import { FeaturedTools } from "@/components/home/FeaturedTools";
import { FromTheCoast } from "@/components/home/FromTheCoast";
import { Hero } from "@/components/home/Hero";
import { HomeClose } from "@/components/home/HomeClose";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedTools />
      <FromTheCoast />
      <HomeClose />
    </>
  );
}
