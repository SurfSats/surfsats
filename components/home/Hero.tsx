import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";
import {
  BRUTALIST_BUTTON_SIZE_CLASS,
  BRUTALIST_BUTTON_VARIANT_CLASS,
} from "@/lib/brutalist-ui";

const HERO_STILL = "/home-hero-still.jpg";

export function Hero() {
  return (
    <section className="home-stage">
      <link
        rel="preload"
        as="image"
        href={HERO_STILL}
        type="image/jpeg"
        fetchPriority="high"
      />
      <div className="home-stage-plate" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_STILL}
          alt=""
          width={1400}
          height={942}
          className="home-stage-img"
          fetchPriority="high"
          decoding="async"
        />
        <div className="home-stage-veil" />
      </div>
      <Container className="home-stage-copy">
        <p className="home-stage-boot">
          <span className="text-terminal-green">root@surfsats:~$</span> boot --btc --no-kyc
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
        <div className="home-stage-actions">
          <Link
            href="/graffiti"
            className={cn(
              "inline-flex min-h-12 items-center justify-center border font-mono font-bold tracking-telemetry uppercase",
              BRUTALIST_BUTTON_SIZE_CLASS.lg,
              BRUTALIST_BUTTON_VARIANT_CLASS.primary,
            )}
          >
            TAG THE WALL · 21 SATS
          </Link>
          <Link
            href="/arcade"
            className={cn(
              "inline-flex min-h-12 items-center justify-center border font-mono font-bold tracking-telemetry uppercase",
              BRUTALIST_BUTTON_SIZE_CLASS.lg,
              BRUTALIST_BUTTON_VARIANT_CLASS.secondary,
            )}
          >
            SMASH THE ARCADE · 21 SATS
          </Link>
        </div>
        <a href="#the-floor" className="home-walk">
          Walk the floor
          <svg
            className="home-walk-arrow"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path
              d="M3 6.5 8 11.5 13 6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="square"
            />
          </svg>
        </a>
      </Container>
    </section>
  );
}
