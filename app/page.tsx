import { Hero } from "@/components/home/Hero";
import { Intro } from "@/components/home/Intro";
import { JukeboxHighlight } from "@/components/home/JukeboxHighlight";
import { LatestArticles } from "@/components/home/LatestArticles";
import { TimechainStats } from "@/components/timechain/TimechainStats";
import { Container } from "@/components/ui/Container";
import { getTimechainSnapshot } from "@/lib/timechain";

export const revalidate = 20;

export default async function HomePage() {
  const snapshot = await getTimechainSnapshot();

  return (
    <>
      <Hero />
      <Container className="py-10 sm:py-12">
        <TimechainStats initial={snapshot} variant="home" />
      </Container>
      <Intro />
      <LatestArticles />
      <JukeboxHighlight />
    </>
  );
}
