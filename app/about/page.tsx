import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "About",
  description:
    "SurfSats exists to show fun, fast, cheap Lightning in action. 21 sats. Feel the speed. Sats in, sats out.",
};

export default function AboutPage() {
  return (
    <div className="kit-page">
      <header className="readout-strip">
        <p>about · not a pitch deck</p>
      </header>
      <div className="readout-body">
        <Container className="relative max-w-3xl py-8 sm:py-10">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            Why this exists
          </h1>
          <p className="mt-3 font-display text-lg font-semibold uppercase tracking-wide text-sats">
            Show, don&apos;t sermon.
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90 sm:text-base">
            <p>
              SurfSats is a playground for fun, fast, cheap Lightning. Not a
              course. Not a thinkpiece farm. Pull it up when you&apos;re showing
              a normie what Bitcoin actually feels like.
            </p>
            <p>
              Graffiti, Arcade, Tab, Surf Radio, Story Chain. 21 sats. The
              thing happens. That&apos;s the whole argument. Experience over
              lectures.
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
                Sats are <span className="text-magenta">never HODLed</span>{" "}
                here.
              </li>
              <li>
                Sats are never converted to fiat. No dirty cuckbucks. Full
                stop.
              </li>
            </ul>
          </section>

          <p className="mt-10 font-mono text-xs uppercase tracking-[0.16em] text-muted">
            the chain is the clock · 21 sats is the demo
          </p>
        </Container>
      </div>
    </div>
  );
}
