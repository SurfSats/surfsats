"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import {
  emptyPad,
  startRetroGame,
  type RetroPad,
} from "@/components/arcade/retroGames";
import type { RetroGameId } from "@/lib/arcade";

export function applyRetroKey(pad: RetroPad, code: string, down: boolean) {
  if (code === "ArrowLeft" || code === "KeyA") pad.left = down;
  else if (code === "ArrowRight" || code === "KeyD") pad.right = down;
  else if (code === "ArrowUp" || code === "KeyW") pad.up = down;
  else if (code === "ArrowDown" || code === "KeyS") pad.down = down;
  else if (code === "Space" || code === "Enter") pad.fire = down;
  else return false;
  return true;
}

export function RetroGame({
  game,
  padRef,
  armed = true,
  onGameOver,
}: {
  game: RetroGameId;
  padRef: MutableRefObject<RetroPad>;
  armed?: boolean;
  onGameOver: (score: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overRef = useRef(onGameOver);
  const armedRef = useRef(armed);
  overRef.current = onGameOver;
  armedRef.current = armed;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pad = padRef.current;
    Object.assign(pad, emptyPad());
    const stop = startRetroGame(canvas, game, {
      pad,
      onGameOver: (score) => overRef.current(score),
    });
    function onDown(event: KeyboardEvent) {
      if (!armedRef.current) return;
      if (applyRetroKey(pad, event.code, true)) event.preventDefault();
    }
    function onUp(event: KeyboardEvent) {
      if (applyRetroKey(pad, event.code, false)) event.preventDefault();
    }
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      stop();
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      Object.assign(pad, emptyPad());
    };
  }, [game, padRef]);

  return (
    <canvas
      ref={canvasRef}
      className="wave-runner-canvas"
      width={480}
      height={360}
      aria-label={game}
    />
  );
}
