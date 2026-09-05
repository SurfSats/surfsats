import Link from "next/link";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";
import {
  BRUTALIST_BUTTON_SIZE_CLASS,
  BRUTALIST_BUTTON_VARIANT_CLASS,
} from "@/lib/brutalist-ui";

const dockLink = cn(
  "inline-flex items-center justify-center border font-mono font-bold tracking-telemetry uppercase",
  BRUTALIST_BUTTON_SIZE_CLASS.md,
);

export function MachineDock() {
  return (
    <section className="bg-void">
      <Container className="py-8 sm:py-10">
        <p className="mb-6 font-mono text-[11px] tracking-telemetry text-zinc-raw uppercase">
          TACTICAL_MACHINE_DOCK // 21_SATS
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TerminalCard
            title="GRAFFITI_WALL"
            tag="KIND_1 // 21_SATS"
            status="live"
          >
            <p className="font-mono text-sm leading-relaxed text-salt/70">
              Kind 1 on brick. 21 sats, 21 hours, then it fades. No accounts.
            </p>
            <Link
              href="/graffiti"
              className={cn(dockLink, BRUTALIST_BUTTON_VARIANT_CLASS.primary, "mt-5")}
            >
              TAG THE WALL
            </Link>
          </TerminalCard>

          <TerminalCard
            title="HYDROGRAPHIC_SANDBOX"
            tag="OSCILLOSCOPE // L402"
            status="active"
          >
            <p className="font-mono text-sm leading-relaxed text-salt/70">
              Swell oscilloscope, a 21-sat L402 shutter, and the live Nostr HUD.
            </p>
            <Link
              href="/sandbox"
              className={cn(dockLink, BRUTALIST_BUTTON_VARIANT_CLASS.amber, "mt-5")}
            >
              LAUNCH SANDBOX
            </Link>
          </TerminalCard>

          <TerminalCard
            title="ARCADE_AND_RADIO"
            tag="SOUND_LAB // GAMES"
            status="live"
          >
            <p className="font-mono text-sm leading-relaxed text-salt/70">
              Lightning cabinets and the ship radio. Credits, bottles, no
              committee.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/arcade"
                className={cn(dockLink, BRUTALIST_BUTTON_VARIANT_CLASS.primary)}
              >
                ARCADE
              </Link>
              <Link
                href="/music"
                className={cn(dockLink, BRUTALIST_BUTTON_VARIANT_CLASS.secondary)}
              >
                RADIO
              </Link>
            </div>
          </TerminalCard>
        </div>
      </Container>
    </section>
  );
}
