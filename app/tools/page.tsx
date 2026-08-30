import type { Metadata } from "next";
import { ToolCard } from "@/components/tools/ToolCard";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getToolDirectory } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Toolbox",
  description:
    "A Bitcoin playground: music, Nostr, maps, games, and spend rails. Tools for ocean time and Bitcoin time.",
};

export default function ToolsPage() {
  const directory = getToolDirectory();

  return (
    <div className="kit-page">
      <header className="readout-strip">
        <p>toolbox · no affiliates · just signal</p>
      </header>
      <div className="readout-body">
        <Container className="relative py-8 sm:py-10">
          <p className="signal-kicker">A surf shop for the timechain.</p>

          <div className="mt-10 flex flex-col gap-16 sm:gap-20">
            {directory.map((section) => (
              <section key={section.id} id={section.id} className="min-w-0">
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
    </div>
  );
}
