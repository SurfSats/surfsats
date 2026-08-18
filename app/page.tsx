import { Hero } from "@/components/home/Hero";
import { Intro } from "@/components/home/Intro";
import { JukeboxHighlight } from "@/components/home/JukeboxHighlight";
import { LatestArticles } from "@/components/home/LatestArticles";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Intro />
      <LatestArticles />
      <JukeboxHighlight />
    </>
  );
}
