import type { Metadata } from "next";
import { RadioDeck } from "@/components/music/RadioDeck";
import { RadioNav } from "@/components/music/RadioNav";
import { Container } from "@/components/ui/Container";
import { TerminalLabel } from "@/components/ui/TerminalLabel";

export const metadata: Metadata = {
  title: "Surf Radio",
  description:
    "Explore permissionless music. Stream, zap, and discover. Jukebox, Wavlake, live Nostr sets, ZapTrax, Fountain, Napstr, Now Playing.",
};

export default function MusicPage() {
  return (
    <div className="relative">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[22rem]" />

      <Container className="relative pt-14 sm:pt-20">
        <section>
          <TerminalLabel>surf_radio · permissionless audio</TerminalLabel>
          <h1
            data-text="Surf Radio"
            className="glitch-title flicker mt-4 max-w-4xl font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Surf Radio
          </h1>
          <p className="mt-5 font-display text-xl font-semibold uppercase tracking-wide text-sats sm:text-2xl">
            Explore permissionless music. Stream, zap, and discover
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            A discovery deck. Queue on the pirate ship. Zap a track. Catch a
            live set. The jukebox stays the 21-sat machine — this is the rest
            of the dial.
          </p>
        </section>
      </Container>

      <div className="relative mt-8 sm:mt-10">
        <RadioNav />
      </div>

      <Container className="relative pb-14 sm:pb-20">
        <RadioDeck />
        <p className="mt-10 max-w-2xl font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          Jukebox is the 21-sat machine. Everything else is the dial.
        </p>
      </Container>
    </div>
  );
}
