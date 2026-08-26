"use client";

import Image from "next/image";
import type { MutableRefObject } from "react";
import { RetroScreen } from "@/components/arcade/RetroScreen";
import type { ArcadeScreenMode } from "@/components/arcade/ArcadeScreen";
import type { RetroPad } from "@/components/arcade/retroGames";
import {
  ARCADE_ALIAS_MAX,
  ARCADE_CREDITS_PER_PAY,
  ARCADE_PRICE_SATS,
  RETRO_GAMES,
  formatCredits,
  sanitizeAlias,
  type RetroGameId,
} from "@/lib/arcade";

export function RetroCabinet({
  alias,
  credits,
  mode,
  pending,
  error,
  lastScore,
  scoreRank,
  scoreCopied,
  game,
  padRef,
  armed = true,
  onAlias,
  onInsert,
  onPlay,
  onSelectGame,
  onGameOver,
  onCopyScore,
  onPad,
}: {
  alias: string;
  credits: number;
  mode: ArcadeScreenMode;
  pending: boolean;
  error: string | null;
  lastScore: number | null;
  scoreRank: number | null;
  scoreCopied: boolean;
  game: RetroGameId | null;
  padRef: MutableRefObject<RetroPad>;
  armed?: boolean;
  onAlias: (value: string) => void;
  onInsert: () => void;
  onPlay: () => void;
  onSelectGame: (id: RetroGameId) => void;
  onGameOver: (score: number) => void;
  onCopyScore: () => void;
  onPad: (key: keyof RetroPad, down: boolean) => void;
}) {
  const aliasOk = sanitizeAlias(alias).ok;
  const canPlay =
    Boolean(game) && credits > 0 && mode !== "invoice" && mode !== "playing";
  const paying = mode === "invoice";
  const insertLocked =
    !aliasOk || !game || pending || paying || mode === "playing";
  const playing = mode === "playing";

  return (
    <div className="cab-wrap">
      <div className="cab-machine cab-machine-retro">
        <div className="cab-body">
          <p className="cab-plate">RETRO</p>
          <Image
            src="/arcade-cabinet-wide.png"
            alt="SurfSats retro arcade cabinet"
            width={1712}
            height={1152}
            unoptimized
            className="cab-art"
            sizes="(max-width: 900px) 96vw, 58rem"
          />

          <div className="cab-crt-slot">
            <RetroScreen
              mode={mode}
              credits={credits}
              game={game}
              lastScore={lastScore}
              scoreRank={scoreRank}
              scoreCopied={scoreCopied}
              padRef={padRef}
              armed={armed}
              onPlay={onPlay}
              onInsert={onInsert}
              onGameOver={onGameOver}
              onCopyScore={onCopyScore}
            />
          </div>
        </div>

        <div className="cab-games" role="group" aria-label="Select retro game">
          {RETRO_GAMES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={game === item.id ? "cab-game-btn is-on" : "cab-game-btn"}
              disabled={playing}
              onClick={() => onSelectGame(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="cab-coin" id="arcade-coin-retro">
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
                {pending
                  ? "BUILDING INVOICE…"
                  : !game
                    ? "PICK A GAME"
                    : `INSERT ${ARCADE_PRICE_SATS} SATS`}
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
              disabled={!aliasOk || !game || pending || paying}
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

          {playing ? (
            <div className="cab-pad" aria-label="Retro controls">
              <div className="cab-pad-dirs">
                <span />
                <PadBtn label="UP" onPad={onPad} keyName="up" />
                <span />
                <PadBtn label="LEFT" onPad={onPad} keyName="left" />
                <span className="cab-pad-nub" />
                <PadBtn label="RIGHT" onPad={onPad} keyName="right" />
                <span />
                <PadBtn label="DOWN" onPad={onPad} keyName="down" />
                <span />
              </div>
              <PadBtn label="FIRE / ROTATE" onPad={onPad} keyName="fire" fat />
            </div>
          ) : !aliasOk && !canPlay ? (
            <p className="cab-hint">
              {game
                ? "ENTER CALLSIGN (2–16) THEN INSERT COIN"
                : "PICK A GAME, THEN CALLSIGN, THEN INSERT COIN"}
            </p>
          ) : (
            <p className="cab-coin-note">
              {ARCADE_PRICE_SATS} SATS = {ARCADE_CREDITS_PER_PAY} CREDITS ·
              RETRO POOL · NO KYC
            </p>
          )}

          {error ? <p className="cab-error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

function PadBtn({
  label,
  keyName,
  onPad,
  fat = false,
}: {
  label: string;
  keyName: keyof RetroPad;
  onPad: (key: keyof RetroPad, down: boolean) => void;
  fat?: boolean;
}) {
  return (
    <button
      type="button"
      className={fat ? "cab-pad-btn cab-pad-fat" : "cab-pad-btn"}
      onPointerDown={(event) => {
        event.preventDefault();
        onPad(keyName, true);
      }}
      onPointerUp={() => onPad(keyName, false)}
      onPointerLeave={() => onPad(keyName, false)}
      onPointerCancel={() => onPad(keyName, false)}
    >
      {label}
    </button>
  );
}
