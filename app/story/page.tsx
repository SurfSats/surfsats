import type { Metadata } from "next";
import Image from "next/image";
import { StoryApp } from "@/components/story/StoryApp";
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
    </div>
  );
}
