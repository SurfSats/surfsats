import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";
import { JUKEBOX_PRICE_SATS } from "@/lib/jukebox";

const tools = [
  {
    href: "/lineup",
    code: "01",
    name: "The Lineup",
    hook: "Watch the next block fill.",
    body: "Unconfirmed txs pack a next-block rail by fee density. High fee first. Inspect a packet.",
    cta: "enter_lineup",
    accent: "cyan",
  },
  {
    href: "/jukebox",
    code: "02",
    name: "Global Jukebox",
    hook: `${JUKEBOX_PRICE_SATS} sats. Any song.`,
    body: "Pay Lightning. Be the DJ. No playlist committee. Stream is live on Noderunners Radio.",
    cta: "drop_21_sats",
    accent: "sats",
  },
  {
    href: "/music",
    code: "03",
    name: "Surf Radio",
    hook: "Explore permissionless music.",
    body: "Stream, zap, and discover.",
    cta: "open_surf_radio",
    accent: "cyan",
  },
  {
    href: "/graffiti",
    code: "04",
    name: "Graffiti Wall",
    hook: "21 sats. 21 hours.",
    body: "Pay Lightning. Leave a mark. Bitcoin Is Hope stays forever.",
    cta: "tag_the_block",
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
          description="Not a blog with a tip jar. Things you can actually use."
        />
        <div className="mt-10 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={cn(
                "panel panel-hover group flex min-w-0 flex-col p-5 sm:p-6",
                tool.accent === "cyan" && "hover:border-cyan/60",
                tool.accent === "sats" && "hover:border-sats/60",
              )}
            >
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em]">
                <span
                  className={cn(
                    tool.accent === "cyan" && "text-cyan",
                    tool.accent === "sats" && "text-sats",
                  )}
                >
                  {tool.code}
                </span>
                <span className="text-muted">tool</span>
              </div>
              <h3 className="mt-4 break-words font-display text-2xl font-bold uppercase tracking-tight">
                {tool.name}
              </h3>
              <p
                className={cn(
                  "mt-2 font-mono text-xs uppercase tracking-[0.12em]",
                  tool.accent === "cyan" && "text-cyan",
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
