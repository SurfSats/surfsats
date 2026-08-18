import type { Metadata } from "next";
import { LineupApp } from "@/components/lineup/LineupApp";
import { Container } from "@/components/ui/Container";
import { TerminalLabel } from "@/components/ui/TerminalLabel";
import { getLineupSnapshot } from "@/lib/lineup";

export const revalidate = 12;

export const metadata: Metadata = {
  title: "The Lineup",
  description:
    "The mempool as a night lineup. Fee rate is position. The next block is the set. Catch it or get closed out.",
};

export default async function LineupPage() {
  const snapshot = await getLineupSnapshot();

  return (
    <div className="relative overflow-hidden">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[22rem]" />
      <Container className="relative py-14 sm:py-20">
        <TerminalLabel>mempool · night session</TerminalLabel>
        <h1
          data-text="The Lineup"
          className="glitch-title flicker mt-4 max-w-4xl font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl lg:text-7xl"
        >
          The Lineup
        </h1>
        <p className="mt-5 font-display text-xl font-semibold uppercase tracking-wide text-sats sm:text-2xl">
          Pay the peak. Or sit outside.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Every unconfirmed tx is a body in the water. Higher fee, closer to
          the takeoff. When the set comes, the inside pack drops in. The rest
          watch it close out.
        </p>

        <div className="mt-10">
          <LineupApp initial={snapshot} />
        </div>
      </Container>
    </div>
  );
}
