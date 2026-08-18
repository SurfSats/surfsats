import type { Metadata } from "next";
import { GraffitiApp } from "@/components/graffiti/GraffitiApp";
import { Container } from "@/components/ui/Container";
import { TerminalLabel } from "@/components/ui/TerminalLabel";
import { GRAFFITI_PRICE_SATS } from "@/lib/graffiti";

export const metadata: Metadata = {
  title: "Graffiti Wall",
  description:
    "Pay 21 sats. Leave a mark for 24 hours. Bitcoin Is Hope stays forever.",
};

export default function GraffitiPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[20rem]" />
      <Container className="relative py-14 sm:py-20">
        <TerminalLabel>alley · 24h lease · no accounts</TerminalLabel>
        <h1
          data-text="Graffiti Wall"
          className="glitch-title flicker mt-4 max-w-4xl font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl lg:text-7xl"
        >
          Graffiti Wall
        </h1>
        <p className="mt-5 font-display text-xl font-semibold uppercase tracking-wide text-sats sm:text-2xl">
          {GRAFFITI_PRICE_SATS} sats. 24 hours. Then it fades.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Temporary marks on a permanent idea. Pay to speak. Bitcoin remains.
          No account. No archive. Hope does not expire.
        </p>

        <div className="mt-10">
          <GraffitiApp />
        </div>
      </Container>
    </div>
  );
}
