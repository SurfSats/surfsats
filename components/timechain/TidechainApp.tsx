"use client";

import { useEffect, useState } from "react";
import { TideClock } from "@/components/timechain/TideClock";
import { useTimechainSnapshot } from "@/components/timechain/useTimechainSnapshot";
import { cn } from "@/lib/cn";
import {
  type TimechainSnapshot,
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
      : 0;
  const direction = snapshot.priceDirection;
  const height =
    snapshot.blockHeight !== null ? String(snapshot.blockHeight) : "—";

  if (status === "error" && !live) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4 text-center font-mono text-sm text-muted">
        monitor silent · mempool.space offline
      </div>
    );
  }

  if (status === "loading" && !live) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4 text-center">
        <p className="flicker font-display text-2xl font-bold uppercase text-cyan">
          Syncing protocol
        </p>
      </div>
    );
  }

  return (
    <div className="tidechain-monitor">
      <header className="tidechain-hud-top">
        <div>
          <h1 className="tidechain-title">TideChain</h1>
          <p className="tidechain-kicker">Bitcoin protocol monitor</p>
        </div>
        <div className="tidechain-hud-prices">
          <HudStat
            label="BTC PRICE"
            value={
              snapshot.priceUsd !== null ? formatUsd(snapshot.priceUsd) : "—"
            }
            hint={
              snapshot.priceChangePct !== null
                ? formatChange(snapshot.priceChangePct)
                : undefined
            }
            tone={
              direction === "up"
                ? "cyan"
                : direction === "down"
                  ? "magenta"
                  : "sats"
            }
          />
          <HudStat
            label="MOSCOW TIME"
            value={
              snapshot.satsPerDollar !== null
                ? formatInteger(snapshot.satsPerDollar)
                : "—"
            }
            hint="SATS/$"
            tone="sats"
          />
        </div>
      </header>

      <div className="tidechain-core">
        <TideClock snapshot={snapshot} ageSec={ageSec} />
        <div className="tide-heart">
          <p className="tide-height">{height}</p>
          <p className="tide-height-label">Block height</p>
        </div>

        <div className="tidechain-corners">
          <HudStat
            className="tide-corner tide-corner-bl"
            label="HASHRATE"
            value={
              snapshot.hashrateEh !== null
                ? formatHashrate(snapshot.hashrateEh)
                : "—"
            }
          />
          <HudStat
            className="tide-corner tide-corner-bl2"
            label="DIFFICULTY"
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
          <HudStat
            className="tide-corner tide-corner-br"
            label="FEES"
            value={
              snapshot.fastestFee !== null
                ? `${snapshot.fastestFee} SAT/VB`
                : "—"
            }
            hint={snapshot.feeLabel ?? undefined}
            tone="sats"
          />
          <HudStat
            className="tide-corner tide-corner-br2"
            label="SUPPLY"
            value={
              snapshot.supplyIssued !== null
                ? `${(snapshot.supplyIssued / 1_000_000).toFixed(2)}M / 21M`
                : "—"
            }
            hint={
              snapshot.supplyPercent !== null
                ? `${snapshot.supplyPercent.toFixed(2)}% issued`
                : undefined
            }
          />
        </div>
      </div>

      <footer className="tidechain-hud-foot">
        <p>The chain is the clock. The tide is the schedule.</p>
        <p className="text-muted">
          {status === "live" ? "live · 30s" : status} · mempool.space
        </p>
      </footer>
    </div>
  );
}

function HudStat({
  label,
  value,
  hint,
  tone = "sats",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "cyan" | "magenta" | "sats";
  className?: string;
}) {
  return (
    <div className={cn("tide-hud", className)}>
      <p className="tide-hud-label">{label}</p>
      <p
        className={cn(
          "tide-hud-value",
          tone === "cyan" && "text-cyan",
          tone === "magenta" && "text-magenta",
          tone === "sats" && "text-sats",
        )}
      >
        {value}
      </p>
      {hint ? <p className="tide-hud-hint">{hint}</p> : null}
    </div>
  );
}
