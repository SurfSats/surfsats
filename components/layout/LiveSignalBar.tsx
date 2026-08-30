"use client";

import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { useTimechainSnapshot } from "@/components/timechain/useTimechainSnapshot";
import { cn } from "@/lib/cn";
import { swellFromPct } from "@/lib/swell";
import {
  type TimechainSnapshot,
  formatChange,
  formatInteger,
  formatUsd,
  hasLiveData,
} from "@/lib/timechain";

const TAPE_SCROLL =
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function LiveSignalBar({
  initial,
}: {
  initial: TimechainSnapshot | null;
}) {
  const { snapshot, status } = useTimechainSnapshot(initial);
  const direction = snapshot.priceDirection;
  const live = hasLiveData(snapshot);

  return (
    <div className="relative z-[1] border-b border-cyan/20 bg-black/80 backdrop-blur-md">
      <Container className="flex items-center gap-x-2 py-1.5 sm:gap-x-2 lg:gap-x-3">
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-nowrap items-center gap-x-3 overflow-x-auto overscroll-x-contain",
            TAPE_SCROLL,
            "sm:gap-x-2 sm:overflow-x-hidden lg:gap-x-2.5",
          )}
        >
          <p className="order-1 shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
            {"//"} live_signal
            <span className="ml-1.5 text-muted">
              {status === "live" ? "ok" : status}
            </span>
          </p>

          <div className="order-5 flex shrink-0 items-center gap-x-1.5 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-cyan/80 sm:order-2 sm:hidden sm:gap-x-2 md:flex">
            <span aria-hidden="true" className="hidden text-cyan/40 sm:inline">
              ·
            </span>
            <span className="max-sm:inline sm:hidden lg:inline">no kyc</span>
            <span
              aria-hidden="true"
              className="max-sm:inline text-cyan/40 sm:hidden lg:inline"
            >
              ·
            </span>
            <span className="max-sm:inline sm:hidden xl:inline">
              mempool=hot
            </span>
            <span
              aria-hidden="true"
              className="max-sm:inline text-cyan/40 sm:hidden xl:inline"
            >
              ·
            </span>
            <SwellTicker pct={snapshot.priceChangePct} />
          </div>

          {live ? (
            <dl className="contents">
              <Item
                className="order-2 sm:order-3"
                label="btc"
                value={
                  snapshot.priceUsd !== null ? formatUsd(snapshot.priceUsd) : "—"
                }
              />
              <Item
                className="order-3 sm:order-4"
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
                className="order-6 flex sm:order-5 sm:hidden lg:flex"
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
                className="order-4 sm:order-6"
                label="height"
                value={
                  snapshot.blockHeight !== null
                    ? formatInteger(snapshot.blockHeight)
                    : "—"
                }
              />
              <Item
                className="order-7 hidden lg:flex lg:order-7"
                label="hash"
                value={
                  snapshot.hashrateEh !== null
                    ? `${snapshot.hashrateEh.toFixed(0)} EH`
                    : "—"
                }
              />
            </dl>
          ) : (
            <p className="order-2 shrink-0 whitespace-nowrap font-mono text-[10px] uppercase text-muted sm:order-3">
              timechain silent
            </p>
          )}
        </div>

        <Link
          href="/tidechain"
          className="hidden shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] text-sats glitch-hover hover:text-cyan sm:inline"
        >
          readout -&gt;
        </Link>
      </Container>
    </div>
  );
}

function SwellTicker({ pct }: { pct: number | null }) {
  if (pct === null) return <span>swell=unknown</span>;
  const swell = swellFromPct(pct);
  return (
    <span className={swell.direction === "up" ? "text-cyan" : "text-magenta"}>
      swell={swell.direction}
    </span>
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
    <div
      className={cn(
        "flex shrink-0 items-baseline gap-1.5 whitespace-nowrap",
        className,
      )}
    >
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
