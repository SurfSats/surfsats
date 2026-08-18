import type { Metadata } from "next";
import { WavePoolApp } from "@/components/wavepool/WavePoolApp";
import { Container } from "@/components/ui/Container";
import { TerminalLabel } from "@/components/ui/TerminalLabel";
import { getTimechainSnapshot } from "@/lib/timechain";
import { WAVE_POOL_GOAL_SATS } from "@/lib/wavepool";

export const revalidate = 20;

export const metadata: Metadata = {
  title: "Wave Pool",
  description:
    "Feed the Lightning Wave Pool. 2100 sats unlocks the set. Bitcoin's 24h swell picks the break — barrel or closeout.",
};

export default async function WavePoolPage() {
  const snapshot = await getTimechainSnapshot();

  return (
    <div className="relative overflow-hidden">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[22rem]" />
      <Container className="relative py-14 sm:py-20">
        <TerminalLabel>collective energy · bitcoin tide</TerminalLabel>
        <h1
          data-text="Wave Pool"
          className="glitch-title flicker mt-4 max-w-4xl font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl lg:text-7xl"
        >
          Wave Pool
        </h1>
        <p className="mt-5 font-display text-xl font-semibold uppercase tracking-wide text-sats sm:text-2xl">
          {WAVE_POOL_GOAL_SATS} sats. One shared set.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Shared pool. Goal is {WAVE_POOL_GOAL_SATS} sats. Bitcoin up on the
          day: a barrel. Down: a closeout that wants to eat you. Hit the
          number and the set unlocks.
        </p>

        <div className="mt-10">
          <WavePoolApp initialSnapshot={snapshot} />
        </div>
      </Container>
    </div>
  );
}
