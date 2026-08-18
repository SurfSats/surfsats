import type { Metadata } from "next";
import { ToolCard } from "@/components/tools/ToolCard";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TerminalLabel } from "@/components/ui/TerminalLabel";
import { getToolDirectory } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Toolbox",
  description:
    "A Bitcoin playground: music, Nostr, maps, games, and spend rails. Tools for ocean time and Bitcoin time.",
};

export default function ToolsPage() {
  const directory = getToolDirectory();

  return (
    <div className="relative">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[22rem]" />

      <Container className="relative py-14 sm:py-20">
        <section>
          <TerminalLabel>directory · no affiliates · just signal</TerminalLabel>
          <h1
            data-text="The Toolbox"
            className="glitch-title flicker mt-4 max-w-4xl font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl lg:text-7xl"
          >
            The Toolbox
          </h1>
          <p className="mt-5 font-display text-xl font-semibold uppercase tracking-wide text-sats sm:text-2xl">
            A surf shop for the timechain.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Music that zaps. Maps that take sats. Games that pay. Clients that
            do not own you. For people who live on ocean time and Bitcoin time.
          </p>
        </section>

        <div className="mt-14 flex flex-col gap-16 sm:gap-20">
          {directory.map((section) => (
            <section key={section.id} className="min-w-0">
              <SectionHeading
                eyebrow={section.eyebrow}
                title={section.title}
                description={section.description}
              />
              <div className="mt-8 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {section.tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </Container>
    </div>
  );
}
