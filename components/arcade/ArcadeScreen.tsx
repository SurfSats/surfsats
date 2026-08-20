"use client";

import type { RefObject } from "react";
import {
  WaveRunner,
  type WaveRunnerHandle,
} from "@/components/arcade/WaveRunner";
import { ARCADE_GAME_LABEL, ARCADE_PRICE_SATS, formatScore } from "@/lib/arcade";

export type ArcadeScreenMode =
  | "attract"
  | "invoice"
  | "ready"
  | "playing"
  | "result";

export function ArcadeScreen({
  mode,
  credits,
  waiting,
  invoiceError,
  expired,
  lastScore,
  gameRef,
  onPlay,
  onWipeout,
  photoCrt = false,
}: {
  mode: ArcadeScreenMode;
  credits: number;
  waiting: boolean;
  invoiceError: string | null;
  expired: boolean;
  lastScore: number | null;
  gameRef: RefObject<WaveRunnerHandle | null>;
  onPlay: () => void;
  onWipeout: (score: number) => void;
  photoCrt?: boolean;
}) {
  const live = mode === "playing" || mode === "result";

  return (
    <div
      className={[
        "cab-crt",
        live ? "cab-crt-live" : "",
        photoCrt ? "cab-crt-photo" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="cab-crt-glass" aria-hidden="true" />
      <div className="cab-crt-scan" aria-hidden="true" />

      {mode === "playing" ? (
        <WaveRunner ref={gameRef} onWipeout={onWipeout} />
      ) : null}

      {mode === "result" ? (
        <button type="button" className="cab-crt-result" onClick={onPlay}>
          <p className="cab-crt-insert">WIPEOUT</p>
          <p className="cab-crt-score">{formatScore(lastScore ?? 0)}</p>
          <p className="cab-crt-sub">{ARCADE_GAME_LABEL}</p>
          <p className="cab-crt-insert cab-crt-blink">
            {credits > 0 ? "PRESS START" : "INSERT COIN"}
          </p>
        </button>
      ) : null}

      {mode === "invoice" ? (
        <div className="cab-crt-attract">
          <p className="cab-crt-insert cab-crt-blink">
            {expired ? "INVOICE EXPIRED" : `PAY ${ARCADE_PRICE_SATS} SATS`}
          </p>
          <p className="cab-crt-sub">
            {invoiceError
              ? invoiceError
              : waiting
                ? "LOOK AT THE COIN DOOR"
                : "SCAN THE COIN DOOR"}
          </p>
        </div>
      ) : null}

      {mode === "ready" ? (
        <button type="button" className="cab-crt-attract cab-crt-hit" onClick={onPlay}>
          <p className="cab-crt-insert cab-crt-blink">PRESS START</p>
          <p className="cab-crt-sub">
            {ARCADE_GAME_LABEL} · {credits} CREDIT{credits === 1 ? "" : "S"}
          </p>
        </button>
      ) : null}

      {mode === "attract" ? (
        <button type="button" className="cab-crt-attract cab-crt-hit" onClick={onPlay}>
          <p className="cab-crt-insert cab-crt-blink">INSERT COIN</p>
          <p className="cab-crt-sub">
            {ARCADE_PRICE_SATS} SATS · 3 CREDITS · {ARCADE_GAME_LABEL}
          </p>
        </button>
      ) : null}
    </div>
  );
}
