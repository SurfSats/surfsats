"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import {
  DEAD_BEAT,
  FALLBACK,
  SKIN_DIR,
  dirFromKey,
  dirFromSwipe,
  noodleView,
  queueDir,
  spawnNoodle,
  stepNoodle,
  segmentDir,
  tailDir,
  type Noodle,
} from "@/lib/noodle";

type SkinKey = "bg" | "head" | "body" | "tail" | "sat" | "dead";
type Cropped = {
  img: HTMLImageElement;
  x: number;
  y: number;
  w: number;
  h: number;
};
type Skin = Record<SkinKey, Cropped | null>;

export type NoodlePhase = "ghost" | "ready" | "play" | "dead";

export function NoodleGame({
  phase,
  armed = true,
  onDie,
  onHud,
}: {
  phase: NoodlePhase;
  armed?: boolean;
  onDie: (score: number) => void;
  onHud?: (score: number, length: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Noodle>(spawnNoodle(1, true));
  const skinRef = useRef<Skin>({
    bg: null,
    head: null,
    body: null,
    tail: null,
    sat: null,
    dead: null,
  });
  const phaseRef = useRef(phase);
  const armedRef = useRef(armed);
  const diedRef = useRef(false);
  const hudRef = useRef({ score: -1, length: -1 });
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const onDieRef = useRef(onDie);
  const onHudRef = useRef(onHud);

  phaseRef.current = phase;
  armedRef.current = armed;
  onDieRef.current = onDie;
  onHudRef.current = onHud;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = emptySkin();
      await Promise.all(
        (["bg", "head", "body", "tail", "sat", "dead"] as SkinKey[]).map(
          async (key) => {
            next[key] = await loadCropped(key);
          },
        ),
      );
      if (!cancelled) skinRef.current = next;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const game = gameRef.current;
    if (phase === "ghost") {
      gameRef.current = spawnNoodle(Date.now(), true);
      diedRef.current = false;
    } else if (phase === "ready") {
      gameRef.current = spawnNoodle(Date.now(), false);
      diedRef.current = false;
    } else if (phase === "play") {
      if (game.ghost || game.dead) {
        gameRef.current = spawnNoodle(Date.now(), false);
      } else {
        game.ghost = false;
      }
      diedRef.current = false;
    }
    onHudRef.current?.(
      gameRef.current.score,
      gameRef.current.body.length,
    );
  }, [phase]);

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
      if (phaseNow === "ghost" || (phaseNow === "play" && armedRef.current)) {
        stepNoodle(game, dt);
      }
      if (
        (phaseNow === "play" || phaseNow === "dead") &&
        (game.score !== hudRef.current.score ||
          game.body.length !== hudRef.current.length)
      ) {
        hudRef.current = { score: game.score, length: game.body.length };
        onHudRef.current?.(game.score, game.body.length);
      }
      if (
        phaseNow === "play" &&
        game.dead &&
        game.deadT >= DEAD_BEAT &&
        !diedRef.current
      ) {
        diedRef.current = true;
        onDieRef.current(game.score);
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
      const dir = dirFromKey(event.key);
      if (!dir) return;
      event.preventDefault();
      queueDir(gameRef.current, dir);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (phaseRef.current !== "play" || !armedRef.current) return;
    pointerRef.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const start = pointerRef.current;
    pointerRef.current = null;
    if (!start || phaseRef.current !== "play" || !armedRef.current) return;
    const dir = dirFromSwipe(event.clientX - start.x, event.clientY - start.y);
    if (dir) queueDir(gameRef.current, dir);
  }

  return (
    <canvas
      ref={canvasRef}
      className="noodle-canvas"
      aria-label="NOODLE. Arrows or WASD. Swipe to turn."
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        pointerRef.current = null;
      }}
    />
  );
}

function emptySkin(): Skin {
  return { bg: null, head: null, body: null, tail: null, sat: null, dead: null };
}

function loadSkinImage(name: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `${SKIN_DIR}/${name}.png`;
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
      if (data[i + 3] < 14) continue;
      if (data[i] + data[i + 1] + data[i + 2] < 20) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX <= minX || maxY <= minY) {
    return { img, x: 0, y: 0, w: img.width, h: img.height };
  }
  return {
    img,
    x: Math.max(0, minX - 2),
    y: Math.max(0, minY - 2),
    w: Math.min(img.width, maxX - minX + 6),
    h: Math.min(img.height, maxY - minY + 6),
  };
}

async function loadCropped(name: SkinKey) {
  const img = await loadSkinImage(name);
  if (!img) return null;
  if (name === "bg") return { img, x: 0, y: 0, w: img.width, h: img.height };
  return cropImage(img);
}

function paint(canvas: HTMLCanvasElement, game: Noodle, skin: Skin) {
  const parent = canvas.parentElement;
  const cssW = Math.max(1, parent?.clientWidth ?? canvas.clientWidth);
  const cssH = Math.max(1, parent?.clientHeight ?? canvas.clientHeight);
  if (canvas.width !== cssW) canvas.width = cssW;
  if (canvas.height !== cssH) canvas.height = cssH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cssW, cssH);

  const view = noodleView(cssW, cssH);
  const bg = skin.bg;
  if (bg) {
    ctx.drawImage(bg.img, bg.x, bg.y, bg.w, bg.h, 0, 0, cssW, cssH);
  } else {
    ctx.fillStyle = FALLBACK;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  const stamp = (
    piece: Cropped | null,
    cell: { x: number; y: number },
    angle: number,
  ) => {
    const size = view.cell;
    const cx = view.ox + cell.x * size + size / 2;
    const cy = view.oy + cell.y * size + size / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.imageSmoothingEnabled = false;
    if (piece) {
      ctx.drawImage(
        piece.img,
        piece.x,
        piece.y,
        piece.w,
        piece.h,
        -size / 2,
        -size / 2,
        size,
        size,
      );
    } else {
      ctx.fillStyle = FALLBACK;
      ctx.fillRect(-size / 2, -size / 2, size, size);
    }
    ctx.restore();
  };

  if (game.sat.x >= 0) stamp(skin.sat, game.sat, 0);

  const last = game.body.length - 1;
  for (let i = last; i >= 0; i--) {
    const cell = game.body[i]!;
    if (i === 0) {
      const angle = Math.atan2(game.dir.y, game.dir.x);
      stamp(game.dead ? skin.dead : skin.head, cell, angle);
      continue;
    }
    if (i === last) {
      const dir = tailDir(game);
      stamp(skin.tail, cell, Math.atan2(dir.y, dir.x));
      continue;
    }
    const dir = segmentDir(game, i);
    stamp(skin.body, cell, Math.atan2(dir.y, dir.x));
  }
}
