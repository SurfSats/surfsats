"use client";

import { useEffect, useState } from "react";
import { TideClock } from "@/components/timechain/TideClock";
import { useTimechainSnapshot } from "@/components/timechain/useTimechainSnapshot";
import { cn } from "@/lib/cn";
import {
  type TimechainSnapshot,
  formatBlockAge,
  formatChange,
  formatDifficulty,
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
      <header className="tide-head">
        <p className="tide-head-brand">
          SurfSats <span>protocol monitor</span>
        </p>
        <p className="tide-head-center">
          Bitcoin protocol // mainnet
          <span className="tide-live">
            <i /> live
          </span>
        </p>
        <p className="tide-head-clock">
          {status === "live" ? "live · 30s" : status} · mempool.space
        </p>
      </header>

      <div className="tide-stage">
        <article className="tide-panel tide-price">
          <p className="tide-hud-label">BTC PRICE</p>
          <p className="tide-hud-value text-sats">
            {snapshot.priceUsd !== null
              ? formatUsdPrecise(snapshot.priceUsd)
              : "—"}
          </p>
          <p
            className={cn(
              "tide-hud-hint",
              direction === "up" && "text-cyan",
              direction === "down" && "text-magenta",
            )}
          >
            {snapshot.priceChangePct !== null
              ? `${formatChange(snapshot.priceChangePct)} 24h change`
              : "24h change —"}
          </p>
          {snapshot.priceUsdYesterday !== null ? (
            <p className="tide-hud-meta">
              yesterday {formatUsdPrecise(snapshot.priceUsdYesterday)}
            </p>
          ) : null}
        </article>

        <article className="tide-panel tide-moscow">
          <p className="tide-hud-label">MOSCOW TIME</p>
          <p className="tide-hud-value text-sats">
            {snapshot.satsPerDollar !== null
              ? formatInteger(snapshot.satsPerDollar)
              : "—"}
          </p>
          <p className="tide-hud-hint">SATS / $</p>
          <p className="tide-hud-meta">
            24h{" "}
            <span
              className={cn(
                snapshot.satsChange24h !== null && snapshot.satsChange24h < 0
                  ? "text-magenta"
                  : "text-cyan",
              )}
            >
              {snapshot.satsChange24h !== null
                ? formatChange(snapshot.satsChange24h)
                : "—"}
            </span>
            {" · "}
            30d{" "}
            <span
              className={cn(
                snapshot.satsChange30d !== null && snapshot.satsChange30d < 0
                  ? "text-magenta"
                  : "text-cyan",
              )}
            >
              {snapshot.satsChange30d !== null
                ? formatChange(snapshot.satsChange30d)
                : "—"}
            </span>
          </p>
        </article>

        <div className="tide-core">
          <TideClock snapshot={snapshot} ageSec={ageSec} />
          <div className="tide-heart">
            <p className="tide-height">{height}</p>
            <p className="tide-height-label">Block height</p>
            <p className="tide-height-cap">
              <span className="tide-dot" /> engine core // gravitational heart
            </p>
          </div>

          <div className="tide-side tide-side-l">
            <Side
              label="Halving block"
              value={
                snapshot.nextHalvingHeight !== null
                  ? formatInteger(snapshot.nextHalvingHeight)
                  : "—"
              }
            />
            <Side
              label="Epoch start"
              value={
                snapshot.epochStart !== null
                  ? formatInteger(snapshot.epochStart)
                  : "—"
              }
            />
          </div>
          <div className="tide-side tide-side-r">
            <Side
              label="Epoch end"
              value={
                snapshot.epochEnd !== null
                  ? formatInteger(snapshot.epochEnd)
                  : "—"
              }
            />
            <Side
              label="Subsidy"
              value={
                snapshot.subsidyBtc !== null
                  ? `${snapshot.subsidyBtc} BTC`
                  : "—"
              }
            />
          </div>
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
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            tick tock next block · artdesignbySF · cc0
          </p>
        </figure>

        <article className="tide-panel tide-hash">
          <p className="tide-hud-label">HASHRATE</p>
          <p className="tide-hud-value text-magenta">
            {snapshot.hashrateEh !== null
              ? formatHashrate(snapshot.hashrateEh)
              : "—"}
          </p>
          <p
            className={cn(
              "tide-hud-hint",
              snapshot.hashrateChangePct !== null &&
                snapshot.hashrateChangePct < 0
                ? "text-magenta"
                : "text-cyan",
            )}
          >
            {snapshot.hashrateChangePct !== null
              ? `${formatChange(snapshot.hashrateChangePct)} 24h change`
              : "24h change —"}
          </p>
          <Spark values={snapshot.hashrateSpark} />
        </article>

        <article className="tide-panel tide-fees">
          <p className="tide-hud-label">FEES</p>
          <p className="tide-hud-value text-sats">
            {snapshot.fastestFee !== null ? snapshot.fastestFee : "—"}
            <span className="tide-hud-unit"> sat/vB</span>
          </p>
          <p className="tide-hud-hint">{snapshot.feeLabel ?? "fast"}</p>
          <p className="tide-hud-meta">
            hour {snapshot.hourFee !== null ? `${snapshot.hourFee} sat/vB` : "—"}
          </p>
        </article>

        <article className="tide-panel tide-diff">
          <p className="tide-hud-label">DIFFICULTY</p>
          <p className="tide-hud-value text-sats">
            {snapshot.difficulty !== null
              ? formatDifficulty(snapshot.difficulty)
              : "—"}
          </p>
          <p className="tide-hud-hint">
            epoch diff{" "}
            {snapshot.difficultyChangePct !== null
              ? formatChange(snapshot.difficultyChangePct)
              : "—"}
          </p>
          <p className="tide-hud-meta">
            next retarget{" "}
            {snapshot.remainingBlocksToRetarget !== null
              ? `≈ ${formatInteger(snapshot.remainingBlocksToRetarget)} blocks`
              : "—"}
          </p>
        </article>
      </div>

      <footer className="tide-strip">
        <span>
          <i className="tide-dot" /> network · health: nominal
        </span>
        <span>
          mempool{" "}
          {snapshot.mempoolCount !== null
            ? formatInteger(snapshot.mempoolCount)
            : "—"}{" "}
          tx
        </span>
        <span>
          block interval{" "}
          {snapshot.avgIntervalMs !== null
            ? formatInterval(snapshot.avgIntervalMs)
            : formatBlockAge(ageSec)}
        </span>
        <span>the chain is the clock</span>
      </footer>
    </div>
  );
}

function Side({ label, value }: { label: string; value: string }) {
  return (
    <div className="tide-anno">
      <p>{label}</p>
      <p>{value}</p>
    </div>
  );
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const w = 140;
  const h = 28;
  const pts = values
    .map((value, i) => {
      const x = (i / (values.length - 1)) * w;
      const y =
        max === min ? h / 2 : h - ((value - min) / (max - min)) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="tide-spark"
      aria-hidden="true"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="#ff2ec4"
        strokeWidth="1.6"
      />
    </svg>
  );
}
