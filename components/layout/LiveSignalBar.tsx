"use client";

import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { useTimechainSnapshot } from "@/components/timechain/useTimechainSnapshot";
import { cn } from "@/lib/cn";
import {
  type TimechainSnapshot,
  formatChange,
  formatInteger,
  formatUsd,
  hasLiveData,
} from "@/lib/timechain";

export function LiveSignalBar({
  initial,
}: {
  initial: TimechainSnapshot | null;
}) {
  const { snapshot, status } = useTimechainSnapshot(initial);
  const direction = snapshot.priceDirection;
  const live = hasLiveData(snapshot);

  return (
    <div className="border-b border-cyan/20 bg-black/80 backdrop-blur-md">
      <Container className="flex items-center gap-3 overflow-x-auto py-1.5 sm:gap-4">
        <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
          {"//"} live_signal
          <span className="ml-1.5 text-muted">
            {status === "live" ? "ok" : status}
          </span>
        </p>

        {live ? (
          <dl className="flex min-w-0 flex-1 items-center gap-x-4 sm:gap-x-6">
            <Item
              label="btc"
              value={snapshot.priceUsd !== null ? formatUsd(snapshot.priceUsd) : "—"}
            />
            <Item
              label="24h"
              value={
                snapshot.priceChangePct !== null
                  ? formatChange(snapshot.priceChangePct)
                  : "—"
              }
              tone={
                direction === "up"
                  ? "cyan"
                  : direction === "down"
                    ? "magenta"
                    : "sats"
              }
            />
            <Item
              label="moscow_time"
              value={
                snapshot.satsPerDollar !== null
                  ? `${formatInteger(snapshot.satsPerDollar)}`
                  : "—"
              }
              hint="sats/$"
              tone="sats"
            />
            <Item
              label="height"
              value={
                snapshot.blockHeight !== null
                  ? formatInteger(snapshot.blockHeight)
                  : "—"
              }
            />
            <Item
              label="hash"
              value={
                snapshot.hashrateEh !== null
                  ? `${snapshot.hashrateEh.toFixed(0)} EH`
                  : "—"
              }
              className="hidden sm:flex"
            />
          </dl>
        ) : (
          <p className="font-mono text-[10px] uppercase text-muted">
            timechain silent
          </p>
        )}

        <Link
          href="/timechain"
          className="ml-auto hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-sats glitch-hover hover:text-cyan sm:inline"
        >
          readout -&gt;
        </Link>
      </Container>
    </div>
  );
}

function Item({
  label,
  value,
  hint,
  tone,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "cyan" | "magenta" | "sats";
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-baseline gap-1.5", className)}>
      <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      <dd
        className={cn(
          "font-display text-sm font-bold uppercase tracking-tight sm:text-base",
          tone === "cyan" && "text-cyan",
          tone === "magenta" && "text-magenta",
          tone === "sats" && "text-sats",
        )}
      >
        {value}
        {hint ? (
          <span className="ml-1 font-mono text-[9px] font-medium tracking-[0.12em] text-muted">
            {hint}
          </span>
        ) : null}
      </dd>
    </div>
  );
}
