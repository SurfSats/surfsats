import type { Metadata } from "next";
import { StoryApp } from "@/components/story/StoryApp";
import { STORY_PRICE_SATS } from "@/lib/story";

export const metadata: Metadata = {
  title: "Story Chain",
  description: `${STORY_PRICE_SATS} sats. One line. The book grows.`,
};

export default function StoryPage() {
  return <StoryApp />;
}
