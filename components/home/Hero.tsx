import Image from "next/image";
import { Container } from "@/components/ui/Container";

export function Hero() {
  return (
    <section className="home-stage">
      <div className="home-stage-plate" aria-hidden="true">
        <Image
          src="/home-hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="home-stage-img"
          style={{ objectFit: "cover", objectPosition: "center right" }}
        />
        <div className="home-stage-veil" />
      </div>
      <Container className="home-stage-copy">
        <p className="home-stage-boot">
          <span className="text-cyan">root@surfsats:~$</span> boot --btc --no-kyc
        </p>
        <h1
          data-text="SurfSats"
          className="glitch-title flicker mt-3 max-w-4xl font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight text-foreground sm:text-7xl lg:text-8xl"
        >
          SurfSats
        </h1>
        <p className="home-stage-thesis">
          No banks. No bosses.{" "}
          <span className="home-stage-thesis-tail">No closed beach signs.</span>
        </p>
        <p className="home-stage-sub">
          Lightning sandbox. 21 sats. No accounts.
        </p>
        <a href="#the-floor" className="home-walk">
          Walk the floor
        </a>
      </Container>
    </section>
  );
}
