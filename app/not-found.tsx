import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-magenta">
        error 404 {"//"} signal_lost
      </p>
      <h1 className="glitch-title mt-4 font-display text-4xl font-bold uppercase tracking-tight" data-text="That set already passed.">
        That set already passed.
      </h1>
      <p className="mx-auto mt-4 max-w-md text-sm text-muted">
        The page you are looking for is not here. Paddle back to the lineup.
      </p>
      <ButtonLink href="/" className="mt-8">
        [ back_home ]
      </ButtonLink>
    </Container>
  );
}
