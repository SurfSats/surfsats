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
}) {
  const live = mode === "playing" || mode === "result";

  return (
    <div className={live ? "cab-crt cab-crt-live" : "cab-crt"}>
      <div className="cab-crt-glass" aria-hidden="true" />
      <div className="cab-crt-scan" aria-hidden="true" />
      {mode === "playing" || mode === "result" ? null : (
        <p className="cab-crt-1up">1UP</p>
      )}

      {mode === "playing" ? (
        <WaveRunner ref={gameRef} onWipeout={onWipeout} />
      ) : null}

      {mode === "result" ? (
        <button type="button" className="cab-crt-result" onClick={onPlay}>
          <p className="cab-crt-insert">WIPEOUT</p>
          <p className="cab-crt-score">
            {formatScore(lastScore ?? 0)}
          </p>
          <p className="cab-crt-sub">{ARCADE_GAME_LABEL}</p>
          <p className="cab-crt-insert cab-crt-blink">
            {credits > 0 ? "PRESS START" : "INSERT COIN"}
          </p>
        </button>
      ) : null}

      {mode === "invoice" ? (
        <div className="cab-crt-attract">
          <PixelWave />
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
          <PixelWave />
          <p className="cab-crt-insert cab-crt-blink">PRESS START</p>
          <p className="cab-crt-sub">
            {ARCADE_GAME_LABEL} · {credits} CREDIT{credits === 1 ? "" : "S"}
          </p>
        </button>
      ) : null}

      {mode === "attract" ? (
        <button type="button" className="cab-crt-attract cab-crt-hit" onClick={onPlay}>
          <PixelWave />
          <p className="cab-crt-insert cab-crt-blink">INSERT COIN</p>
          <p className="cab-crt-sub">
            {ARCADE_PRICE_SATS} SATS · 3 CREDITS · {ARCADE_GAME_LABEL}
          </p>
        </button>
      ) : null}
    </div>
  );
}

function PixelWave({ riding = false }: { riding?: boolean }) {
  return (
    <svg
      className={riding ? "cab-wave cab-wave-ride" : "cab-wave"}
      viewBox="0 0 220 110"
      aria-hidden="true"
    >
      <circle cx="168" cy="22" r="10" fill="#d7f4ff" opacity="0.85" />
      <path
        d="M8 86c22-28 44-28 66 0s44 28 66 0 44-28 66 0"
        fill="none"
        stroke="#3df0ff"
        strokeWidth="6"
        strokeLinecap="square"
      />
      <path
        d="M8 96c22-22 44-22 66 0s44 22 66 0 44-22 66 0"
        fill="none"
        stroke="#146a88"
        strokeWidth="8"
      />
      <path
        d="M92 58c8-2 18 6 28 8 6 1 10 8 4 12-8 6-24 6-34-2-6-6-6-16 2-18Z"
        fill="#cfd8dc"
      />
      <path d="M108 50 118 62 104 62Z" fill="#f4c430" />
      <rect x="112" y="40" width="8" height="14" fill="#f0e6d4" />
      <circle cx="116" cy="36" r="5" fill="#f0e6d4" />
    </svg>
  );
}
