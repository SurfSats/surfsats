import Link from "next/link";
import { SwellScorecard } from "@/components/home/SwellScorecard";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";
import { ARCADE_CREDITS_PER_PAY, ARCADE_PRICE_SATS } from "@/lib/arcade";
import { GRAFFITI_PRICE_SATS, GRAFFITI_TTL_HOURS } from "@/lib/graffiti";
import { STORY_PRICE_SATS } from "@/lib/story";
import { TAB_PRICE_SATS } from "@/lib/tab";
import type { TimechainSnapshot } from "@/lib/timechain";

const machines = [
  {
    href: "/graffiti",
    name: "Graffiti Wall",
    hook: `${GRAFFITI_PRICE_SATS} sats. ${GRAFFITI_TTL_HOURS} hours.`,
    cta: "Tag the wall",
    accent: "sats",
    fallback: "wall",
  },
  {
    href: "/arcade",
    name: "Lightning Arcade",
    hook: `${ARCADE_PRICE_SATS} sats. ${ARCADE_CREDITS_PER_PAY} credits.`,
    cta: "Smash the arcade",
    accent: "magenta",
    src: "/arcade-cabinet-front.jpg",
    position: "50% 40%",
  },
  {
    href: "/tab",
    name: "THE TAB",
    hook: `${TAB_PRICE_SATS} sats. One stool.`,
    cta: "Sit the tab",
    accent: "cyan",
    src: "/tab/art/tab-night.jpg",
    position: "28% 82%",
  },
  {
    href: "/music",
    name: "Surf Radio",
    hook: "Live on the ship.",
    cta: "Enter Surf Radio",
    accent: "sats",
    src: "/jukebox-ship.png",
    position: "50% 42%",
  },
  {
    href: "/story",
    name: "Story Chain",
    hook: `${STORY_PRICE_SATS} sats. One line.`,
    cta: "Write a line",
    accent: "magenta",
    src: "/story-writer-quarters.jpg",
    position: "50% 55%",
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

export function FeaturedTools({
  initial,
}: {
  initial: TimechainSnapshot | null;
}) {
  return (
    <>
      <section id="the-floor" className="floor-section">
        <Container className="py-10 sm:py-14">
          <SwellScorecard initial={initial} compact />
          <div className="mt-10 sm:mt-12">
            <SectionHeading
              eyebrow="the_floor"
              title="The machines"
              description="Pay 21 sats. The thing happens. No accounts. No committee."
            />
          </div>
          <div className="floor-dock">
            {machines.map((machine) => (
              <FloorObject key={machine.href} machine={machine} />
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
        <Container className="py-12 sm:py-14">
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

function FloorObject({
  machine,
}: {
  machine: (typeof machines)[number];
}) {
  const wall = "fallback" in machine && machine.fallback === "wall";
  const src = "src" in machine ? machine.src : undefined;
  const position = "position" in machine ? machine.position : undefined;

  return (
    <Link
      href={machine.href}
      className={cn(
        "floor-object group",
        machine.accent === "sats" && "floor-object-sats",
        machine.accent === "magenta" && "floor-object-magenta",
        machine.accent === "cyan" && "floor-object-cyan",
      )}
    >
      <div
        className={cn("floor-object-art", wall && "floor-wall")}
        style={
          src
            ? { backgroundImage: `url(${src})`, backgroundPosition: position }
            : undefined
        }
        aria-hidden="true"
      >
        {wall ? (
          <p className="floor-wall-piece">
            <span>Bitcoin Is</span>
            <span>Hope</span>
          </p>
        ) : null}
      </div>
      <div className="floor-object-copy">
        <h3>{machine.name}</h3>
        <p>{machine.hook}</p>
        <span>
          {machine.cta} -&gt;
        </span>
      </div>
    </Link>
  );
}
