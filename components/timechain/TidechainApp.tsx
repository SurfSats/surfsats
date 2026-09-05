"use client";

import { useEffect, useState } from "react";
import { TideClock, swellLabel } from "@/components/timechain/TideClock";
import { useTimechainSnapshot } from "@/components/timechain/useTimechainSnapshot";
import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";
import {
  type TimechainSnapshot,
  feeTone,
  formatBlockAge,
  formatChange,
  formatHashrate,
  formatInteger,
  formatInterval,
  formatUsdPrecise,
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
  const height =
    snapshot.blockHeight !== null ? String(snapshot.blockHeight) : "—";
  const tone = feeTone(snapshot.fastestFee);
  const epochHint =
    snapshot.remainingBlocksToRetarget !== null
      ? `retarget ${formatInteger(snapshot.remainingBlocksToRetarget)}`
      : null;

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
          {COPY.loadingMempool}
        </p>
      </div>
    );
  }

  return (
    <div className="tidechain-monitor">
      <header className="tide-hud">
        <h1 className="tide-hero">the chain is the clock</h1>
        <p className="tide-hud-line">
          <span>
            {snapshot.priceUsd !== null
              ? formatUsdPrecise(snapshot.priceUsd)
              : "—"}
          </span>
          <span>
            moscow{" "}
            {snapshot.satsPerDollar !== null
              ? formatInteger(snapshot.satsPerDollar)
              : "—"}
          </span>
          <span>
            {status === "live" ? "live" : status} · {formatBlockAge(ageSec)}
          </span>
        </p>
      </header>

      <div className="tide-stage">
        <div className="tide-core">
          <TideClock snapshot={snapshot} ageSec={ageSec} />
          <div className="tide-heart">
            <p className="tide-height">{height}</p>
            <p className="tide-height-label">height</p>
            <p className="tide-height-cap">{swellLabel(ageSec)}</p>
          </div>
          <figure className="tide-tick">
            <video
              autoPlay
              muted
              loop
              playsInline
              width={320}
              aria-label="Tick tock next block"
            >
              <source
                src="/tidechain/tick-tock-next-block.mp4"
                type="video/mp4"
              />
            </video>
            <figcaption>tick tock · cc0</figcaption>
          </figure>
        </div>
      </div>

      <div className="tide-instruments">
        <Meter
          label="subsidy"
          value={
            snapshot.subsidyBtc !== null ? `${snapshot.subsidyBtc} BTC` : "—"
          }
        />
        <Meter
          label="epoch"
          value={
            snapshot.epochBlocksDone !== null
              ? `${formatInteger(snapshot.epochBlocksDone)} / ${formatInteger(snapshot.epochLength)}`
              : "—"
          }
          hint={epochHint}
        />
        <Meter
          label="hashrate"
          value={
            snapshot.hashrateEh !== null
              ? formatHashrate(snapshot.hashrateEh)
              : "—"
          }
          hint={
            snapshot.hashrateChangePct !== null
              ? formatChange(snapshot.hashrateChangePct)
              : null
          }
        />
        <Meter
          label="fees"
          value={
            snapshot.fastestFee === null
              ? "—"
              : tone === "floor"
                ? `${snapshot.fastestFee} sat`
                : `${snapshot.fastestFee}`
          }
          hint={tone === "floor" ? "floor" : tone}
          tone={tone}
          unit={tone === "floor" || snapshot.fastestFee === null ? null : " sat/vB"}
        />
      </div>

      <footer className="tide-strip">
        <span>
          <i className="tide-dot" />
          mempool{" "}
          {snapshot.mempoolCount !== null
            ? formatInteger(snapshot.mempoolCount)
            : "—"}{" "}
          tx
        </span>
        <span>
          interval{" "}
          {snapshot.avgIntervalMs !== null
            ? formatInterval(snapshot.avgIntervalMs)
            : "—"}
        </span>
        <span>the chain is the clock</span>
      </footer>
    </div>
  );
}

function Meter({
  label,
  value,
  hint,
  tone,
  unit,
}: {
  label: string;
  value: string;
  hint?: string | null;
  tone?: ReturnType<typeof feeTone>;
  unit?: string | null;
}) {
  return (
    <div className={cn("tide-meter", tone && `is-${tone}`)}>
      <p className="tide-meter-label">{label}</p>
      <p className="tide-meter-value">
        {value}
        {unit ? <span className="tide-meter-unit">{unit}</span> : null}
      </p>
      {hint ? <p className="tide-meter-hint">{hint}</p> : null}
    </div>
  );
}
