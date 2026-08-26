"use client";

import { RetroGame } from "@/components/arcade/RetroGame";
import type { RetroPad } from "@/components/arcade/retroGames";
import type { ArcadeScreenMode } from "@/components/arcade/ArcadeScreen";
import {
  ARCADE_CREDITS_PER_PAY,
  ARCADE_PRICE_SATS,
  formatScore,
  retroGameLabel,
  type RetroGameId,
} from "@/lib/arcade";
import type { MutableRefObject } from "react";

export function RetroScreen({
  mode,
  credits,
  game,
  lastScore,
  scoreRank,
  scoreCopied,
  padRef,
  onPlay,
  onInsert,
  onGameOver,
  onCopyScore,
}: {
  mode: ArcadeScreenMode;
  credits: number;
  game: RetroGameId | null;
  lastScore: number | null;
  scoreRank: number | null;
  scoreCopied: boolean;
  padRef: MutableRefObject<RetroPad>;
  onPlay: () => void;
  onInsert: () => void;
  onGameOver: (score: number) => void;
  onCopyScore: () => void;
}) {
  const live = mode === "playing" || mode === "result";
  const high = scoreRank !== null && scoreRank <= 10;
  const label = game ? retroGameLabel(game) : "RETRO";

  return (
    <div
      className={["cab-crt", live ? "cab-crt-live" : "", "cab-crt-photo"]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="cab-crt-glass" aria-hidden="true" />
      <div className="cab-crt-scan" aria-hidden="true" />

      {mode === "playing" && game ? (
        <RetroGame game={game} padRef={padRef} onGameOver={onGameOver} />
      ) : null}

      {mode === "result" ? (
        <div className="cab-crt-result">
          {high ? (
            <p className="cab-crt-hi">
              {scoreRank === 1 ? "NEW HIGH SCORE" : `TOP 10 · RANK ${scoreRank}`}
            </p>
          ) : (
            <p className="cab-crt-insert">GAME OVER</p>
          )}
          <p className="cab-crt-score">{formatScore(lastScore ?? 0)}</p>
          <p className="cab-crt-sub">RETRO · {label.toUpperCase()}</p>
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
          <p className="cab-crt-insert cab-crt-blink">PAY {ARCADE_PRICE_SATS} SATS</p>
          <p className="cab-crt-sub">RETRO · {label.toUpperCase()}</p>
        </div>
      ) : null}

      {mode === "ready" ? (
        <button type="button" className="cab-crt-attract cab-crt-hit" onClick={onPlay}>
          <p className="cab-crt-insert cab-crt-blink">PRESS START</p>
          <p className="cab-crt-sub">
            {label.toUpperCase()} · {credits} CREDIT{credits === 1 ? "" : "S"}
          </p>
        </button>
      ) : null}

      {mode === "attract" ? (
        <button
          type="button"
          className="cab-crt-attract cab-crt-hit"
          onClick={game ? onInsert : undefined}
        >
          <p className="cab-crt-insert cab-crt-blink">
            {game ? `INSERT ${ARCADE_PRICE_SATS} SATS` : "PICK A GAME"}
          </p>
          <p className="cab-crt-sub">
            {game
              ? `${ARCADE_CREDITS_PER_PAY} CREDITS · ${label.toUpperCase()}`
              : "PONG · TETRIS · SNAKE · BREAKOUT · INVADERS"}
          </p>
        </button>
      ) : null}
    </div>
  );
}
