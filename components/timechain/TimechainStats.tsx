"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";
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

type TimechainStatsProps = {
  initial?: TimechainSnapshot | null;
  variant?: "home" | "page" | "compact";
};

export function TimechainStats({
  initial = null,
  variant = "page",
}: TimechainStatsProps) {
  const { snapshot, status } = useTimechainSnapshot(initial);

  const change = snapshot.priceChangePct;
  const direction = snapshot.priceDirection;

  return (
    <section
      className={variant === "home" ? "pb-6" : undefined}
      data-price-direction={direction ?? "unknown"}
      data-price-change={change ?? ""}
    >
      {variant !== "compact" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
              {"//"} timechain · mempool.space
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
              {variant === "page" ? "Readout" : "Timechain"}
            </h2>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            {status === "loading" && COPY.loadingMempool}
            {status === "live" && "live · 30s"}
            {status === "error" && "signal lost"}
          </p>
        </div>
      ) : null}

      {status === "error" && !hasLiveData(snapshot) ? (
        <div className="panel mt-5 px-4 py-6 font-mono text-sm text-muted">
          timechain unreachable · mempool.space silent. try again in a minute.
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-12">
          <div className="panel p-5 md:col-span-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              btc / usd
            </p>
            <p className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {snapshot.priceUsd !== null ? formatUsd(snapshot.priceUsd) : "—"}
            </p>
            <p className="mt-3 font-mono text-sm text-cyan">
              {snapshot.satsPerDollar !== null
                ? `${formatInteger(snapshot.satsPerDollar)} sats / $`
                : "sats / $ —"}
            </p>
          </div>

          <div
            className={cn(
              "panel p-5 md:col-span-7",
              direction === "up" && "border-cyan/55",
              direction === "down" && "border-magenta/55",
              direction === "flat" && "border-sats/40",
            )}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              24h swell
            </p>
            <p
              className={cn(
                "mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl",
                direction === "up" && "text-cyan",
                direction === "down" && "text-magenta",
                direction === "flat" && "text-sats",
              )}
            >
              {change !== null ? formatChange(change) : "—"}
            </p>
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">
              {direction === "up" && "rising tide"}
              {direction === "down" && "drawback"}
              {direction === "flat" && "sideways chop"}
              {direction === null && "awaiting print"}
              {snapshot.priceUsdYesterday !== null
                ? ` · yesterday ${formatUsd(snapshot.priceUsdYesterday)}`
                : ""}
            </p>
          </div>

          <Stat label="height" value={formatMaybe(snapshot.blockHeight, formatInteger)} />
          <Stat
            label="last_block"
            value={<BlockAge timestamp={snapshot.lastBlockTimestamp} />}
          />
          {variant !== "compact" ? (
            <Stat
              label="hashrate"
              value={formatMaybe(snapshot.hashrateEh, formatHashrate)}
            />
          ) : null}
          {variant !== "compact" ? (
            <>
              <Stat
                label="difficulty"
                value={
                  snapshot.difficulty !== null
                    ? `${formatDifficulty(snapshot.difficulty)}${
                        snapshot.difficultyChangePct !== null
                          ? ` · ${formatChange(snapshot.difficultyChangePct)}`
                          : ""
                      }`
                    : "—"
                }
              />
              <Stat
                label="to_retarget"
                value={
                  snapshot.remainingBlocksToRetarget !== null
                    ? `${formatInteger(snapshot.remainingBlocksToRetarget)} blocks`
                    : "—"
                }
              />
              <Stat
                label="to_halving"
                value={
                  snapshot.blocksToHalving !== null
                    ? `${formatInteger(snapshot.blocksToHalving)} blocks`
                    : "—"
                }
              />
              <Stat
                label="fees"
                value={
                  snapshot.fastestFee !== null
                    ? `${snapshot.fastestFee} sat/vB`
                    : "—"
                }
                hint={snapshot.feeLabel ?? undefined}
                wide
              />
            </>
          ) : (
            <Stat
              label="hashrate"
              value={formatMaybe(snapshot.hashrateEh, formatHashrate)}
              wide
            />
          )}
        </div>
      )}

      {variant === "home" ? (
        <Link
          href="/tidechain"
          className="mt-4 inline-flex font-mono text-xs uppercase tracking-[0.16em] text-sats glitch-hover hover:text-cyan"
        >
          full_readout -&gt;
        </Link>
      ) : variant === "page" ? (
        <p className="mt-4 font-mono text-[11px] text-muted">
          source: mempool.space · 24h swell drives the wave pool
        </p>
      ) : null}
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  wide = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  wide?: boolean;
}) {
  return (
    <div className={cn("panel p-4", wide ? "md:col-span-6" : "md:col-span-3")}>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-display text-xl font-bold uppercase tracking-tight">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-cyan">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function BlockAge({ timestamp }: { timestamp: number | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!timestamp) return "—";
  return formatBlockAge(now / 1000 - timestamp);
}

function formatMaybe(value: number | null, format: (value: number) => string) {
  return value !== null ? format(value) : "—";
}
