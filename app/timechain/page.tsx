import type { Metadata } from "next";
import { TidechainApp } from "@/components/timechain/TidechainApp";
import { Container } from "@/components/ui/Container";
import { TerminalLabel } from "@/components/ui/TerminalLabel";
import { getTimechainSnapshot } from "@/lib/timechain";

export const revalidate = 20;

export const metadata: Metadata = {
  title: "TideChain",
  description:
    "Bitcoin as ocean time. A tidal gauge for height, last block, difficulty, halving, supply, Moscow Time, and 24h swell.",
};

export default async function TimechainPage() {
  const snapshot = await getTimechainSnapshot();

  return (
    <div className="relative overflow-hidden">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[20rem]" />
      <Container className="relative py-14 sm:py-20">
        <TerminalLabel>ocean time · no narrative</TerminalLabel>
        <h1
          data-text="TideChain"
          className="glitch-title flicker mt-4 max-w-4xl font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl"
        >
          TideChain
        </h1>
        <p className="mt-5 max-w-xl font-display text-xl font-semibold uppercase tracking-wide text-sats">
          The chain is the clock. The tide is the schedule.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Not a calendar of rings. A tide staff. Last block is the swell.
          Difficulty is the tide turning. Halving is the king tide. Supply is
          the water.
        </p>

        <div className="mt-10">
          <TidechainApp initial={snapshot} />
        </div>
      </Container>
    </div>
  );
}
