import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";
import { ARCADE_CREDITS_PER_PAY, ARCADE_PRICE_SATS } from "@/lib/arcade";
import { GRAFFITI_PRICE_SATS, GRAFFITI_TTL_HOURS } from "@/lib/graffiti";
import { STORY_PRICE_SATS } from "@/lib/story";
import { TAB_PRICE_SATS } from "@/lib/tab";

const machines = [
  {
    href: "/graffiti",
    code: "01",
    name: "Graffiti Wall",
    hook: `${GRAFFITI_PRICE_SATS} sats. ${GRAFFITI_TTL_HOURS} hours.`,
    body: "Leave a mark. Bitcoin Is Hope stays forever. Everything else fades.",
    cta: "Tag the wall",
    accent: "sats",
  },
  {
    href: "/arcade",
    code: "02",
    name: "Lightning Arcade",
    hook: `${ARCADE_PRICE_SATS} sats. ${ARCADE_CREDITS_PER_PAY} credits.`,
    body: "Insert coin. WAVE RUNNER. High scores on the cabinet. No tokens, no app store.",
    cta: "Smash the arcade",
    accent: "magenta",
  },
  {
    href: "/tab",
    code: "03",
    name: "THE TAB",
    hook: `${TAB_PRICE_SATS} sats. One sitting.`,
    body: "One credit. One stool. Talk until the ash falls. Isolated pool. No KYC.",
    cta: "Sit the tab",
    accent: "cyan",
  },
  {
    href: "/music",
    code: "04",
    name: "Surf Radio",
    hook: "Live on the ship.",
    body: "Listen from international waters. Request on the ship. Public is the DJ.",
    cta: "Enter Surf Radio",
    accent: "sats",
  },
  {
    href: "/story",
    code: "05",
    name: "Story Chain",
    hook: `${STORY_PRICE_SATS} sats. One line.`,
    body: "Write the next sentence. Lightning seals it. The book stays.",
    cta: "Write a line",
    accent: "magenta",
  },
] as const;

const readouts = [
  {
    href: "/tidechain",
    code: "01",
    name: "Tidechain",
    hook: "The clock.",
    body: "Block height. Price. The swell of the day.",
  },
  {
    href: "/lineup",
    code: "02",
    name: "Lineup",
    hook: "Next block.",
    body: "Watch unconfirmed txs pack the rail.",
  },
  {
    href: "/signal",
    code: "03",
    name: "Signal",
    hook: "Pleb feeds.",
    body: "Underground RSS. No editor, no algorithm.",
  },
  {
    href: "/tools",
    code: "04",
    name: "Tools",
    hook: "The kit.",
    body: "Wallets, signers, and other beach gear.",
  },
  {
    href: "/fiat",
    code: "05",
    name: "Dirty Fiat",
    hook: "The joke.",
    body: "Watch the printer go brrr. Then come back to sats.",
  },
] as const;

export function FeaturedTools() {
  return (
    <>
      <section>
        <Container className="py-14 sm:py-20">
          <SectionHeading
            eyebrow="the_floor"
            title="The machines"
            description="Pay 21 sats. The thing happens. No accounts. No committee."
          />
          <div className="mt-10 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {machines.map((machine) => (
              <Link
                key={machine.href}
                href={machine.href}
                className={cn(
                  "panel panel-hover group flex min-w-0 flex-col p-5 sm:p-6",
                  machine.accent === "sats" && "hover:border-sats/60",
                  machine.accent === "magenta" && "hover:border-magenta/60",
                  machine.accent === "cyan" && "hover:border-cyan/60",
                )}
              >
                <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em]">
                  <span
                    className={
                      machine.accent === "magenta"
                        ? "text-magenta"
                        : machine.accent === "cyan"
                          ? "text-cyan"
                          : "text-sats"
                    }
                  >
                    {machine.code}
                  </span>
                  <span className="text-muted">machine</span>
                </div>
                <h3 className="mt-4 break-words font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
                  {machine.name}
                </h3>
                <p
                  className={cn(
                    "mt-2 font-mono text-xs uppercase tracking-[0.12em]",
                    machine.accent === "magenta"
                      ? "text-magenta"
                      : machine.accent === "cyan"
                        ? "text-cyan"
                        : "text-sats",
                  )}
                >
                  {machine.hook}
                </p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                  {machine.body}
                </p>
                <span className="mt-6 font-mono text-xs uppercase tracking-[0.16em] text-sats group-hover:text-cyan">
                  {machine.cta} -&gt;
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-dashed border-cyan/20 bg-panel/70">
        <Container className="py-8 sm:py-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan">
            {"//"} money_rules
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
            Sats in, sats out. No treasury. Never HODLed. No KYC. 100% zapped
            back to the ecosystem.
          </p>
        </Container>
      </section>

      <section>
        <Container className="py-14 sm:py-16">
          <SectionHeading
            eyebrow="readouts"
            title="The signal"
            description="Clocks and feeds. Useful. Not the main event."
          />
          <div className="mt-8 grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {readouts.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="panel panel-hover group flex min-w-0 flex-col p-4 sm:p-5"
              >
                <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em]">
                  <span className="text-cyan">{item.code}</span>
                  <span className="text-muted">readout</span>
                </div>
                <h3 className="mt-3 break-words font-display text-xl font-bold uppercase tracking-tight">
                  {item.name}
                </h3>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-cyan">
                  {item.hook}
                </p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                  {item.body}
                </p>
                <span className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-sats group-hover:text-cyan">
                  open -&gt;
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
