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

export function HomeSignalStrip({
  initial,
}: {
  initial: TimechainSnapshot;
}) {
  const { snapshot, status } = useTimechainSnapshot(initial);
  const direction = snapshot.priceDirection;
  const live = hasLiveData(snapshot);

  return (
    <section className="border-y border-cyan/20 bg-black/50">
      <Container className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan">
          {"//"} live_signal
          <span className="ml-2 text-muted">
            {status === "live" ? "ok" : status}
          </span>
        </p>

        {live ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-8">
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
                  ? `${snapshot.hashrateEh.toFixed(0)} EH/s`
                  : "—"
              }
            />
          </dl>
        ) : (
          <p className="font-mono text-xs text-muted">timechain silent</p>
        )}

        <Link
          href="/timechain"
          className="shrink-0 font-mono text-[11px] uppercase tracking-[0.16em] text-sats glitch-hover hover:text-cyan"
        >
          full_readout -&gt;
        </Link>
      </Container>
    </section>
  );
}

function Item({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "cyan" | "magenta" | "sats";
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        {label}
      </dt>
      <dd
        className={cn(
          "font-display text-lg font-bold uppercase tracking-tight",
          tone === "cyan" && "text-cyan",
          tone === "magenta" && "text-magenta",
          tone === "sats" && "text-sats",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
