import type { Metadata } from "next";
import Image from "next/image";
import { AddSongCard } from "@/components/jukebox/AddSongCard";
import { BottleStage, BottleWash } from "@/components/jukebox/BottleRack";
import { JukeboxDeck } from "@/components/jukebox/JukeboxDeck";
import { LiveStream } from "@/components/jukebox/LiveStream";
import { SignalStatus } from "@/components/jukebox/SignalStatus";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { TerminalLabel } from "@/components/ui/TerminalLabel";
import {
  JUKEBOX_BACKEND_NAME,
  JUKEBOX_LIVE_URL,
  JUKEBOX_PRICE_SATS,
  JUKEBOX_TELEGRAM_URL,
  WAVLAKE_REQUEST_SATS,
  fetchNowPlayingSnapshot,
} from "@/lib/jukebox";

export const metadata: Metadata = {
  title: "The Jukebox",
  description:
    "The Jukebox — located on a pirate ship sailing in international waters. Listen on the ship. Request a track for 21 sats — anti-spam, not a record deal.",
};

export default async function JukeboxPage() {
  const initial = await fetchNowPlayingSnapshot();

  return (
    <div className="relative">
      <div className="jukebox-hero-art pointer-events-none" aria-hidden="true">
        <Image
          src="/jukebox-ship.png"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <div className="jukebox-hero-veil" />
      </div>

      <Container className="relative z-[1] py-14 sm:py-20">
        <section className="jukebox-hero">
          <div className="jukebox-hero-copy">
            <TerminalLabel>global_jukebox · permissionless audio</TerminalLabel>
            <h1
              data-text="The Jukebox"
              className="glitch-title flicker mt-4 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl lg:text-7xl"
            >
              The Jukebox
            </h1>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted sm:text-sm">
              located on a pirate ship sailing in international waters
            </p>
            <p className="mt-5 font-display text-xl font-semibold uppercase tracking-wide text-sats sm:text-2xl">
              Listen on the ship. Request a track for {JUKEBOX_PRICE_SATS} sats —
              anti-spam, not a record deal.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-foreground/90 sm:text-base">
              The public is the DJ. Drop {JUKEBOX_PRICE_SATS} sats and the whole
              ship hears it. That tip keeps the queue honest and the station on
              air — it is not a royalty, and it is not buying the song.
            </p>
            <div className="mt-6">
              <SignalStatus />
            </div>
          </div>
          <BottleStage />
        </section>

        <div className="mt-10">
          <LiveStream />
        </div>
        <BottleWash />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <ButtonLink
            href={JUKEBOX_LIVE_URL}
            external
            className="btn-pulse w-full px-6 py-4 text-sm sm:w-auto"
          >
            REQUEST ON THE SHIP
          </ButtonLink>
          <ButtonLink
            href={JUKEBOX_TELEGRAM_URL}
            external
            variant="ghost"
            className="w-full px-6 py-4 text-sm sm:w-auto"
          >
            TELEGRAM
          </ButtonLink>
        </div>
        <p className="mt-3 max-w-xl text-sm text-muted">
          Search the Jukebox tab. Zap {JUKEBOX_PRICE_SATS} sats (ship library) or{" "}
          {WAVLAKE_REQUEST_SATS} sats (Wavlake). Anti-spam / V4V — not a record
          sale. The licence covers the song.
        </p>

        <JukeboxDeck initial={initial} />

        <div className="mt-10">
          <AddSongCard />
        </div>

        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          powered by {JUKEBOX_BACKEND_NAME}
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted/70">
          legacy bot — do not top up.
        </p>
      </Container>
    </div>
  );
}
