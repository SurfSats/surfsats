"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FeeChips } from "@/components/lineup/FeeChips";
import { RecentBlocks } from "@/components/lineup/RecentBlocks";
import { WellCards } from "@/components/lineup/WellCards";
import { WellStack } from "@/components/lineup/WellStack";
import { useLineupSnapshot } from "@/components/lineup/useLineupSnapshot";
import { Container } from "@/components/ui/Container";
import { TerminalLabel } from "@/components/ui/TerminalLabel";
import { hasLineupData, type LineupSnapshot } from "@/lib/lineup";

export function WellApp({ initial }: { initial: LineupSnapshot }) {
  const { snapshot, status } = useLineupSnapshot(initial);
  const [now, setNow] = useState(() => Date.now());
  const live = hasLineupData(snapshot);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (status === "error" && !live) {
    return (
      <div className="well-page">
        <Container className="grid min-h-[60vh] place-items-center py-16 text-center">
          <p className="font-mono text-sm text-muted">
            well silent · mempool.space offline
          </p>
        </Container>
      </div>
    );
  }

  if (status === "loading" && !live) {
    return (
      <div className="well-page">
        <Container className="grid min-h-[60vh] place-items-center py-16 text-center">
          <p className="flicker font-display text-2xl font-bold uppercase text-cyan">
            sounding the well
          </p>
        </Container>
      </div>
    );
  }

  return (
    <div className="well-page">
      <Container className="well-shell">
        <header className="well-head">
          <div>
            <TerminalLabel>
              mempool · {status === "live" ? "live · 20s" : status}
            </TerminalLabel>
            <h1 className="well-title">THE WELL</h1>
            <p className="well-line">
              High fees fall in first. Everything else waits.
            </p>
          </div>
          <Link href="/tidechain" className="well-readout well-head-readout">
            readout -&gt;
          </Link>
        </header>

        <section aria-label="Recommended fees">
          <FeeChips snapshot={snapshot} />
        </section>

        <section aria-label="The Well">
          <p className="well-section-kicker">the well · projected blocks</p>
          <WellStack snapshot={snapshot} />
        </section>

        <WellCards snapshot={snapshot} now={now} />

        <section aria-label="Recent blocks">
          <p className="well-section-kicker">recent blocks</p>
          <RecentBlocks snapshot={snapshot} now={now} />
        </section>

        <p className="well-foot">
          readout via mempool.space API · data from mempool.space · we don&apos;t
          run the node
        </p>
      </Container>
    </div>
  );
}
