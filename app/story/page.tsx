import type { Metadata } from "next";
import Image from "next/image";
import { ZapThreadsFeed } from "@/components/nostr/ZapThreadsFeed";
import { StoryApp } from "@/components/story/StoryApp";
import { Container } from "@/components/ui/Container";
import { pageMeta } from "@/lib/seo";
import { STORY_PRICE_SATS } from "@/lib/story";

export const metadata: Metadata = pageMeta({
  title: "Story Chain",
  description: `${STORY_PRICE_SATS} sats. One line. The book grows.`,
  path: "/story",
});

export default function StoryPage() {
  return (
    <div className="story-shell">
      <div className="story-bg" aria-hidden="true">
        <Image
          src="/story-writer-quarters.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <div className="story-bg-scrim" />
      </div>
      <StoryApp />
      <section className="relative z-[1] bg-void">
        <Container className="py-8 sm:py-10">
          <p className="mb-6 font-mono text-[11px] tracking-telemetry text-zinc-raw uppercase">
            ZAPTHREADS // STORY_CHAIN
          </p>
          <ZapThreadsFeed anchorTag="surfsats_story_chain" />
        </Container>
      </section>
    </div>
  );
}
