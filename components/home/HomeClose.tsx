import Link from "next/link";
import { Container } from "@/components/ui/Container";

export function HomeClose() {
  return (
    <section className="relative z-0 border-t border-cyan/20">
      <Container className="py-14 sm:py-16">
        <p className="max-w-3xl break-words font-display text-2xl font-bold uppercase leading-tight tracking-tight sm:text-3xl">
          No committee. No brand guidelines.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Blast the Jukebox. Tag the wall. Smash the cabinet. No permission
          required.
        </p>
        <Link
          href="/about"
          className="mt-6 inline-block font-mono text-[11px] uppercase tracking-[0.16em] text-muted/80 glitch-hover hover:text-cyan"
        >
          about -&gt;
        </Link>
        <Link
          href="/lot"
          className="mt-8 block font-mono text-[10px] tracking-[0.16em] text-muted/35 glitch-hover hover:text-sats/80"
        >
          the shack · side door
        </Link>
      </Container>
    </section>
  );
}
