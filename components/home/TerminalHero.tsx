"use client";

import Link from "next/link";
import { useDrop21 } from "@/components/pay/Drop21Provider";
import { BrutalistButton } from "@/components/ui/BrutalistButton";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";
import {
  BRUTALIST_BUTTON_SIZE_CLASS,
  BRUTALIST_BUTTON_VARIANT_CLASS,
} from "@/lib/brutalist-ui";

export function TerminalHero() {
  const { drop21, dropping, error } = useDrop21();

  return (
    <section className="bg-void">
      <Container className="py-10 sm:py-14">
        <p className="font-mono text-[11px] tracking-telemetry text-terminal-green uppercase">
          ROOT@SURFSATS:~$ BOOT --BTC --NO-KYC --AUTONOMOUS
        </p>
        <h2 className="mt-4 max-w-4xl font-display text-4xl font-black tracking-brutalist text-salt uppercase sm:text-6xl lg:text-7xl">
          No banks. No bosses. No closed beach signs.
        </h2>
        <p className="mt-5 max-w-2xl font-mono text-sm leading-relaxed text-salt/70 sm:text-base">
          Lightning sandbox. 21 sats. Permissionless ocean intelligence.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <BrutalistButton
            id="hero-drop-21"
            variant="amber"
            size="lg"
            data-drop="21"
            disabled={dropping}
            onClick={() => {
              void drop21();
            }}
          >
            {dropping ? "MINTING…" : "DROP 21 SATS"}
          </BrutalistButton>
          <Link
            href="/sandbox"
            className={cn(
              "inline-flex items-center justify-center border font-mono font-bold tracking-telemetry uppercase",
              BRUTALIST_BUTTON_SIZE_CLASS.lg,
              BRUTALIST_BUTTON_VARIANT_CLASS.primary,
            )}
          >
            LAUNCH SANDBOX
          </Link>
          <Link
            href="/graffiti"
            className={cn(
              "inline-flex items-center justify-center border font-mono font-bold tracking-telemetry uppercase",
              BRUTALIST_BUTTON_SIZE_CLASS.lg,
              BRUTALIST_BUTTON_VARIANT_CLASS.secondary,
            )}
          >
            TAG THE WALL
          </Link>
        </div>
        {error ? (
          <p className="mt-4 font-mono text-[11px] tracking-telemetry text-amber uppercase">
            {error}
          </p>
        ) : null}
      </Container>
    </section>
  );
}
