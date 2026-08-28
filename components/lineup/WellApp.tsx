"use client";

import { useCallback, useMemo, useState } from "react";
import { WellCanvas } from "@/components/lineup/WellCanvas";
import { WellFallback } from "@/components/lineup/WellFallback";
import { WellRail } from "@/components/lineup/WellRail";
import { useLineupSnapshot } from "@/components/lineup/useLineupSnapshot";
import { wellVisualFromSnapshot } from "@/components/lineup/wellVisual";
import type { LineupSnapshot } from "@/lib/lineup";

export function WellApp({ initial }: { initial: LineupSnapshot }) {
  const { snapshot, status } = useLineupSnapshot(initial);
  const [gpu, setGpu] = useState(false);
  const onGpu = useCallback((ok: boolean) => setGpu(ok), []);
  const visual = useMemo(() => wellVisualFromSnapshot(snapshot), [snapshot]);
  const dominant = visual.bands.reduce(
    (best, band) => (band.weight > best.weight ? band : best),
    visual.bands[0],
  );

  return (
    <div className="well-page" data-gpu={gpu ? "on" : "off"}>
      <div className="well-stage">
        {!gpu ? <WellFallback snapshot={snapshot} /> : null}
        <WellCanvas
          snapshot={snapshot}
          onGpu={onGpu}
          className={gpu ? undefined : "is-pending"}
        />
        <div className="well-copy">
          <p className="well-kicker">next block</p>
          <h1>THE WELL</h1>
          <p className="well-line">High fees fall in first. Everything else waits.</p>
        </div>
        <p className="well-debug">
          particles {visual.particleCount} · band0{" "}
          {Math.round((visual.bands[0]?.weight ?? 0) * 100)}% · fill{" "}
          {visual.fill.toFixed(2)}
          {dominant ? ` · ${dominant.fee.toFixed(0)} sat/vB` : ""}
        </p>
      </div>
      <WellRail snapshot={snapshot} status={status} />
    </div>
  );
}
