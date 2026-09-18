"use client";

import { NoodleGame, type NoodlePhase } from "@/components/arcade/NoodleGame";
import type { ArcadeScreenMode } from "@/components/arcade/ArcadeScreen";
import { verbPressProps } from "@/lib/verb-press";
import {
  ARCADE_PRICE_SATS,
  PLEB_BOX_ATTRACT,
  PLEB_BOX_LABEL,
  plebBoxGame,
  type PlebBoxGameId,
} from "@/lib/arcade";

export function PlebBoxScreen({
  mode,
  credits,
  game,
  score,
  length,
  armed = true,
  aliasOk = false,
  onInsert,
  onPlay,
  onDie,
  onHud,
}: {
  mode: ArcadeScreenMode;
  credits: number;
  game: PlebBoxGameId;
  score: number;
  length: number;
  armed?: boolean;
  aliasOk?: boolean;
  onInsert: () => void;
  onPlay: () => void;
  onDie: (score: number) => void;
  onHud: (score: number, length: number) => void;
}) {
  const tab = plebBoxGame(game);
  const noodle = game === "noodle";
  const paying = mode === "invoice";
  const playing = noodle && mode === "playing";
  const result = noodle && mode === "result";
  const ready = noodle && mode === "ready";
  const phase: NoodlePhase = playing
    ? "play"
    : result
      ? "dead"
      : ready
        ? "ready"
        : "ghost";

  return (
    <div
      className={[
        "cab-crt",
        "cab-crt-photo",
        "cab-crt-pleb",
        noodle ? "has-field" : "",
        playing || result ? "cab-crt-live" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="cab-crt-well">
        {noodle ? (
          <NoodleGame
            phase={phase}
            armed={armed}
            onDie={onDie}
            onHud={onHud}
          />
        ) : null}
      </div>
      <div className="cab-crt-glass" aria-hidden="true" />
      <div className="cab-crt-scan" aria-hidden="true" />

      {noodle && (playing || result) ? (
        <p className="cab-crt-hud">
          SCORE {score} · LEN {length}
        </p>
      ) : null}

      {paying ? (
        <div className="cab-crt-attract pleb-attract">
          <p className="cab-crt-insert cab-crt-blink">
            PAY {ARCADE_PRICE_SATS} SATS
          </p>
          <p className="cab-crt-sub">
            {PLEB_BOX_LABEL} · {tab.label}
          </p>
        </div>
      ) : null}

      {result ? (
        <div className="cab-crt-result">
          <p className="cab-crt-insert">SCORE {score}</p>
          <p className="cab-crt-sub">LEN {length}</p>
          <button
            type="button"
            className="cab-crt-next"
            onClick={credits > 0 ? onPlay : onInsert}
          >
            {credits > 0 ? "NEXT LIFE" : `INSERT ${ARCADE_PRICE_SATS} SATS`}
          </button>
        </div>
      ) : null}

      {ready && !paying ? (
        <button
          type="button"
          className="cab-crt-attract cab-crt-hit pleb-attract"
          tabIndex={-1}
          onClick={onPlay}
        >
          <p className="cab-crt-insert cab-crt-blink">PRESS START</p>
          <p className="cab-crt-sub">
            NOODLE · {credits} CREDIT{credits === 1 ? "" : "S"}
          </p>
        </button>
      ) : null}

      {!noodle && !paying ? (
        <div className="cab-crt-attract pleb-attract">
          <p className="cab-crt-insert">{tab.label}</p>
          <p className="cab-crt-sub">
            {credits > 0 ? tab.line : PLEB_BOX_ATTRACT}
          </p>
        </div>
      ) : null}

      {noodle && !paying && !playing && !result && !ready ? (
        <div className="cab-crt-attract pleb-attract">
          <button
            type="button"
            className="cab-crt-verb"
            tabIndex={-1}
            {...verbPressProps}
            onClick={onInsert}
          >
            <p className="cab-crt-insert cab-crt-blink">
              {aliasOk
                ? `INSERT ${ARCADE_PRICE_SATS} SATS`
                : "ENTER CALLSIGN"}
            </p>
            <p className="cab-crt-sub">NOODLE · LASER · YEET</p>
          </button>
        </div>
      ) : null}
    </div>
  );
}
