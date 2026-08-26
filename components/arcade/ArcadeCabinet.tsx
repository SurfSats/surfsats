"use client";

import Image from "next/image";
import {
  ARCADE_ALIAS_MAX,
  ARCADE_CREDITS_PER_PAY,
  ARCADE_PRICE_SATS,
  formatCredits,
  sanitizeAlias,
} from "@/lib/arcade";
import type { RefObject } from "react";
import {
  ArcadeScreen,
  type ArcadeScreenMode,
} from "@/components/arcade/ArcadeScreen";
import type { WaveRunnerHandle } from "@/components/arcade/WaveRunner";

export function ArcadeCabinet({
  alias,
  credits,
  mode,
  pending,
  error,
  lastScore,
  scoreRank,
  scoreCopied,
  gameRef,
  onAlias,
  onInsert,
  onPlay,
  onHop,
  onWipeout,
  onCopyScore,
}: {
  alias: string;
  credits: number;
  mode: ArcadeScreenMode;
  pending: boolean;
  error: string | null;
  lastScore: number | null;
  scoreRank: number | null;
  scoreCopied: boolean;
  gameRef: RefObject<WaveRunnerHandle | null>;
  onAlias: (value: string) => void;
  onInsert: () => void;
  onPlay: () => void;
  onHop: () => void;
  onWipeout: (score: number) => void;
  onCopyScore: () => void;
}) {
  const aliasOk = sanitizeAlias(alias).ok;
  const canPlay = credits > 0 && mode !== "invoice" && mode !== "playing";
  const stickAction =
    mode === "playing" ? onHop : canPlay ? onPlay : onInsert;
  const paying = mode === "invoice";
  const insertLocked = !aliasOk || pending || paying || mode === "playing";

  return (
    <div className="cab-wrap">
      <div className="cab-machine">
        <p className="cab-plate">WAVE RUNNER</p>
        <Image
          src="/arcade-cabinet-wide.png"
          alt="SurfSats arcade cabinet"
          width={1712}
          height={1152}
          priority
          unoptimized
          className="cab-art"
          sizes="(max-width: 900px) 96vw, 58rem"
        />

        <div className="cab-crt-slot">
          <ArcadeScreen
            mode={mode}
            credits={credits}
            waiting={paying}
            invoiceError={null}
            expired={false}
            lastScore={lastScore}
            scoreRank={scoreRank}
            scoreCopied={scoreCopied}
            gameRef={gameRef}
            onPlay={onPlay}
            onInsert={onInsert}
            onWipeout={onWipeout}
            onCopyScore={onCopyScore}
            photoCrt
          />
        </div>

        <button
          type="button"
          className="cab-hit cab-hit-stick"
          onClick={stickAction}
          aria-label={
            mode === "playing" ? "Hop" : canPlay ? "Play" : "Insert coin"
          }
        />
        <button
          type="button"
          className="cab-hit cab-hit-start"
          onClick={stickAction}
          aria-label={
            mode === "playing" ? "Hop" : canPlay ? "Start" : "Insert coin"
          }
        />

        <div className="cab-coin" id="arcade-coin">
          <div className="cab-coin-top">
            {canPlay ? (
              <button type="button" className="cab-play" onClick={onPlay}>
                PLAY
                <span>1 CREDIT</span>
              </button>
            ) : (
              <button
                type="button"
                className="cab-insert cab-insert-primary"
                disabled={insertLocked}
                onClick={onInsert}
              >
                {pending ? "BUILDING INVOICE…" : `INSERT ${ARCADE_PRICE_SATS} SATS`}
                <span>
                  {pending
                    ? "LIGHTNING"
                    : `GET INVOICE · ${ARCADE_CREDITS_PER_PAY} CREDITS`}
                </span>
              </button>
            )}
            <div className="cab-led">
              <p>CREDITS</p>
              <p className="cab-led-num">{formatCredits(credits)}</p>
            </div>
          </div>

          {canPlay ? (
            <button
              type="button"
              className="cab-insert-more"
              disabled={!aliasOk || pending || paying}
              onClick={onInsert}
            >
              INSERT {ARCADE_PRICE_SATS} SATS · {ARCADE_CREDITS_PER_PAY} MORE CREDITS
            </button>
          ) : null}

          <label className="cab-alias">
            <span>CALLSIGN · REQUIRED</span>
            <input
              value={alias}
              maxLength={ARCADE_ALIAS_MAX}
              onChange={(event) => onAlias(event.target.value)}
              placeholder="YOUR ALIAS"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              disabled={paying}
            />
          </label>

          {!aliasOk && !canPlay ? (
            <p className="cab-hint">ENTER CALLSIGN (2–16) THEN INSERT COIN</p>
          ) : (
            <p className="cab-coin-note">
              {ARCADE_PRICE_SATS} SATS = {ARCADE_CREDITS_PER_PAY} CREDITS ·
              LIGHTNING · NO KYC
            </p>
          )}

          {error ? <p className="cab-error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
