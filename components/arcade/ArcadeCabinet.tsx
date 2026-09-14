"use client";

import Image from "next/image";
import {
  ARCADE_CREDITS_PER_PAY,
  ARCADE_PRICE_SATS,
  sanitizeAlias,
} from "@/lib/arcade";
import { CallsignField } from "@/components/glass/CallsignField";
import { CreditLed } from "@/components/arcade/CreditLed";
import { verbPressProps } from "@/lib/verb-press";
import type { RefObject } from "react";
import {
  ArcadeScreen,
  type ArcadeScreenMode,
} from "@/components/arcade/ArcadeScreen";
import type { WaveRun, WaveRunnerHandle } from "@/components/arcade/WaveRunner";

export function ArcadeCabinet({
  alias,
  credits,
  mode,
  pending,
  error,
  lastScore,
  lastMeters,
  lastBarrelS,
  lastReason,
  scoreRank,
  scoreCopied,
  gameRef,
  onAlias,
  onInsert,
  onPlay,
  onHop,
  onWipeout,
  onNextLife,
  onCopyScore,
}: {
  alias: string;
  credits: number;
  mode: ArcadeScreenMode;
  pending: boolean;
  error: string | null;
  lastScore: number | null;
  lastMeters?: number | null;
  lastBarrelS?: number | null;
  lastReason?: WaveRun["reason"];
  scoreRank: number | null;
  scoreCopied: boolean;
  gameRef: RefObject<WaveRunnerHandle | null>;
  onAlias: (value: string) => void;
  onInsert: () => void;
  onPlay: () => void;
  onHop: () => void;
  onWipeout: (run: WaveRun) => void;
  onNextLife?: () => Promise<boolean>;
  onCopyScore: () => void;
}) {
  const aliasOk = sanitizeAlias(alias).ok;
  const canPlay = credits > 0 && mode !== "invoice" && mode !== "playing";
  const stickAction =
    mode === "playing" ? onHop : canPlay ? onPlay : onInsert;
  const paying = mode === "invoice";

  return (
    <div className="cab-wrap">
      <div className="cab-machine">
        <div className="cab-body">
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
              lastMeters={lastMeters}
              lastBarrelS={lastBarrelS}
              lastReason={lastReason}
              scoreRank={scoreRank}
              scoreCopied={scoreCopied}
              gameRef={gameRef}
              alias={alias}
              onAlias={onAlias}
              aliasLocked={paying || pending}
              onPlay={onPlay}
              onInsert={onInsert}
              onWipeout={onWipeout}
              onNextLife={onNextLife}
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
        </div>

        <div className="cab-coin cab-coin-plate" id="arcade-coin">
          <div className="cab-coin-top">
            {canPlay ? (
              <button type="button" className="cab-play" onClick={onPlay}>
                PLAY
                <span>1 CREDIT</span>
              </button>
            ) : mode !== "playing" ? (
              <button
                type="button"
                className="cab-insert cab-insert-primary cab-till-insert"
                {...verbPressProps}
                disabled={!aliasOk || pending || paying}
                onClick={onInsert}
              >
                {pending
                  ? "BUILDING INVOICE…"
                  : `INSERT ${ARCADE_PRICE_SATS} SATS`}
                <span>
                  {pending
                    ? "LIGHTNING"
                    : `GET INVOICE · ${ARCADE_CREDITS_PER_PAY} CREDITS`}
                </span>
              </button>
            ) : null}
            <div className="cab-led">
              <p>CREDITS</p>
              <CreditLed credits={credits} />
            </div>
          </div>

          {mode !== "playing" && !canPlay ? (
            <CallsignField
              className="cab-alias cab-till-alias"
              label="CALLSIGN · REQUIRED"
              placeholder="HOPE"
              disabled={paying || pending}
            />
          ) : null}

          {!aliasOk && !canPlay ? (
            <p className="cab-hint">
              <span className="cab-hint-glass">
                CALLSIGN ON THE GLASS · THEN INSERT
              </span>
              <span className="cab-hint-till">
                ENTER CALLSIGN (2–16) THEN INSERT
              </span>
            </p>
          ) : null}

          {error ? <p className="cab-error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
