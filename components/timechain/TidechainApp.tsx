"use client";

import { useEffect, useState } from "react";
import { TideClock, TideRead, swellLabel } from "@/components/timechain/TideClock";
import { useTimechainSnapshot } from "@/components/timechain/useTimechainSnapshot";
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
      <div className="border border-magenta/40 bg-black px-4 py-16 text-center font-mono text-sm text-muted">
        gauge silent · mempool.space fogged in
      </div>
    );
  }

  if (status === "loading" && !live) {
    return (
      <div className="border border-cyan/30 bg-black px-4 py-16 text-center">
        <p className="flicker font-display text-2xl font-bold uppercase text-cyan">
          Sounding the tide
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <TideClock snapshot={snapshot} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TideRead
            label="btc / usd"
            value={snapshot.priceUsd !== null ? formatUsd(snapshot.priceUsd) : "—"}
            hint="spot"
          />
          <TideRead
            label="moscow_time"
            value={
              snapshot.satsPerDollar !== null
                ? `${formatInteger(snapshot.satsPerDollar)}`
                : "—"
            }
            hint="sats / $"
            tone="sats"
          />
          <TideRead
            label="24h swell"
            value={
              snapshot.priceChangePct !== null
                ? formatChange(snapshot.priceChangePct)
                : "—"
            }
            hint={
              direction === "up"
                ? "rising tide · barrel"
                : direction === "down"
                  ? "drawback · closeout"
                  : "sideways chop"
            }
            tone={
              direction === "up"
                ? "cyan"
                : direction === "down"
                  ? "magenta"
                  : "sats"
            }
          />
          <TideRead
            label="last_set"
            value={ageSec !== null ? formatBlockAge(ageSec) : "—"}
            hint={ageSec !== null ? swellLabel(ageSec) : undefined}
            tone="cyan"
          />
          <TideRead
            label="height"
            value={
              snapshot.blockHeight !== null
                ? formatInteger(snapshot.blockHeight)
                : "—"
            }
            hint="blocks on the pole"
          />
          <TideRead
            label="supply_water"
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
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TideRead
          label="tide_turning"
          value={
            snapshot.remainingBlocksToRetarget !== null
              ? `${formatInteger(snapshot.remainingBlocksToRetarget)}`
              : "—"
          }
          hint={
            snapshot.difficultyProgressPercent !== null
              ? `${snapshot.difficultyProgressPercent.toFixed(1)}% of this tide`
              : "blocks to retarget"
          }
          tone="magenta"
        />
        <TideRead
          label="king_tide"
          value={
            snapshot.blocksToHalving !== null
              ? formatInteger(snapshot.blocksToHalving)
              : "—"
          }
          hint="blocks to next halving"
          tone="sats"
        />
        <TideRead
          label="hashrate"
          value={
            snapshot.hashrateEh !== null
              ? formatHashrate(snapshot.hashrateEh)
              : "—"
          }
        />
        <TideRead
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
        <TideRead
          label="24h_sets"
          value={
            snapshot.blocksLast24h !== null
              ? formatInteger(snapshot.blocksLast24h)
              : "—"
          }
          hint="expected ~144"
        />
        <TideRead
          label="fees"
          value={
            snapshot.fastestFee !== null
              ? `${snapshot.fastestFee} sat/vB`
              : "—"
          }
          hint={snapshot.feeLabel ?? undefined}
        />
      </div>

      <section className="panel p-5 sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
          {"//"} legend
        </p>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
          <li>
            <span className="text-cyan">Swell</span> — seconds since the last
            block. The surface builds toward a 10-minute set.
          </li>
          <li>
            <span className="text-magenta">Tide turning</span> — difficulty
            epoch. The marker climbs the staff until retarget.
          </li>
          <li>
            <span className="text-sats">King tide</span> — the halving season.
            The deep orange current is how far we are through this 210,000-block
            era.
          </li>
          <li>
            <span className="text-foreground">Water level</span> — share of the
            21 million already issued. The dashed line is high tide.
          </li>
          <li>
            <span className="text-sats">24h swell (price)</span> — same number
            that picks barrel vs closeout on the Wave Pool.
          </li>
        </ul>
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          source: mempool.space · the chain is the clock · the tide is the
          schedule
        </p>
      </section>
    </div>
  );
}
