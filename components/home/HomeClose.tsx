import { Container } from "@/components/ui/Container";

export function HomeClose() {
  return (
    <section className="border-t border-cyan/20">
      <Container className="py-12 sm:py-16">
        <p className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
          No committee. No brand guidelines.
        </p>
        <p className="mt-3 max-w-xl text-sm text-muted sm:text-base">
          Fork the culture. Feed the wave. Pay the peak or sit outside.
        </p>
      </Container>
    </section>
  );
}
