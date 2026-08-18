import type { Metadata } from "next";
import { AddSongCard } from "@/components/jukebox/AddSongCard";
import { HowItWorks } from "@/components/jukebox/HowItWorks";
import { LiveStream } from "@/components/jukebox/LiveStream";
import { NowPlaying } from "@/components/jukebox/NowPlaying";
import { Queue } from "@/components/jukebox/Queue";
import { SignalStatus } from "@/components/jukebox/SignalStatus";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { TerminalLabel } from "@/components/ui/TerminalLabel";
import {
  JUKEBOX_BACKEND_NAME,
  JUKEBOX_LIVE_URL,
  JUKEBOX_PRICE_SATS,
  getNowPlaying,
  getQueue,
} from "@/lib/jukebox";

export const metadata: Metadata = {
  title: "Global Jukebox",
  description:
    "Pay 21 sats. Be the DJ. The SurfSats Global Jukebox — any song, Lightning, no permission.",
};

export default function JukeboxPage() {
  // Swap these helpers for a live queue API when one exists.
  const current = getNowPlaying();
  const queue = getQueue();

  return (
    <div className="relative overflow-hidden">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[28rem]" />

      <Container className="relative py-14 sm:py-20">
        <section>
          <TerminalLabel>global_jukebox · permissionless audio</TerminalLabel>
          <h1
            data-text="Global Jukebox"
            className="glitch-title flicker mt-4 max-w-4xl font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Global Jukebox
          </h1>
          <p className="mt-5 font-display text-xl font-semibold uppercase tracking-wide text-sats sm:text-2xl">
            Pay {JUKEBOX_PRICE_SATS} sats. Be the DJ.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            One shared queue. Anyone on earth can feed it. No label, no
            algorithm, no hospitality manager with a playlist. Just Lightning
            and whatever you want the room to hear.
          </p>
          <div className="mt-6">
            <SignalStatus />
          </div>
        </section>

        <div className="mt-10">
          <LiveStream />
        </div>

        <ButtonLink
          href={JUKEBOX_LIVE_URL}
          external
          className="btn-pulse mt-8 w-full px-6 py-4 text-sm sm:w-auto"
        >
          add a song — {JUKEBOX_PRICE_SATS} sats
        </ButtonLink>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <NowPlaying track={current} />
          <HowItWorks />
        </div>

        <div className="mt-10">
          <Queue tracks={queue} />
        </div>

        <div className="mt-10">
          <AddSongCard />
        </div>

        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          powered by {JUKEBOX_BACKEND_NAME}
        </p>
      </Container>
    </div>
  );
}
