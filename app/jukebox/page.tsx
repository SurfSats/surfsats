import type { Metadata } from "next";
import Image from "next/image";
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
  JUKEBOX_TELEGRAM_URL,
  getNowPlaying,
  getQueue,
} from "@/lib/jukebox";

export const metadata: Metadata = {
  title: "The Ship",
  description:
    "The Global Jukebox sails international waters. Pay 21 sats. Be the DJ. No masters on this deck.",
};

export default function JukeboxPage() {
  // Swap these helpers for a live queue API when one exists.
  const current = getNowPlaying();
  const queue = getQueue();

  return (
    <div className="relative">
      <div className="jukebox-hero-art pointer-events-none" aria-hidden="true">
        <Image
          src="/jukebox-ship-ref.png"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <div className="jukebox-hero-veil" />
      </div>

      <Container className="relative z-[1] py-14 sm:py-20">
        <section>
          <TerminalLabel>international_waters · no flag · no kyc</TerminalLabel>
          <h1
            data-text="The Ship"
            className="glitch-title flicker mt-4 max-w-4xl font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl lg:text-7xl"
          >
            The Ship
          </h1>
          <p className="mt-5 font-display text-xl font-semibold uppercase tracking-wide text-sats sm:text-2xl">
            No masters on this deck.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-foreground/90 sm:text-base">
            The Global Jukebox sails outside the system. Same as Bitcoin: no
            borders, no committee, no permission. Drop {JUKEBOX_PRICE_SATS}{" "}
            sats and you are the DJ on international waters.
          </p>
          <div className="mt-6">
            <SignalStatus />
          </div>
        </section>

        <div className="mt-10">
          <LiveStream />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <ButtonLink
            href={JUKEBOX_LIVE_URL}
            external
            className="btn-pulse w-full px-6 py-4 text-sm sm:w-auto"
          >
            add a song — {JUKEBOX_PRICE_SATS} sats
          </ButtonLink>
          <ButtonLink
            href={JUKEBOX_TELEGRAM_URL}
            external
            variant="ghost"
            className="w-full px-6 py-4 text-sm sm:w-auto"
          >
            add via telegram
          </ButtonLink>
        </div>
        <p className="mt-3 max-w-xl text-sm text-muted">
          Web can stall. Telegram is usually faster for requests.
        </p>

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
          powered by {JUKEBOX_BACKEND_NAME} · flagged for no nation
        </p>
      </Container>
    </div>
  );
}
