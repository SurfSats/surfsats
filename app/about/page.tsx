import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { TerminalLabel } from "@/components/ui/TerminalLabel";

export const metadata: Metadata = {
  title: "About",
  description:
    "SurfSats exists to show fun, fast, cheap Lightning in action. 21 sats. Feel the speed. Sats in, sats out.",
};

export default function AboutPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[18rem]" />
      <Container className="relative max-w-3xl py-14 sm:py-20">
        <TerminalLabel>about · not a pitch deck</TerminalLabel>
        <h1
          data-text="Why this exists"
          className="glitch-title flicker mt-4 font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl"
        >
          Why this exists
        </h1>
        <p className="mt-5 font-display text-xl font-semibold uppercase tracking-wide text-sats">
          Show, don&apos;t sermon.
        </p>

        <div className="mt-10 space-y-6 text-sm leading-relaxed text-foreground/90 sm:text-base">
          <p>
            SurfSats is a playground for fun, fast, cheap Lightning. Not a
            course. Not a thinkpiece farm. Pull it up when you&apos;re showing
            a normie what Bitcoin actually feels like.
          </p>
          <p>
            Jukebox. Graffiti Wall. Wave Pool. Move 21 sats and the thing
            happens. That&apos;s the whole argument. Experience over lectures.
          </p>
          <p>
            Built for plebs who need receipts in the wild: here, tap this, it
            settled already.
          </p>
        </div>

        <section className="panel mt-12 p-5 sm:p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
            {"//"} money_rules
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/90 sm:text-base">
            <li>
              <span className="text-sats">100%</span> of sats received get
              zapped back out — community, Nostr, Bitcoin ecosystem. No
              treasury. No nest egg.
            </li>
            <li>
              Sats are <span className="text-magenta">never HODLed</span> here.
            </li>
            <li>
              Sats are never converted to fiat. No dirty cuckbucks. Full stop.
            </li>
          </ul>
        </section>

        <p className="mt-10 font-mono text-xs uppercase tracking-[0.16em] text-muted">
          the chain is the clock · 21 sats is the demo
        </p>
      </Container>
    </div>
  );
}
