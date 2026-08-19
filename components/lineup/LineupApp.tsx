"use client";

import { useEffect, useRef, useState } from "react";
import { FeeHistogram, LineupVisual } from "@/components/lineup/LineupVisual";
import { useLineupSnapshot } from "@/components/lineup/useLineupSnapshot";
import { formatInteger, formatBlockAge } from "@/lib/timechain";
import {
  formatVmb,
  formatVsize,
  hasLineupData,
  type LineupSnapshot,
} from "@/lib/lineup";

export function LineupApp({ initial }: { initial: LineupSnapshot }) {
  const { snapshot, status } = useLineupSnapshot(initial);
  const [now, setNow] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inflow, setInflow] = useState<number | null>(null);
  const prev = useRef({ t: Date.now(), vsize: initial.mempoolVsize ?? 0 });

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const vsize = snapshot.mempoolVsize;
    if (vsize === null) return;
    const t = Date.now();
    const dt = (t - prev.current.t) / 1000;
    if (dt >= 6) {
      setInflow((vsize - prev.current.vsize) / 1_000_000 / dt);
      prev.current = { t, vsize };
    }
  }, [snapshot.mempoolVsize, snapshot.fetchedAt]);

  const live = hasLineupData(snapshot);
  const age =
    snapshot.lastBlockTimestamp !== null
      ? formatBlockAge(now / 1000 - snapshot.lastBlockTimestamp)
      : "—";
  const filled = snapshot.nextBlockVsize ?? 0;
  const cap = snapshot.capacityVsize;
  const fullPct = Math.min(100, (filled / cap) * 100);
  const assembly =
    filled > 0 && snapshot.lastBlockTimestamp
      ? filled / 1_000_000 / Math.max(1, now / 1000 - snapshot.lastBlockTimestamp)
      : null;

  if (status === "error" && !live) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4 text-center font-mono text-sm text-muted">
        assembly rail silent · mempool.space offline
      </div>
    );
  }

  if (status === "loading" && !live) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4 text-center">
        <p className="flicker font-display text-2xl font-bold uppercase text-cyan">
          Building template
        </p>
      </div>
    );
  }

  return (
    <div className="lineup-monitor">
      <header className="lineup-head">
        <div>
          <p className="lineup-kicker">SurfSats protocol</p>
          <h1>The Lineup // Block Assembly</h1>
          <p className="lineup-tag">Watch the block fill</p>
        </div>
        <p className="lineup-live">
          <i /> live · {status}
        </p>
      </header>

      <div className="lineup-hud">
        <Hud
          label="Mempool tx count"
          value={
            snapshot.mempoolCount !== null
              ? formatInteger(snapshot.mempoolCount)
              : "—"
          }
          hint="txns"
        />
        <Hud
          label="Total vsize"
          value={
            snapshot.mempoolVsize !== null
              ? formatVmb(snapshot.mempoolVsize)
              : "—"
          }
          hint="vMB"
        />
        <Hud
          label="Next-block fee"
          value={
            snapshot.nextBlockMedianFee !== null
              ? snapshot.nextBlockMedianFee.toFixed(0)
              : snapshot.fastestFee !== null
                ? String(snapshot.fastestFee)
                : "—"
          }
          hint="sats/vB"
          tone="sats"
        />
        <Hud
          label="Block capacity"
          value={`${formatVmb(cap)}`}
          hint={`${fullPct.toFixed(0)}% full · ${formatVmb(filled)} vMB`}
        />
      </div>

      <LineupVisual
        snapshot={snapshot}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <div className="lineup-secondary">
        <FeeHistogram snapshot={snapshot} />
        <div className="lineup-through">
          <p className="lineup-hud-label">Live throughput</p>
          <div className="lineup-through-grid">
            <Hud
              label="Assembly rate"
              value={assembly !== null ? assembly.toFixed(2) : "—"}
              hint="vMB/s · since last block"
            />
            <Hud
              label="Inflow rate"
              value={inflow !== null ? inflow.toFixed(2) : "—"}
              hint="vMB/s · mempool delta"
              tone="sats"
            />
            <Hud
              label="Queue depth"
              value={
                snapshot.mempoolCount !== null && snapshot.nextBlockNtx !== null
                  ? formatInteger(
                      Math.max(0, snapshot.mempoolCount - snapshot.nextBlockNtx),
                    )
                  : "—"
              }
              hint={
                snapshot.mempoolVsize !== null
                  ? `${formatVsize(Math.max(0, snapshot.mempoolVsize - filled))} waiting`
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      <footer className="lineup-strip">
        <span>network · mainnet</span>
        <span>
          last block{" "}
          {snapshot.blockHeight !== null
            ? formatInteger(snapshot.blockHeight)
            : "—"}
          {age !== "—" ? ` · ${age} ago` : ""}
        </span>
        <span>
          next template{" "}
          {snapshot.nextBlockNtx !== null
            ? `${formatInteger(snapshot.nextBlockNtx)} tx`
            : "—"}
        </span>
        <span>{snapshot.feeLabel ?? "fees —"}</span>
      </footer>
    </div>
  );
}

function Hud({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "sats" | "cyan";
}) {
  return (
    <div className="lineup-hud-card">
      <p className="lineup-hud-label">{label}</p>
      <p className={tone === "sats" ? "text-sats" : "text-cyan"}>{value}</p>
      {hint ? <p className="lineup-hud-hint">{hint}</p> : null}
    </div>
  );
}
