"use client";

import { useState } from "react";
import { LaserGame, type LaserHud, type LaserPhase } from "@/components/arcade/LaserGame";
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
  const laser = game === "laser";
  const live = noodle || laser;
  const paying = mode === "invoice";
  const playing = live && mode === "playing";
  const result = live && mode === "result";
  const ready = live && mode === "ready";
  const phase: NoodlePhase = playing
    ? "play"
    : result
      ? "dead"
      : ready
        ? "ready"
        : "ghost";
  const laserPhase: LaserPhase = phase;
  const [laserHud, setLaserHud] = useState<LaserHud>({
    time: 0,
    sats: 0,
    hp: 3,
    score: 0,
  });

  return (
    <div
      className={[
        "cab-crt",
        "cab-crt-photo",
        "cab-crt-pleb",
        laser ? "is-laser" : "",
        live ? "has-field" : "",
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
        {laser ? (
          <LaserGame
            phase={laserPhase}
            armed={armed}
            onDie={onDie}
            onHud={(hud) => {
              setLaserHud(hud);
              onHud(hud.score, hud.hp);
            }}
          />
        ) : null}
      </div>
      <div className="cab-crt-glass" aria-hidden="true" />
      <div className="cab-crt-scan" aria-hidden="true" />
      {laser ? <div className="cab-crt-vignette" aria-hidden="true" /> : null}

      {noodle && (playing || result) ? (
        <p className="cab-crt-hud">
          SCORE {score} · LEN {length}
        </p>
      ) : null}

      {laser && playing ? (
        <div
          className="cab-crt-hud laser-hud"
          aria-label={`HP ${laserHud.hp}. Time ${laserHud.time}. Sats ${laserHud.sats}.`}
        >
          <span className="laser-pips">
            {[0, 1, 2].map((pip) => (
              <i key={pip} className={pip < laserHud.hp ? "is-on" : undefined} />
            ))}
          </span>
          <GlassDigits value={laserHud.time} />
          <GlassDigits value={laserHud.sats} />
        </div>
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
          <p className="cab-crt-sub">
            {laser ? `TIME ${laserHud.time} · SATS ${laserHud.sats}` : `LEN ${length}`}
          </p>
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
            {laser ? "LASER" : "NOODLE"} · {credits} CREDIT{credits === 1 ? "" : "S"}
          </p>
        </button>
      ) : null}

      {!live && !paying ? (
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

function GlassDigits({ value }: { value: number }) {
  const text = String(Math.max(0, Math.floor(value))).padStart(2, "0");
  return (
    <span className="laser-glass-digits">
      {text.split("").map((digit, index) => (
        <span key={`${digit}-${index}`} className="laser-glass-digit">
          {digit}
        </span>
      ))}
    </span>
  );
}
