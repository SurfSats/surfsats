import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";
import { JUKEBOX_PRICE_SATS } from "@/lib/jukebox";
import { WAVE_POOL_GOAL_SATS } from "@/lib/wavepool";

const tools = [
  {
    href: "/lineup",
    code: "01",
    name: "The Lineup",
    hook: "Mempool as a night session.",
    body: "Fee rate is position. The next block is the set. Inspect a body in the water or watch the peak drop in.",
    cta: "enter_lineup",
    accent: "cyan",
  },
  {
    href: "/wavepool",
    code: "02",
    name: "Wave Pool",
    hook: `${WAVE_POOL_GOAL_SATS} sats. One shared set.`,
    body: "Zap the pool. Bitcoin up on the day: barrel. Down: closeout. Collective energy with a violent break.",
    cta: "feed_the_wave",
    accent: "magenta",
  },
  {
    href: "/jukebox",
    code: "03",
    name: "Global Jukebox",
    hook: `${JUKEBOX_PRICE_SATS} sats. Any song.`,
    body: "Pay Lightning. Be the DJ. No playlist committee. Stream is live on Noderunners Radio.",
    cta: "drop_21_sats",
    accent: "sats",
  },
] as const;

export function FeaturedTools() {
  return (
    <section>
      <Container className="py-14 sm:py-20">
        <SectionHeading
          eyebrow="live_tools"
          title="The machines"
          description="Not a blog with a tip jar. Three things you can actually use."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={cn(
                "panel panel-hover group flex flex-col p-5 sm:p-6",
                tool.accent === "cyan" && "hover:border-cyan/60",
                tool.accent === "magenta" && "hover:border-magenta/60",
                tool.accent === "sats" && "hover:border-sats/60",
              )}
            >
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em]">
                <span
                  className={cn(
                    tool.accent === "cyan" && "text-cyan",
                    tool.accent === "magenta" && "text-magenta",
                    tool.accent === "sats" && "text-sats",
                  )}
                >
                  {tool.code}
                </span>
                <span className="text-muted">tool</span>
              </div>
              <h3 className="mt-4 font-display text-2xl font-bold uppercase tracking-tight">
                {tool.name}
              </h3>
              <p
                className={cn(
                  "mt-2 font-mono text-xs uppercase tracking-[0.12em]",
                  tool.accent === "cyan" && "text-cyan",
                  tool.accent === "magenta" && "text-magenta",
                  tool.accent === "sats" && "text-sats",
                )}
              >
                {tool.hook}
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                {tool.body}
              </p>
              <span className="mt-6 font-mono text-xs uppercase tracking-[0.16em] text-sats group-hover:text-cyan">
                {tool.cta} -&gt;
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
