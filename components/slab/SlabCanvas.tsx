"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  SLAB_CELL_PX,
  SLAB_HEIGHT,
  SLAB_MAX_PIXELS,
  SLAB_STAIN_OPACITY,
  SLAB_WIDTH,
  bezelCounts,
  blocksRemaining,
  canOverwrite,
  cellKey,
  inBounds,
  isLiveCell,
  paletteHex,
  type SlabCell,
  type SlabCoat,
  type SlabColor,
  type SlabPixel,
  type SlabStain,
} from "@/lib/slab";

type Zoom = "fit" | "2x";

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a: string, b: string, t: number) {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * u);
  const g = Math.round(ag + (bg - ag) * u);
  const bl = Math.round(ab + (bb - ab) * u);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function hash01(x: number, y: number) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function linePixels(from: SlabPixel, to: SlabPixel) {
  const pixels: SlabPixel[] = [];
  let x0 = from.x;
  let y0 = from.y;
  const x1 = to.x;
  const y1 = to.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    pixels.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return pixels;
}

function cellFromPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = Math.floor(((clientX - rect.left) / rect.width) * SLAB_WIDTH);
  const y = Math.floor(((clientY - rect.top) / rect.height) * SLAB_HEIGHT);
  if (!inBounds(x, y)) return null;
  return { x, y };
}

function fillPoly(
  ctx: CanvasRenderingContext2D,
  pts: Array<[number, number]>,
  fill: string,
) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function speckle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  amount: number,
) {
  const step = Math.max(1, Math.floor(Math.min(w, h) / 7));
  for (let iy = 0; iy < h; iy += step) {
    for (let ix = 0; ix < w; ix += step) {
      const n = hash01(seed + ix * 13, seed + iy * 17);
      if (n < 1 - amount) continue;
      ctx.fillStyle =
        n > 0.88 ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.22)";
      ctx.fillRect(x + ix, y + iy, step, step);
    }
  }
}

type CubeKind = "void" | "live" | "stain" | "ghost";

function grainFor(color: SlabColor, kind: CubeKind) {
  if (kind === "void") return 0.55;
  if (kind === "stain") return 0.22;
  if (color === "chrome" || color === "bone") return 0.1;
  if (color === "ice" || color === "cyan" || color === "foam") return 0.16;
  if (color === "moss" || color === "rust" || color === "tar") return 0.42;
  if (color === "night" || color === "void") return 0.5;
  return 0.22;
}

function punchAmount(t: number) {
  if (t <= 0) return 0;
  if (t < 0.32) return (t / 0.32) * 0.85;
  if (t < 1) return 0.85 * (1 - (t - 0.32) / 0.68);
  return 0;
}

function wetAmount(t: number) {
  if (t < 0.22) return 0;
  if (t < 0.55) return (t - 0.22) / 0.33;
  if (t < 1) return 1 - (t - 0.55) * 0.55;
  return 0.2;
}

function drawCube(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  S: number,
  hex: string,
  opts: {
    kind: CubeKind;
    colorId: SlabColor;
    outline: boolean;
    reef: boolean;
    wet: number;
    punch: number;
  },
) {
  const d = Math.max(2, Math.round(S * 0.22));
  const inset = opts.punch * d;
  const ox = gx * S + inset * 0.35;
  const oy = gy * S + inset * 0.65;
  const size = S - inset;
  const dd = Math.max(2, Math.round(size * 0.22));
  const fx = ox;
  const fy = oy + dd;
  const fw = size - dd;
  const fh = size - dd;
  const stain = opts.kind === "stain";
  const voided = opts.kind === "void";
  const topMix = stain ? 0.1 : voided ? 0.16 : 0.4;
  const sideMix = stain ? 0.55 : voided ? 0.52 : 0.46;
  const frontMix = stain ? 0.28 : voided ? 0.18 : 0.05;
  const topC = mixHex(hex, "#fff6d8", topMix);
  const sideC = mixHex(hex, "#050403", sideMix);
  const frontC = mixHex(hex, "#000000", frontMix);
  const sunC = mixHex(frontC, "#fff1c8", voided ? 0.08 : 0.18);
  const alpha = stain ? SLAB_STAIN_OPACITY : opts.kind === "ghost" ? 0.88 : 1;
  const seed = gx * 97 + gy * 13 + (voided ? 3 : 0);

  ctx.save();
  ctx.globalAlpha = alpha;

  fillPoly(
    ctx,
    [
      [fx + fw, fy],
      [fx + fw + dd, oy],
      [fx + fw + dd, oy + fh],
      [fx + fw, fy + fh],
    ],
    sideC,
  );
  fillPoly(
    ctx,
    [
      [fx, fy],
      [fx + dd, oy],
      [fx + fw + dd, oy],
      [fx + fw, fy],
    ],
    topC,
  );

  ctx.fillStyle = frontC;
  ctx.fillRect(fx, fy, fw, fh);
  ctx.fillStyle = sunC;
  ctx.fillRect(fx, fy, Math.max(1, Math.round(fw * 0.14)), fh);

  speckle(ctx, fx, fy, fw, fh, seed, grainFor(opts.colorId, opts.kind));
  speckle(
    ctx,
    fx + dd,
    oy,
    fw,
    dd,
    seed + 91,
    grainFor(opts.colorId, opts.kind) * 0.7,
  );

  if (voided) {
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(fx + 0.5, fy + 0.5, fw - 1, fh - 1);
  }

  if (opts.reef && !stain) {
    ctx.globalAlpha = alpha * 0.38;
    const lip = Math.max(1, Math.round(fh * 0.2));
    const gloss = ctx.createLinearGradient(fx, fy, fx + fw, fy + lip);
    gloss.addColorStop(0, "rgba(200, 240, 255, 0.7)");
    gloss.addColorStop(1, "rgba(200, 240, 255, 0)");
    ctx.fillStyle = gloss;
    ctx.fillRect(fx, fy, fw, lip);
  }

  if (opts.wet > 0) {
    ctx.globalAlpha = alpha * (0.22 + opts.wet * 0.45);
    const g = ctx.createLinearGradient(fx, fy, fx + fw * 0.4, fy + fh * 0.45);
    g.addColorStop(0, "rgba(255,255,255,0.85)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(fx, fy, fw, fh);
  }

  if (opts.outline) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#f7edd4";
    ctx.lineWidth = Math.max(1.2, S * 0.07);
    ctx.strokeRect(fx + 1, fy + 1, Math.max(1, fw - 2), Math.max(1, fh - 2));
  }

  ctx.restore();
}

export function SlabCanvas({
  live,
  stains,
  height,
  selected,
  coat,
  color,
  wetKeys,
  onSelect,
}: {
  live: SlabCell[];
  stains: SlabStain[];
  height: number;
  selected: SlabPixel[];
  coat: SlabCoat;
  color: SlabColor;
  wetKeys: ReadonlySet<string>;
  onSelect: (pixels: SlabPixel[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const painting = useRef(false);
  const panning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, sl: 0, st: 0 });
  const lastCell = useRef<SlabPixel | null>(null);
  const selectedRef = useRef(selected);
  const spaceHeld = useRef(false);
  selectedRef.current = selected;
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [faceW, setFaceW] = useState(0);
  const [faceH, setFaceH] = useState(0);
  const [punchT, setPunchT] = useState(0);
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    cell: SlabCell | null;
  } | null>(null);

  useEffect(() => {
    const face = faceRef.current;
    if (!face) return;
    const measure = () => {
      setFaceW(face.clientWidth);
      setFaceH(face.clientHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(face);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function down(event: KeyboardEvent) {
      if (event.code !== "Space") return;
      if (event.target instanceof HTMLInputElement) return;
      event.preventDefault();
      spaceHeld.current = true;
    }
    function up(event: KeyboardEvent) {
      if (event.code === "Space") spaceHeld.current = false;
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    if (wetKeys.size === 0) {
      setPunchT(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 920);
      setPunchT(t);
      if (t < 1) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [wetKeys]);

  const fitCell = Math.max(
    8,
    Math.floor(
      Math.min(faceW / SLAB_WIDTH, faceH / SLAB_HEIGHT) || SLAB_CELL_PX,
    ),
  );
  const cellPx = zoom === "2x" ? fitCell * 2 : fitCell;
  const canvasW = SLAB_WIDTH * cellPx;
  const canvasH = SLAB_HEIGHT * cellPx;

  const liveMap = new Map(
    live
      .filter((cell) => isLiveCell(cell, height))
      .map((cell) => [cellKey(cell.x, cell.y), cell]),
  );
  const counts = bezelCounts({ live, stains, currentHeight: height });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const paint = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW <= 0 || cssH <= 0) return;
      const pw = Math.floor(cssW * dpr);
      const ph = Math.floor(cssH * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cell = cssW / SLAB_WIDTH;
      const map = new Map(
        live
          .filter((item) => isLiveCell(item, height))
          .map((item) => [cellKey(item.x, item.y), item]),
      );
      const pickedSet = new Set(
        selected.map((pixel) => cellKey(pixel.x, pixel.y)),
      );
      const stainMap = new Map(
        stains.map((stain) => [cellKey(stain.x, stain.y), stain]),
      );

      ctx.fillStyle = "#0d0b09";
      ctx.fillRect(0, 0, cssW, cssH);
      const sky = ctx.createLinearGradient(0, 0, cssW * 0.4, cssH * 0.35);
      sky.addColorStop(0, "rgba(255, 214, 150, 0.07)");
      sky.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, cssW, cssH);

      const punch = punchAmount(punchT);
      const wet = wetAmount(punchT);

      for (let y = 0; y < SLAB_HEIGHT; y += 1) {
        for (let x = 0; x < SLAB_WIDTH; x += 1) {
          const key = cellKey(x, y);
          const liveCell = map.get(key);
          const stain = stainMap.get(key);
          const picked = pickedSet.has(key);
          const hovered = Boolean(hover && hover.x === x && hover.y === y);
          const settling = wetKeys.has(key);

          if (liveCell) {
            drawCube(ctx, x, y, cell, paletteHex(liveCell.color), {
              kind: "live",
              colorId: liveCell.color,
              outline: picked || hovered,
              reef: liveCell.coat === "reef",
              wet: settling ? wet : 0,
              punch: settling ? punch : 0,
            });
            continue;
          }
          if (picked) {
            drawCube(ctx, x, y, cell, paletteHex(color), {
              kind: "ghost",
              colorId: color,
              outline: true,
              reef: coat === "reef",
              wet: 0,
              punch: 0,
            });
            continue;
          }
          if (stain) {
            drawCube(ctx, x, y, cell, paletteHex(stain.color), {
              kind: "stain",
              colorId: stain.color,
              outline: hovered,
              reef: false,
              wet: 0,
              punch: 0.35,
            });
            continue;
          }
          drawCube(ctx, x, y, cell, "#2b261f", {
            kind: "void",
            colorId: "tar",
            outline: hovered,
            reef: false,
            wet: 0,
            punch: 0,
          });
        }
      }
    };

    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [
    canvasH,
    canvasW,
    coat,
    color,
    height,
    hover,
    live,
    punchT,
    selected,
    stains,
    wetKeys,
    zoom,
  ]);

  function tryAdd(pixels: SlabPixel[], next: SlabPixel[]) {
    const seen = new Set(pixels.map((pixel) => cellKey(pixel.x, pixel.y)));
    const merged = [...pixels];
    for (const pixel of next) {
      const key = cellKey(pixel.x, pixel.y);
      if (seen.has(key)) continue;
      const existing = liveMap.get(key);
      if (!canOverwrite(coat, existing, height)) continue;
      if (merged.length >= SLAB_MAX_PIXELS) break;
      seen.add(key);
      merged.push(pixel);
    }
    return merged;
  }

  function startPan(event: PointerEvent<HTMLCanvasElement>) {
    const face = faceRef.current;
    if (!face) return;
    panning.current = true;
    painting.current = false;
    panStart.current = {
      x: event.clientX,
      y: event.clientY,
      sl: face.scrollLeft,
      st: face.scrollTop,
    };
    try {
      canvasRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (event.button === 1 || event.button === 2 || spaceHeld.current || event.altKey) {
      event.preventDefault();
      startPan(event);
      return;
    }
    const pixel = cellFromPoint(canvas, event.clientX, event.clientY);
    if (!pixel) return;
    const added = tryAdd([], [pixel]);
    if (added.length === 0 && zoom === "2x") {
      startPan(event);
      return;
    }
    painting.current = true;
    panning.current = false;
    lastCell.current = pixel;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // synthetic pointer events have no capture
    }
    onSelect(added);
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const face = faceRef.current;
    if (panning.current && face) {
      face.scrollLeft = panStart.current.sl - (event.clientX - panStart.current.x);
      face.scrollTop = panStart.current.st - (event.clientY - panStart.current.y);
      return;
    }
    if (!canvas) return;
    const pixel = cellFromPoint(canvas, event.clientX, event.clientY);
    if (!pixel) {
      if (!painting.current) setHover(null);
      return;
    }
    const existing = liveMap.get(cellKey(pixel.x, pixel.y)) ?? null;
    if (!painting.current) {
      setHover({ x: pixel.x, y: pixel.y, cell: existing });
      return;
    }
    const from = lastCell.current ?? pixel;
    lastCell.current = pixel;
    onSelect(tryAdd(selectedRef.current, linePixels(from, pixel)));
  }

  function onPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    painting.current = false;
    panning.current = false;
    lastCell.current = null;
    const canvas = canvasRef.current;
    try {
      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    } catch {
      // ignore
    }
  }

  const hoverPlate =
    hover?.cell && !painting.current && !panning.current
      ? {
          callsign: hover.cell.callsign,
          coat: hover.cell.coat,
          left: blocksRemaining(hover.cell, height),
        }
      : null;

  return (
    <div className="slab-stage">
      <div className="slab-hud-top">
        <p>
          painted {counts.painted} · swell {counts.swell} · reef {counts.reef} ·
          stain {counts.stain} · next{" "}
          {counts.nextExpiry == null ? "—" : `${counts.nextExpiry} blocks`}
        </p>
        <div className="slab-zoom" role="group" aria-label="zoom">
          <button
            type="button"
            className={zoom === "fit" ? "is-on" : undefined}
            aria-pressed={zoom === "fit"}
            onClick={() => setZoom("fit")}
          >
            FIT
          </button>
          <button
            type="button"
            className={zoom === "2x" ? "is-on" : undefined}
            aria-pressed={zoom === "2x"}
            onClick={() => setZoom("2x")}
          >
            2×
          </button>
        </div>
      </div>
      <div className="slab-face" data-zoom={zoom} ref={faceRef}>
        <canvas
          ref={canvasRef}
          className="slab-canvas"
          width={canvasW}
          height={canvasH}
          style={{ width: canvasW, height: canvasH }}
          aria-label="the slab"
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => {
            if (!painting.current) setHover(null);
          }}
        />
      </div>
      {hoverPlate ? (
        <div className="slab-hover" role="status">
          <p>{hoverPlate.callsign}</p>
          <p>{hoverPlate.coat} coat</p>
          <p>{hoverPlate.left} blocks left</p>
        </div>
      ) : null}
    </div>
  );
}
