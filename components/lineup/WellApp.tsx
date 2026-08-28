"use client";

import { useCallback, useState } from "react";
import { WellCanvas } from "@/components/lineup/WellCanvas";
import { WellRail } from "@/components/lineup/WellRail";
import { useLineupSnapshot } from "@/components/lineup/useLineupSnapshot";
import type { LineupSnapshot } from "@/lib/lineup";

export function WellApp({ initial }: { initial: LineupSnapshot }) {
  const { snapshot, status } = useLineupSnapshot(initial);
  const [gpu, setGpu] = useState(false);
  const onGpu = useCallback((ok: boolean) => setGpu(ok), []);

  return (
    <div className="well-page" data-gpu={gpu ? "on" : "off"}>
      <div className="well-stage">
        <div className="well-fallback" aria-hidden="true">
          <span className="well-fallback-hole" />
          <span className="well-fallback-ring" data-i="1" />
          <span className="well-fallback-ring" data-i="2" />
          <span className="well-fallback-ring" data-i="3" />
        </div>
        <WellCanvas
          snapshot={snapshot}
          onGpu={onGpu}
          className={gpu ? undefined : "is-hidden"}
        />
        <div className="well-copy">
          <p className="well-kicker">next block</p>
          <h1>THE WELL</h1>
          <p className="well-line">High fees fall in first. Everything else waits.</p>
        </div>
      </div>
      <WellRail snapshot={snapshot} status={status} />
    </div>
  );
}
