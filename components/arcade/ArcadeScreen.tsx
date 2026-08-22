"use client";

import type { RefObject } from "react";
import {
  WaveRunner,
  type WaveRunnerHandle,
} from "@/components/arcade/WaveRunner";
import {
  ARCADE_CREDITS_PER_PAY,
  ARCADE_GAME_LABEL,
  ARCADE_PRICE_SATS,
  formatScore,
} from "@/lib/arcade";

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
  scoreRank,
  scoreCopied,
  gameRef,
  onPlay,
  onInsert,
  onWipeout,
  onCopyScore,
  photoCrt = false,
}: {
  mode: ArcadeScreenMode;
  credits: number;
  waiting: boolean;
  invoiceError: string | null;
  expired: boolean;
  lastScore: number | null;
  scoreRank: number | null;
  scoreCopied: boolean;
  gameRef: RefObject<WaveRunnerHandle | null>;
  onPlay: () => void;
  onInsert: () => void;
  onWipeout: (score: number) => void;
  onCopyScore: () => void;
  photoCrt?: boolean;
}) {
  const live = mode === "playing" || mode === "result";
  const high = scoreRank !== null && scoreRank <= 10;

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
        <div className="cab-crt-result">
          {high ? (
            <p className="cab-crt-hi">
              {scoreRank === 1 ? "NEW HIGH SCORE" : `TOP 10 · RANK ${scoreRank}`}
            </p>
          ) : (
            <p className="cab-crt-insert">WIPEOUT</p>
          )}
          <p className="cab-crt-score">{formatScore(lastScore ?? 0)}</p>
          <p className="cab-crt-sub">{ARCADE_GAME_LABEL}</p>
          <div className="cab-crt-result-actions">
            <button
              type="button"
              className="cab-crt-next"
              onClick={credits > 0 ? onPlay : onInsert}
            >
              {credits > 0 ? "PLAY AGAIN" : `INSERT ${ARCADE_PRICE_SATS} SATS`}
            </button>
            <button type="button" className="cab-crt-share" onClick={onCopyScore}>
              {scoreCopied ? "COPIED" : "COPY SCORE"}
            </button>
          </div>
        </div>
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
        <button
          type="button"
          className="cab-crt-attract cab-crt-hit"
          onClick={onInsert}
        >
          <p className="cab-crt-insert cab-crt-blink">INSERT {ARCADE_PRICE_SATS} SATS</p>
          <p className="cab-crt-sub">
            {ARCADE_CREDITS_PER_PAY} CREDITS · {ARCADE_GAME_LABEL}
          </p>
        </button>
      ) : null}
    </div>
  );
}
