"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import { PlebBoxScreen } from "@/components/arcade/PlebBoxScreen";
import { CreditLed } from "@/components/arcade/CreditLed";
import { CallsignField } from "@/components/glass/CallsignField";
import type { ArcadeScreenMode } from "@/components/arcade/ArcadeScreen";
import { verbPressProps } from "@/lib/verb-press";
import {
  ARCADE_CREDITS_PER_PAY,
  ARCADE_PRICE_SATS,
  PLEB_BOX_GAMES,
  PLEB_BOX_LABEL,
  sanitizeAlias,
  type PlebBoxGameId,
} from "@/lib/arcade";

export function PlebBoxCabinet({
  alias,
  credits,
  mode,
  pending,
  error,
  game,
  score,
  length,
  armed = true,
  front = true,
  onInsert,
  onPlay,
  onSelectGame,
  onDie,
  onHud,
}: {
  alias: string;
  credits: number;
  mode: ArcadeScreenMode;
  pending: boolean;
  error: string | null;
  game: PlebBoxGameId;
  score: number;
  length: number;
  armed?: boolean;
  front?: boolean;
  onInsert: () => void;
  onPlay: () => void;
  onSelectGame: (id: PlebBoxGameId) => void;
  onDie: (score: number) => void;
  onHud: (score: number, length: number) => void;
}) {
  const aliasOk = sanitizeAlias(alias).ok;
  const paying = mode === "invoice";
  const playing = mode === "playing";
  const showInsert = credits < 1 && !paying && !playing;
  const canPlay =
    game === "noodle" &&
    credits > 0 &&
    !paying &&
    !playing &&
    aliasOk;
  const rootRef = useRef<HTMLDivElement>(null);
  const callsignRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    function onFull() {
      setFull(document.fullscreenElement === rootRef.current);
    }
    document.addEventListener("fullscreenchange", onFull);
    return () => document.removeEventListener("fullscreenchange", onFull);
  }, []);

  const focusCallsign = useCallback(() => {
    callsignRef.current?.querySelector("input")?.focus();
  }, []);

  const typedAlias = useCallback(() => {
    const typed = callsignRef.current?.querySelector("input")?.value ?? alias;
    return sanitizeAlias(typed);
  }, [alias]);

  const submitCallsign = useCallback(() => {
    if (paying || pending) return;
    const typed = typedAlias();
    if (!typed.ok) {
      focusCallsign();
      return;
    }
    if (canPlay) {
      onPlay();
      return;
    }
    if (showInsert) onInsert();
  }, [canPlay, focusCallsign, onInsert, onPlay, paying, pending, showInsert, typedAlias]);

  function onCallsignKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    submitCallsign();
  }

  async function toggleFull() {
    const node = rootRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await node.requestFullscreen();
      }
    } catch {
      // browser or user blocked fullscreen
    }
  }

  return (
    <div
      ref={rootRef}
      className={front ? "cab-wrap pleb-bleed" : "cab-wrap"}
    >
      <div className="cab-machine cab-machine-pleb">
        <div className="cab-body">
          {front ? null : (
            <>
              <p className="cab-plate">{PLEB_BOX_LABEL}</p>
              <Image
                src="/arcade-cabinet-wide.png"
                alt="SurfSats Pleb Box arcade cabinet"
                width={1712}
                height={1152}
                unoptimized
                className="cab-art"
                sizes="(max-width: 900px) 42vw, 24rem"
              />
            </>
          )}

          <div className="cab-crt-slot">
            <PlebBoxScreen
              mode={mode}
              credits={credits}
              game={game}
              score={score}
              length={length}
              armed={armed}
              aliasOk={aliasOk}
              onInsert={submitCallsign}
              onPlay={onPlay}
              onDie={onDie}
              onHud={onHud}
            />
          </div>
        </div>

        <div className="pleb-dock">
          <div className="cab-games" role="tablist" aria-label="Pleb Box games">
            {PLEB_BOX_GAMES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={game === item.id}
                className={
                  game === item.id
                    ? "cab-game-btn pleb-tab is-on"
                    : "cab-game-btn pleb-tab"
                }
                disabled={paying}
                onClick={() => onSelectGame(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="cab-coin cab-coin-plate" id="arcade-coin-pleb">
            <div className="cab-coin-top">
              {canPlay ? (
                <button type="button" className="cab-play" onClick={onPlay}>
                  {mode === "result" ? "NEXT LIFE" : "PLAY"}
                  <span>1 CREDIT</span>
                </button>
              ) : showInsert ? (
                <button
                  type="button"
                  className="cab-insert cab-insert-primary cab-till-insert"
                  {...verbPressProps}
                  disabled={!aliasOk || pending || paying}
                  onClick={submitCallsign}
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
              {front ? (
                <button
                  type="button"
                  className="pleb-full"
                  onClick={() => void toggleFull()}
                >
                  {full ? "EXIT FULL" : "FULL SCREEN"}
                </button>
              ) : null}
            </div>

            {paying ? null : (
              <div
                ref={callsignRef}
                className="pleb-callsign"
                onKeyDown={onCallsignKey}
              >
                <CallsignField
                  className="cab-alias cab-till-alias"
                  label="CALLSIGN · REQUIRED"
                  placeholder="HOPE"
                  disabled={pending || playing}
                />
              </div>
            )}

            {!aliasOk && !paying && !playing ? (
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
    </div>
  );
}
