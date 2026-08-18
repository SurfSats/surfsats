import type { Metadata } from "next";
import { AddSongCard } from "@/components/jukebox/AddSongCard";
import { NowPlaying } from "@/components/jukebox/NowPlaying";
import { Queue } from "@/components/jukebox/Queue";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getNowPlaying, getQueue } from "@/lib/jukebox";

export const metadata: Metadata = {
  title: "Jukebox",
  description:
    "The Global Jukebox. Hear what's playing and queue a song for 21 sats when Lightning goes live.",
};

export default function JukeboxPage() {
  const current = getNowPlaying();
  const queue = getQueue();

  return (
    <Container className="py-16 sm:py-20">
      <SectionHeading
        eyebrow="global_jukebox"
        title="What's playing"
        description="A shared soundtrack for the SurfSats coast. Lightning payments will sit on this page — nothing is charged yet."
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="space-y-8">
          <NowPlaying track={current} />
          <Queue tracks={queue} />
        </div>
        <AddSongCard />
      </div>
    </Container>
  );
}
