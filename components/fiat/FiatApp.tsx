"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTimechainSnapshot } from "@/components/timechain/useTimechainSnapshot";
import { Container } from "@/components/ui/Container";
import { TerminalLabel } from "@/components/ui/TerminalLabel";
import {
  BTC_HARD_CAP,
  type FiatDebtSnapshot,
  formatCapUsd,
  formatDebtUsd,
  formatHardCap,
  formatPrinterSpeed,
} from "@/lib/fiat";
import { formatDate } from "@/lib/format";
import { formatInteger, type TimechainSnapshot } from "@/lib/timechain";
import { MoneyRain } from "@/components/fiat/MoneyRain";

export function FiatApp({
  initialDebt,
  initialChain,
}: {
  initialDebt: FiatDebtSnapshot | null;
  initialChain: TimechainSnapshot | null;
}) {
  const { snapshot } = useTimechainSnapshot(initialChain);
  const [debt, setDebt] = useState<FiatDebtSnapshot | null>(initialDebt);
  const [display, setDisplay] = useState(initialDebt?.totPubDebtOutAmt ?? 0);
  const [watched, setWatched] = useState(0);
  const startedAt = useRef<number | null>(null);
  const debtRef = useRef(initialDebt);
  const chunkRef = useRef(0);
  const brrrTimer = useRef<number>(0);
  const [brrr, setBrrr] = useState(false);

  useEffect(() => {
    debtRef.current = debt;
  }, [debt]);

  useEffect(() => {
    if (initialDebt) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/fiat/debt", { cache: "no-store" });
        const payload = (await response.json()) as FiatDebtSnapshot & {
          error?: string;
        };
        if (cancelled || !response.ok || !payload.totPubDebtOutAmt) return;
        setDebt(payload);
        setDisplay(payload.totPubDebtOutAmt);
      } catch {
        // keep empty state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialDebt]);

  useEffect(() => {
    if (!debt) return;
    let frame = 0;
    let lastPaint = 0;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const apply = (now: number) => {
      const current = debtRef.current;
      if (!current) return;
      if (startedAt.current === null) startedAt.current = now;
      const elapsed = Math.max(0, (now - startedAt.current) / 1000);
      const rate = Math.max(0, current.dollarsPerSecond);
      const nextDisplay = current.totPubDebtOutAmt + rate * elapsed;
      const nextWatched = rate * elapsed;
      setDisplay(nextDisplay);
      setWatched(nextWatched);
      const chunk = Math.floor(nextWatched / 1_000_000);
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduceMotion && chunk > chunkRef.current) {
        chunkRef.current = chunk;
        setBrrr(true);
        window.clearTimeout(brrrTimer.current);
        brrrTimer.current = window.setTimeout(() => setBrrr(false), 200);
      } else if (chunk > chunkRef.current) {
        chunkRef.current = chunk;
      }
    };

    const tick = (now: number) => {
      if (now - lastPaint >= 80) {
        lastPaint = now;
        apply(now);
      }
      frame = window.requestAnimationFrame(tick);
    };

    if (reduce) {
      apply(performance.now());
      const id = window.setInterval(() => apply(performance.now()), 1000);
      return () => window.clearInterval(id);
    }

    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(brrrTimer.current);
    };
  }, [debt]);

  const moscow = snapshot.satsPerDollar;
  const perCoin = display / BTC_HARD_CAP;
  const speed = debt ? Math.max(0, debt.dollarsPerSecond) : 0;

  return (
    <div className="fiat-page">
      <div className="fiat-bleed" aria-hidden="true">
        <Image
          src="/dirty-fiat-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="fiat-bleed-img"
        />
        <div className="fiat-veil" />
        <MoneyRain dollarsPerSecond={speed} />
      </div>

      <Container className="fiat-copy py-12 sm:py-16 lg:py-20">
        <TerminalLabel>printer_overflow · no hard cap</TerminalLabel>
        <h1
          data-text="DIRTY FIAT"
          className="glitch-title flicker mt-4 font-display text-5xl font-extrabold uppercase leading-[0.86] tracking-tight sm:text-7xl lg:text-8xl"
        >
          DIRTY FIAT
        </h1>
        <p className="fiat-tag mt-5 max-w-xl font-display text-xl font-semibold uppercase tracking-wide text-sats sm:text-2xl">
          The printer does not sleep. Bitcoin does not print.
        </p>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-foreground/85 sm:text-base">
          Infinite paper. Finite beach. This is a money with the lid ripped
          off, flushed into the ocean, still gurgling.
        </p>

        <section
          className={brrr ? "fiat-hero is-brrr mt-10 sm:mt-14" : "fiat-hero mt-10 sm:mt-14"}
        >
          <div className="fiat-hero-scrim" aria-hidden="true" />
          <div className="fiat-hero-kicker">
            <p>CUCKBUCKS OUTSTANDING</p>
            <span className="fiat-projected">PROJECTED</span>
          </div>
          {debt ? (
            <>
              <p className="sr-only">
                Projected U.S. public debt outstanding, starting from the
                Treasury Debt to the Penny total confirmed {formatDate(debt.recordDate)}.
              </p>
              <p className="fiat-cuck" aria-hidden="true">
                {formatDebtUsd(display)}
              </p>
              <p className="fiat-speed">
                PRINTER SPEED {formatPrinterSpeed(speed)} / sec
                <span className="fiat-speed-dot" aria-hidden="true">
                  ·
                </span>
                YOU WATCHED THEM PRINT {formatDebtUsd(watched)}
              </p>
            </>
          ) : (
            <p className="fiat-cuck fiat-cuck-empty">TREASURY SILENT</p>
          )}
        </section>

        <div className="fiat-tiles">
          <article className="fiat-tile">
            <p className="fiat-tile-label">HARD CAP</p>
            <p className="fiat-tile-value text-cyan">{formatHardCap(BTC_HARD_CAP)}</p>
            <p className="fiat-tile-vs">vs THIS NUMBER HAS NO CAP</p>
            <p className="fiat-tile-note">
              Bitcoin counted to twenty-one million and stopped. Fiat never
              learned the move.
            </p>
          </article>

          <article className="fiat-tile">
            <p className="fiat-tile-label">DEBT / 21M</p>
            <p className="fiat-tile-value text-sats">
              {debt ? formatCapUsd(perCoin) : "—"}
            </p>
            <p className="fiat-tile-vs">$ PER BITCOIN IF THIS PILE WERE THE CAP</p>
            <p className="fiat-tile-note">
              It is not a cap. It is a toilet. They keep flushing.
            </p>
          </article>

          {moscow !== null ? (
            <article className="fiat-tile">
              <p className="fiat-tile-label">MOSCOW TIME</p>
              <p className="fiat-tile-value text-magenta">
                {formatInteger(moscow)}
              </p>
              <p className="fiat-tile-vs">SATS / $</p>
              <p className="fiat-tile-note">
                The only clock they did not get to print.
              </p>
            </article>
          ) : null}
        </div>

        <p className="fiat-cite">
          Source: U.S. Treasury Debt to the Penny
          {debt ? (
            <>
              {" · "}confirmed {formatDate(debt.recordDate)}
              {" · "}
              <span className="fiat-cite-flag">live figure PROJECTED</span>
            </>
          ) : (
            <> · live figure unavailable</>
          )}
        </p>
        <p className="fiat-insult">
          No extra macro fanfic. Just the receipt, spinning.
        </p>
      </Container>
    </div>
  );
}
