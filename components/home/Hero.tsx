import { SwellScorecard } from "@/components/home/SwellScorecard";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { TerminalLabel } from "@/components/ui/TerminalLabel";
import type { TimechainSnapshot } from "@/lib/timechain";

export function Hero({ initial }: { initial: TimechainSnapshot | null }) {
  return (
    <section className="relative overflow-hidden">
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <Container className="relative grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26.5rem)] lg:py-28">
        <div className="min-w-0">
        <TerminalLabel>bitcoin · surf · no masters</TerminalLabel>
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          <span className="text-cyan">root@surfsats:~$</span> boot --btc --no-kyc
        </p>
        <h1
          data-text="SurfSats"
          className="glitch-title flicker mt-4 max-w-4xl font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight text-foreground sm:text-7xl lg:text-8xl"
        >
          SurfSats
        </h1>
        <p className="mt-6 max-w-2xl font-display text-xl font-semibold uppercase tracking-wide text-sats sm:text-3xl">
          No banks. No bosses. No closed beach signs.
        </p>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Welcome to the Lightning sandbox: tag the wall, feed the jukebox,
          smash the arcade.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <ButtonLink href="/lineup">enter the lineup</ButtonLink>
          <ButtonLink href="/wavepool" variant="ghost">
            feed the wave
          </ButtonLink>
          <ButtonLink href="/jukebox" variant="ghost">
            drop 21 sats
          </ButtonLink>
          <ButtonLink href="/graffiti" variant="ghost">
            tag the block
          </ButtonLink>
        </div>
        </div>
        <SwellScorecard initial={initial} />
      </Container>
      <div
        className="h-px w-full bg-gradient-to-r from-transparent via-cyan/50 to-transparent"
        aria-hidden="true"
      />
    </section>
  );
}
