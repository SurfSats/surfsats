"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import { useTimechainSnapshot } from "@/components/timechain/useTimechainSnapshot";
import { cn } from "@/lib/cn";
import { swellFromPct } from "@/lib/swell";
import { hiddenTickerIds } from "@/lib/ticker-fit";
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
  const tapeRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState(false);

  useLayoutEffect(() => {
    const tape = tapeRef.current;
    if (!tape) return;

    function fit() {
      const node = tapeRef.current;
      if (!node) return;
      const tokens = visualTickerTokens(node);
      for (const el of tokens) el.removeAttribute("data-off");
      const gap = Number.parseFloat(getComputedStyle(node).columnGap) || 0;
      const items = tokens.map((el) => ({
        id: el.dataset.ticker ?? "",
        width: el.offsetWidth,
      }));
      const FADE = 18;
      const firstPass = hiddenTickerIds({
        available: node.clientWidth,
        gap,
        items,
      });
      const hidden = new Set(
        firstPass.length === 0
          ? firstPass
          : hiddenTickerIds({
              available: Math.max(0, node.clientWidth - FADE),
              gap,
              items,
            }),
      );
      for (const el of tokens) {
        const id = el.dataset.ticker;
        if (id && hidden.has(id)) el.setAttribute("data-off", "");
        else el.removeAttribute("data-off");
      }
      setFade(hidden.size > 0);
    }

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(tape);
    return () => observer.disconnect();
  }, [snapshot, status, live]);

  return (
    <div className="relative z-[1] border-b border-cyan/20 bg-black/80 backdrop-blur-md">
      <Container className="flex items-center gap-x-2 py-1.5 sm:gap-x-2 lg:gap-x-3">
        <div
          ref={tapeRef}
          data-fade={fade ? "" : undefined}
          className="live-tape"
        >
          <p
            data-ticker="live_signal"
            className="order-1 shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-cyan"
          >
            {"//"} live_signal
            <span className="live-status ml-1.5 text-muted">
              {status === "live" ? "ok" : status}
            </span>
          </p>

          <span
            data-ticker="no_kyc"
            className="order-5 hidden shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-cyan/80 sm:order-2 md:inline"
          >
            <span aria-hidden="true" className="mr-1.5 hidden text-cyan/40 sm:inline">
              ·
            </span>
            no kyc
          </span>
          <span
            data-ticker="mempool"
            className="order-5 hidden shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-cyan/80 sm:order-2 xl:inline"
          >
            <span aria-hidden="true" className="mr-1.5 text-cyan/40">
              ·
            </span>
            mempool=hot
          </span>
          <span
            data-ticker="swell"
            className="order-5 hidden shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-cyan/80 sm:order-2 md:inline"
          >
            <span aria-hidden="true" className="mr-1.5 text-cyan/40">
              ·
            </span>
            <SwellTicker pct={snapshot.priceChangePct} />
          </span>

          {live ? (
            <dl className="contents">
              <Item
                ticker="btc"
                className="order-2 sm:order-3"
                label="btc"
                value={
                  snapshot.priceUsd !== null ? formatUsd(snapshot.priceUsd) : "—"
                }
              />
              <Item
                ticker="24h"
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
                ticker="moscow_time"
                className="order-6 hidden sm:order-5 lg:flex"
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
                ticker="height"
                className="order-4 sm:order-6"
                label="height"
                value={
                  snapshot.blockHeight !== null
                    ? formatInteger(snapshot.blockHeight)
                    : "—"
                }
              />
              <Item
                ticker="hash"
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

function visualTickerTokens(tape: HTMLElement) {
  return [...tape.querySelectorAll<HTMLElement>("[data-ticker]")].sort(
    (a, b) => {
      const orderA = Number.parseFloat(getComputedStyle(a).order) || 0;
      const orderB = Number.parseFloat(getComputedStyle(b).order) || 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1;
    },
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
  ticker,
  label,
  value,
  hint,
  tone,
  className,
}: {
  ticker: string;
  label: string;
  value: string;
  hint?: string;
  tone?: "cyan" | "magenta" | "sats";
  className?: string;
}) {
  return (
    <div
      data-ticker={ticker}
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
          "ticker-val font-display text-sm font-bold uppercase tracking-tight sm:text-base",
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
