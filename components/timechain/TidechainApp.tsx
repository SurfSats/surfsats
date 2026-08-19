"use client";

import { useEffect, useState } from "react";
import {
  TideClock,
  setCondition,
  swellLabel,
} from "@/components/timechain/TideClock";
import { useTimechainSnapshot } from "@/components/timechain/useTimechainSnapshot";
import { cn } from "@/lib/cn";
import {
  type TimechainSnapshot,
  formatBlockAge,
  formatChange,
  formatDifficulty,
  formatHashrate,
  formatInteger,
  formatUsd,
  hasLiveData,
} from "@/lib/timechain";

export function TidechainApp({ initial }: { initial: TimechainSnapshot }) {
  const { snapshot, status } = useTimechainSnapshot(initial);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const live = hasLiveData(snapshot);
  const ageSec =
    snapshot.lastBlockTimestamp !== null
      ? Math.max(0, now / 1000 - snapshot.lastBlockTimestamp)
      : null;
  const direction = snapshot.priceDirection;

  if (status === "error" && !live) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4 text-center font-mono text-sm text-muted">
        gauge silent · mempool.space fogged in
      </div>
    );
  }

  if (status === "loading" && !live) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4 text-center">
        <p className="flicker font-display text-2xl font-bold uppercase text-cyan">
          Sounding the tide
        </p>
      </div>
    );
  }

  return (
    <div className="tidechain-shell">
      <header className="tidechain-mast">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
            ocean time · no narrative
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold uppercase leading-none tracking-tight sm:text-4xl">
            TideChain
          </h1>
        </div>
        <p className="max-w-sm font-display text-sm font-semibold uppercase tracking-wide text-sats sm:text-base">
          The chain is the clock. The tide is the schedule.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          {status === "live" ? "live · 30s" : status} · mempool.space
        </p>
      </header>

      <div className="tidechain-strip" aria-label="Live readout">
        <Strip
          label="height"
          value={
            snapshot.blockHeight !== null
              ? formatInteger(snapshot.blockHeight)
              : "—"
          }
        />
        <Strip
          label="last set"
          value={ageSec !== null ? formatBlockAge(ageSec) : "—"}
          hint={ageSec !== null ? swellLabel(ageSec) : undefined}
          tone="cyan"
        />
        <Strip
          label="moscow"
          value={
            snapshot.satsPerDollar !== null
              ? formatInteger(snapshot.satsPerDollar)
              : "—"
          }
          hint="sats / $"
          tone="sats"
        />
        <Strip
          label="btc"
          value={
            snapshot.priceUsd !== null ? formatUsd(snapshot.priceUsd) : "—"
          }
        />
        <Strip
          label="24h"
          value={
            snapshot.priceChangePct !== null
              ? formatChange(snapshot.priceChangePct)
              : "—"
          }
          hint={
            direction === "up"
              ? "rising"
              : direction === "down"
                ? "drawback"
                : "chop"
          }
          tone={
            direction === "up"
              ? "cyan"
              : direction === "down"
                ? "magenta"
                : "sats"
          }
        />
        <Strip
          label="fees"
          value={
            snapshot.fastestFee !== null ? `${snapshot.fastestFee}` : "—"
          }
          hint={snapshot.feeLabel ?? "sat/vB"}
        />
      </div>

      <div className="tidechain-stage">
        <div className="tidechain-instrument">
          <TideClock snapshot={snapshot} />
        </div>

        <aside className="tidechain-dock">
          <Dock
            label="tide turning"
            value={
              snapshot.remainingBlocksToRetarget !== null
                ? formatInteger(snapshot.remainingBlocksToRetarget)
                : "—"
            }
            hint={
              snapshot.difficultyProgressPercent !== null
                ? `${snapshot.difficultyProgressPercent.toFixed(1)}% of epoch`
                : "blocks to retarget"
            }
            tone="magenta"
          />
          <Dock
            label="king tide"
            value={
              snapshot.blocksToHalving !== null
                ? formatInteger(snapshot.blocksToHalving)
                : "—"
            }
            hint={
              snapshot.halvingProgressPercent !== null
                ? `${snapshot.halvingProgressPercent.toFixed(1)}% of era`
                : "blocks to halving"
            }
            tone="sats"
          />
          <Dock
            label="water / supply"
            value={
              snapshot.supplyPercent !== null
                ? `${snapshot.supplyPercent.toFixed(2)}%`
                : "—"
            }
            hint={
              snapshot.supplyIssued !== null
                ? `${formatInteger(Math.round(snapshot.supplyIssued))} / 21M`
                : undefined
            }
          />
          <Dock
            label="hashrate"
            value={
              snapshot.hashrateEh !== null
                ? formatHashrate(snapshot.hashrateEh)
                : "—"
            }
          />
          <Dock
            label="difficulty"
            value={
              snapshot.difficulty !== null
                ? formatDifficulty(snapshot.difficulty)
                : "—"
            }
            hint={
              snapshot.difficultyChangePct !== null
                ? formatChange(snapshot.difficultyChangePct)
                : undefined
            }
          />
          <Dock
            label="24h sets"
            value={
              snapshot.blocksLast24h !== null
                ? formatInteger(snapshot.blocksLast24h)
                : "—"
            }
            hint={setCondition(snapshot.blocksLast24h)}
          />
        </aside>
      </div>

      <footer className="tidechain-legend">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
          legend
        </p>
        <ul>
          <li>
            <span className="text-cyan">Swell</span> last block. Surface builds
            toward a 10-minute set.
          </li>
          <li>
            <span className="text-magenta">Tide</span> difficulty epoch. Marker
            climbs until retarget.
          </li>
          <li>
            <span className="text-sats">King tide</span> halving season. Arc
            fills across 210,000 blocks.
          </li>
          <li>
            <span className="text-foreground">Water</span> share of 21M issued.
            Dashed line is high tide.
          </li>
        </ul>
      </footer>
    </div>
  );
}

function Strip({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "cyan" | "magenta" | "sats";
}) {
  return (
    <div className="tidechain-strip-item">
      <p className="text-muted">{label}</p>
      <p
        className={cn(
          "font-display text-lg font-bold uppercase tracking-tight sm:text-xl",
          tone === "cyan" && "text-cyan",
          tone === "magenta" && "text-magenta",
          tone === "sats" && "text-sats",
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-muted">{hint}</p> : null}
    </div>
  );
}

function Dock({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "cyan" | "magenta" | "sats";
}) {
  return (
    <div className="tidechain-dock-item">
      <p className="text-muted">{label}</p>
      <p
        className={cn(
          "font-display text-xl font-bold uppercase tracking-tight",
          tone === "cyan" && "text-cyan",
          tone === "magenta" && "text-magenta",
          tone === "sats" && "text-sats",
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-muted">{hint}</p> : null}
    </div>
  );
}
