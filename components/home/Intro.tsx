import { Container } from "@/components/ui/Container";
import { TerminalLabel } from "@/components/ui/TerminalLabel";

export function Intro() {
  return (
    <section className="border-y border-dashed border-cyan/20 bg-panel/70">
      <Container className="grid gap-8 py-14 sm:py-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-16">
        <TerminalLabel>why_surfsats</TerminalLabel>
        <div className="space-y-4 border-l-2 border-magenta/60 pl-5 text-sm leading-relaxed text-muted sm:text-base">
          <p>
            Surf culture and Bitcoin culture already share a clock. You wait on
            the set. You wait on the cycle. You ignore the noise and keep your
            gear ready.
          </p>
          <p>
            SurfSats is the place that writing lives — plus a Global Jukebox
            anyone can feed with 21 sats when Lightning lands. Stories from the
            lineup, news from the coast, and a soundtrack the whole beach can
            hear.
          </p>
        </div>
      </Container>
    </section>
  );
}
