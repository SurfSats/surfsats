import type { Metadata } from "next";
import { TimechainStats } from "@/components/timechain/TimechainStats";
import { Container } from "@/components/ui/Container";
import { TerminalLabel } from "@/components/ui/TerminalLabel";
import { getTimechainSnapshot } from "@/lib/timechain";

export const revalidate = 20;

export const metadata: Metadata = {
  title: "Timechain",
  description:
    "Live Bitcoin price, block height, hashrate, difficulty, and fee environment. Hard clock. No narrative.",
};

export default async function TimechainPage() {
  const snapshot = await getTimechainSnapshot();

  return (
    <div className="relative overflow-hidden">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[20rem]" />
      <Container className="relative py-14 sm:py-20">
        <TerminalLabel>hard clock · no narrative</TerminalLabel>
        <h1
          data-text="Timechain"
          className="glitch-title flicker mt-4 max-w-4xl font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl"
        >
          Timechain
        </h1>
        <p className="mt-5 max-w-xl font-display text-xl font-semibold uppercase tracking-wide text-sats">
          Blocks, not headlines.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Price is a side effect. The chain is the clock. 24h swell is marked
          loud on purpose — that number will drive the Wave Pool later.
        </p>

        <div className="mt-10">
          <TimechainStats initial={snapshot} variant="page" />
        </div>
      </Container>
    </div>
  );
}
