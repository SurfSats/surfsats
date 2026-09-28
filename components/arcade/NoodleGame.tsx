"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import {
  COLS,
  DEAD_BEAT,
  FALLBACK,
  GRID_ALPHA,
  ROWS,
  SKIN_DIR,
  applyNoodleView,
  bodyTile,
  headSprite,
  spriteFallback,
  stampSize,
  tailPoint,
  tailSprite,
  dirFromKey,
  dirFromSwipe,
  noodleView,
  queueDir,
  spawnNoodle,
  stepNoodle,
  type Noodle,
  type NoodleView,
} from "@/lib/noodle";

const ATLAS = [
  "bg",
  "sat",
  "dead",
  "head",
  "body",
  "tail",
  "head-right",
  "head-left",
  "head-up",
  "head-down",
  "body-h",
  "body-v",
  "bend-ne",
  "bend-nw",
  "bend-se",
  "bend-sw",
  "tail-left",
  "tail-right",
  "tail-up",
  "tail-down",
] as const;

type Cropped = {
  img: HTMLImageElement;
  x: number;
  y: number;
  w: number;
  h: number;
  axleX: number;
  axleY: number;
  thick: number;
  along: number;
};
type Skin = Record<string, Cropped | null>;

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
  const skinRef = useRef<Skin>({});
  const phaseRef = useRef(phase);
  const armedRef = useRef(armed);
  const diedRef = useRef(false);
  const hudRef = useRef({ score: -1, length: -1 });
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const viewRef = useRef<NoodleView | null>(null);
  const onDieRef = useRef(onDie);
  const onHudRef = useRef(onHud);

  function spawnForView(ghost: boolean) {
    const view = viewRef.current;
    return spawnNoodle(
      Date.now(),
      ghost,
      view?.cols ?? COLS,
      view?.rows ?? ROWS,
    );
  }

  phaseRef.current = phase;
  armedRef.current = armed;
  onDieRef.current = onDie;
  onHudRef.current = onHud;

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
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (parent) {
      viewRef.current = noodleView(parent.clientWidth, parent.clientHeight);
    }
    const game = gameRef.current;
    if (phase === "ghost") {
      gameRef.current = spawnForView(true);
      diedRef.current = false;
    } else if (phase === "ready") {
      gameRef.current = spawnForView(false);
      diedRef.current = false;
    } else if (phase === "play") {
      if (game.ghost || game.dead) {
        gameRef.current = spawnForView(false);
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
      const parent = surface.parentElement;
      const cssW = Math.max(1, parent?.clientWidth ?? surface.clientWidth);
      const cssH = Math.max(1, parent?.clientHeight ?? surface.clientHeight);
      const view = noodleView(cssW, cssH);
      viewRef.current = view;
      applyNoodleView(game, view);
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
      paint(surface, game, skinRef.current, view);
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

function loadSkinImage(name: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `${SKIN_DIR}/${name}.png`;
  });
}

function cropImage(img: HTMLImageElement): Cropped {
  const whole = {
    img,
    x: 0,
    y: 0,
    w: img.width,
    h: img.height,
    axleX: img.width / 2,
    axleY: img.height / 2,
    thick: Math.min(img.width, img.height),
    along: Math.max(img.width, img.height),
  };
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return whole;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height).data;
  const rowW = new Int32Array(img.height);
  const colA = new Int32Array(img.width);
  const colB = new Int32Array(img.width);
  colA.fill(-1);
  let minX = img.width;
  let minY = img.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < img.height; y++) {
    let a = -1;
    let b = -1;
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      if (data[i + 3]! < 14) continue;
      if (data[i]! + data[i + 1]! + data[i + 2]! < 20) continue;
      if (a < 0) a = x;
      b = x;
      if (colA[x] < 0) colA[x] = y;
      colB[x] = y;
    }
    if (a < 0) continue;
    rowW[y] = b - a;
    if (a < minX) minX = a;
    if (b > maxX) maxX = b;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (maxX <= minX || maxY <= minY) return whole;
  let maxRow = 0;
  let maxCol = 0;
  for (let y = 0; y < img.height; y++) if (rowW[y]! > maxRow) maxRow = rowW[y]!;
  for (let x = 0; x < img.width; x++) {
    if (colA[x]! < 0) continue;
    const span = colB[x]! - colA[x]!;
    if (span > maxCol) maxCol = span;
  }
  const wideY: number[] = [];
  const tallX: number[] = [];
  const narrowW: number[] = [];
  for (let y = 0; y < img.height; y++) {
    const w = rowW[y]!;
    if (w > maxRow * 0.55) wideY.push(y);
    else if (w > 8) narrowW.push(w);
  }
  for (let x = 0; x < img.width; x++) {
    if (colA[x]! < 0) continue;
    if (colB[x]! - colA[x]! > maxCol * 0.55) tallX.push(x);
  }
  const mid = (values: number[]) => values[Math.floor(values.length / 2)] ?? 0;
  narrowW.sort((a, b) => a - b);
  const cross = Math.min(maxRow, maxCol);
  const opaqueH = maxY - minY;
  return {
    img,
    x: Math.max(0, minX - 2),
    y: Math.max(0, minY - 2),
    w: Math.min(img.width, maxX - minX + 6),
    h: Math.min(img.height, maxY - minY + 6),
    axleX: tallX.length ? mid(tallX) : (minX + maxX) / 2,
    axleY: wideY.length ? mid(wideY) : (minY + maxY) / 2,
    thick: narrowW.length > opaqueH * 0.15 ? mid(narrowW) : cross,
    along: Math.max(maxX - minX, maxY - minY),
  };
}

async function loadCropped(name: string) {
  const img = await loadSkinImage(name);
  if (!img) return null;
  if (name === "bg") {
    return {
      img,
      x: 0,
      y: 0,
      w: img.width,
      h: img.height,
      axleX: img.width / 2,
      axleY: img.height / 2,
      thick: 1,
      along: 1,
    };
  }
  return cropImage(img);
}

async function loadAtlas(): Promise<Skin> {
  const skin: Skin = {};
  await Promise.all(
    ATLAS.map(async (name) => {
      const fallback = spriteFallback(name);
      const own = await loadCropped(name);
      skin[name] =
        own ?? (fallback === name ? null : await loadCropped(fallback));
    }),
  );
  return skin;
}

function skinPiece(skin: Skin, name: string) {
  return skin[name] ?? skin[spriteFallback(name)] ?? null;
}

function tubeRatio(skin: Skin) {
  const ref = skin["body-h"];
  if (!ref || ref.along <= 0 || ref.thick <= 0) return 0.55;
  return ref.thick / ref.along;
}

function paint(
  canvas: HTMLCanvasElement,
  game: Noodle,
  skin: Skin,
  view: NoodleView,
) {
  const cssW = view.w;
  const cssH = view.h;
  if (canvas.width !== cssW) canvas.width = cssW;
  if (canvas.height !== cssH) canvas.height = cssH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cssW, cssH);
  const bg = skin.bg;
  if (bg) {
    ctx.drawImage(bg.img, bg.x, bg.y, bg.w, bg.h, 0, 0, cssW, cssH);
  } else {
    ctx.fillStyle = FALLBACK;
    ctx.fillRect(0, 0, cssW, cssH);
  }
  paintGrid(ctx, view);

  const hideCorpse = game.dead && !game.ghost && game.deadT >= DEAD_BEAT;
  if (hideCorpse) return;

  const stamp = (
    piece: Cropped | null,
    cell: { x: number; y: number },
    kind: "head" | "body" | "bend" | "tail" | "sat" | "dead",
  ) => {
    const aspect = piece && piece.h > 0 ? piece.w / piece.h : 1;
    const box = stampSize(view.cell, kind, aspect);
    const x = view.ox + cell.x * view.cell + (view.cell - box.w) / 2;
    const y = view.oy + cell.y * view.cell + (view.cell - box.h) / 2;
    ctx.imageSmoothingEnabled = false;
    if (piece) {
      ctx.drawImage(
        piece.img,
        piece.x,
        piece.y,
        piece.w,
        piece.h,
        x,
        y,
        box.w,
        box.h,
      );
    } else {
      ctx.fillStyle = FALLBACK;
      ctx.fillRect(x, y, box.w, box.h);
    }
  };

  const ratio = tubeRatio(skin);
  const stampTube = (piece: Cropped | null, cell: { x: number; y: number }) => {
    const left = view.ox + cell.x * view.cell;
    const top = view.oy + cell.y * view.cell;
    if (!piece || piece.thick <= 0) {
      ctx.fillStyle = FALLBACK;
      ctx.fillRect(left, top, view.cell, view.cell);
      return;
    }
    const scale = (view.cell * ratio) / piece.thick;
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, view.cell, view.cell);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      piece.img,
      left + view.cell / 2 - piece.axleX * scale,
      top + view.cell / 2 - piece.axleY * scale,
      piece.img.width * scale,
      piece.img.height * scale,
    );
    ctx.restore();
  };

  if (game.sat.x >= 0) stamp(skin.sat ?? null, game.sat, "sat");

  const last = game.body.length - 1;
  if (last > 0) {
    const tail = game.body[last]!;
    stamp(skinPiece(skin, tailSprite(tailPoint(game))), tail, "tail");
  }
  for (let i = last - 1; i >= 1; i--) {
    const cell = game.body[i]!;
    stampTube(skinPiece(skin, bodyTile(game, i)), cell);
  }
  const head = game.body[0];
  if (head) {
    if (game.dead) stamp(skin.dead ?? null, head, "dead");
    else stamp(skinPiece(skin, headSprite(game.dir)), head, "head");
  }
}

function paintGrid(
  ctx: CanvasRenderingContext2D,
  view: NoodleView,
) {
  ctx.save();
  ctx.globalAlpha = GRID_ALPHA;
  ctx.strokeStyle = "#f4efe6";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= view.cols; x++) {
    const px = view.ox + x * view.cell + 0.5;
    ctx.moveTo(px, view.oy);
    ctx.lineTo(px, view.oy + view.gridH);
  }
  for (let y = 0; y <= view.rows; y++) {
    const py = view.oy + y * view.cell + 0.5;
    ctx.moveTo(view.ox, py);
    ctx.lineTo(view.ox + view.gridW, py);
  }
  ctx.stroke();
  ctx.restore();
}
