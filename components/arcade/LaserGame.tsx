"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import {
  LASER_DEAD_BEAT,
  LASER_DIR,
  laserHeldMove,
  laserPlayerSprite,
  laserScore,
  setLaserMove,
  spawnLaser,
  stepLaser,
  type Laser,
  type LaserFacing,
} from "@/lib/laser";

const ATLAS = [
  "bg",
  "player-right",
  "player-left",
  "player-up",
  "player-down",
  "beam",
  "slime",
  "printer",
  "sat",
  "dead",
] as const;

type Cropped = {
  img: HTMLImageElement;
  x: number;
  y: number;
  w: number;
  h: number;
};

type Skin = Record<string, Cropped | null>;

export type LaserPhase = "ghost" | "ready" | "play" | "dead";

export type LaserHud = {
  time: number;
  sats: number;
  hp: number;
  score: number;
};

export function LaserGame({
  phase,
  armed = true,
  onDie,
  onHud,
}: {
  phase: LaserPhase;
  armed?: boolean;
  onDie: (score: number) => void;
  onHud?: (hud: LaserHud) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Laser>(spawnLaser(1, true));
  const skinRef = useRef<Skin>({});
  const phaseRef = useRef(phase);
  const armedRef = useRef(armed);
  const diedRef = useRef(false);
  const hudRef = useRef({ time: -1, sats: -1, hp: -1 });
  const heldRef = useRef(new Set<string>());
  const pointerRef = useRef<{ x: number; y: number; down: boolean } | null>(null);
  const onDieRef = useRef(onDie);
  const onHudRef = useRef(onHud);

  armedRef.current = armed;
  onDieRef.current = onDie;
  onHudRef.current = onHud;
  if (phaseRef.current !== phase) {
    phaseRef.current = phase;
    const current = gameRef.current;
    const fresh =
      phase === "ghost" ||
      phase === "ready" ||
      (phase === "play" && (current.ghost || current.dead));
    if (fresh) {
      const parent = canvasRef.current?.parentElement;
      const w = Math.max(32, parent?.clientWidth ?? current.w);
      const h = Math.max(32, parent?.clientHeight ?? current.h);
      gameRef.current = spawnLaser(Date.now(), phase === "ghost", w, h);
      diedRef.current = false;
      hudRef.current = { time: -1, sats: -1, hp: -1 };
      heldRef.current.clear();
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await loadAtlas();
      if (!cancelled) skinRef.current = next;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const surface = canvasRef.current;
    const parent = surface?.parentElement;
    const w = Math.max(32, parent?.clientWidth ?? 480);
    const h = Math.max(32, parent?.clientHeight ?? 320);
    gameRef.current = spawnLaser(Date.now(), phaseRef.current === "ghost", w, h);
    diedRef.current = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const surface = canvasRef.current;
      if (!surface) return;
      raf = window.requestAnimationFrame(draw);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const game = gameRef.current;
      const phaseNow = phaseRef.current;
      const parent = surface.parentElement;
      game.w = Math.max(32, parent?.clientWidth ?? surface.clientWidth);
      game.h = Math.max(32, parent?.clientHeight ?? surface.clientHeight);
      if (
        !game.dead &&
        game.time === 0 &&
        game.enemies.length === 0 &&
        game.move.x === 0 &&
        game.move.y === 0
      ) {
        game.x = game.w / 2;
        game.y = game.h / 2;
      }
      if (phaseNow === "play" && armedRef.current && heldRef.current.size > 0) {
        game.move = laserHeldMove(heldRef.current);
      }
      if (phaseNow === "ghost" || (phaseNow === "play" && armedRef.current)) {
        stepLaser(game, dt);
      }
      const hud = {
        time: Math.floor(game.time),
        sats: game.sats,
        hp: game.hp,
        score: laserScore(game),
      };
      if (
        hud.time !== hudRef.current.time ||
        hud.sats !== hudRef.current.sats ||
        hud.hp !== hudRef.current.hp
      ) {
        hudRef.current = { time: hud.time, sats: hud.sats, hp: hud.hp };
        onHudRef.current?.(hud);
      }
      if (
        phaseNow === "play" &&
        game.dead &&
        game.deadT >= LASER_DEAD_BEAT &&
        !diedRef.current
      ) {
        diedRef.current = true;
        onDieRef.current(hud.score);
      }
      paint(surface, game, skinRef.current);
    };
    raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!armedRef.current || phaseRef.current !== "play") return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (!isMoveKey(event.key)) return;
      event.preventDefault();
      heldRef.current.add(event.key);
    }
    function onUp(event: KeyboardEvent) {
      heldRef.current.delete(event.key);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (phaseRef.current !== "play" || !armedRef.current) return;
    pointerRef.current = { x: event.clientX, y: event.clientY, down: true };
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const start = pointerRef.current;
    if (!start?.down || phaseRef.current !== "play" || !armedRef.current) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) < 16) return;
    if (heldRef.current.size > 0) return;
    setLaserMove(gameRef.current, dx, dy);
  }

  function onPointerUp() {
    pointerRef.current = null;
    if (heldRef.current.size === 0) setLaserMove(gameRef.current, 0, 0);
  }

  return (
    <canvas
      ref={canvasRef}
      className="laser-canvas"
      aria-label="LASER. Arrows or WASD. Eyes fire."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}

function isMoveKey(key: string) {
  return (
    key === "ArrowLeft" ||
    key === "ArrowRight" ||
    key === "ArrowUp" ||
    key === "ArrowDown" ||
    key === "a" ||
    key === "A" ||
    key === "d" ||
    key === "D" ||
    key === "w" ||
    key === "W" ||
    key === "s" ||
    key === "S"
  );
}

function loadSkinImage(name: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `${LASER_DIR}/${name}.png`;
  });
}

function cropImage(img: HTMLImageElement): Cropped {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { img, x: 0, y: 0, w: img.width, h: img.height };
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height).data;
  let minX = img.width;
  let minY = img.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < img.height; y += 2) {
    for (let x = 0; x < img.width; x += 2) {
      const i = (y * img.width + x) * 4;
      if (data[i + 3]! < 16) continue;
      if (data[i]! + data[i + 1]! + data[i + 2]! < 18) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX <= minX || maxY <= minY) {
    return { img, x: 0, y: 0, w: img.width, h: img.height };
  }
  const x = Math.max(0, minX - 1);
  const y = Math.max(0, minY - 1);
  return {
    img,
    x,
    y,
    w: Math.min(img.width - x, maxX - x + 2),
    h: Math.min(img.height - y, maxY - y + 2),
  };
}

async function loadAtlas(): Promise<Skin> {
  const skin: Skin = {};
  await Promise.all(
    ATLAS.map(async (name) => {
      const img = await loadSkinImage(name);
      if (!img) {
        skin[name] = null;
        return;
      }
      skin[name] = name === "bg"
        ? { img, x: 0, y: 0, w: img.width, h: img.height }
        : cropImage(img);
    }),
  );
  return skin;
}

function paint(canvas: HTMLCanvasElement, game: Laser, skin: Skin) {
  const cssW = Math.max(1, Math.floor(game.w));
  const cssH = Math.max(1, Math.floor(game.h));
  if (canvas.width !== cssW) canvas.width = cssW;
  if (canvas.height !== cssH) canvas.height = cssH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cssW, cssH);
  const bg = skin.bg;
  if (bg) {
    const tile = Math.max(48, Math.round(Math.min(cssW, cssH) * 0.45));
    for (let y = 0; y < cssH; y += tile) {
      for (let x = 0; x < cssW; x += tile) {
        ctx.drawImage(bg.img, bg.x, bg.y, bg.w, bg.h, x, y, tile, tile);
      }
    }
  } else {
    ctx.fillStyle = "#14120c";
    ctx.fillRect(0, 0, cssW, cssH);
  }
  const short = Math.min(cssW, cssH);
  const stamp = (
    piece: Cropped | null | undefined,
    x: number,
    y: number,
    height: number,
  ) => {
    if (!piece) return;
    const aspect = piece.h > 0 ? piece.w / piece.h : 1;
    const h = Math.max(1, Math.round(height));
    const w = Math.max(1, Math.round(h * aspect));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(piece.img, piece.x, piece.y, piece.w, piece.h, x - w / 2, y - h / 2, w, h);
  };
  for (const drop of game.drops) stamp(skin.sat, drop.x, drop.y, short * 0.07);
  for (const enemy of game.enemies) {
    const piece = enemy.kind === "printer" ? skin.printer : skin.slime;
    stamp(piece, enemy.x, enemy.y, short * (enemy.kind === "printer" ? 0.2 : 0.12));
  }
  for (const beam of game.beams) stampBeam(ctx, skin.beam, beam.x, beam.y, beam.facing, short * 0.16);
  const body = short * 0.22;
  if (game.dead) stamp(skin.dead, game.x, game.y, body);
  else stamp(skin[laserPlayerSprite(game.facing)], game.x, game.y, body);
}

function stampBeam(
  ctx: CanvasRenderingContext2D,
  piece: Cropped | null | undefined,
  x: number,
  y: number,
  facing: LaserFacing,
  length: number,
) {
  if (!piece) return;
  const aspect = piece.h > 0 ? piece.w / piece.h : 3;
  const w = Math.max(1, Math.round(length));
  const h = Math.max(1, Math.round(w / aspect));
  ctx.save();
  ctx.translate(x, y);
  ctx.imageSmoothingEnabled = false;
  if (facing === "left") ctx.scale(-1, 1);
  else if (facing === "up") ctx.rotate(-Math.PI / 2);
  else if (facing === "down") ctx.rotate(Math.PI / 2);
  ctx.drawImage(piece.img, piece.x, piece.y, piece.w, piece.h, -w / 2, -h / 2, w, h);
  ctx.restore();
}
