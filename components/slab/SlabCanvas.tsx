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
  cell: number,
  originX: number,
  originY: number,
) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0 || cell <= 0) return null;
  const x = Math.floor((clientX - rect.left - originX) / cell);
  const y = Math.floor((clientY - rect.top - originY) / cell);
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

type CubeKind = "void" | "live" | "stain" | "ghost";

type CubeOpts = {
  kind: CubeKind;
  colorId: SlabColor;
  outline: boolean;
  reef: boolean;
  wet: number;
  punch: number;
  occN?: boolean;
  occE?: boolean;
  occS?: boolean;
  occW?: boolean;
};

function grainFor(color: SlabColor, kind: CubeKind) {
  if (kind === "void") return 0.55;
  if (kind === "stain") return 0.22;
  if (color === "chrome" || color === "bone") return 0.1;
  if (color === "ice" || color === "cyan" || color === "foam") return 0.16;
  if (color === "moss" || color === "rust" || color === "tar") return 0.42;
  if (color === "night" || color === "void") return 0.5;
  return 0.22;
}

const GRAIN_TILE = 48;
const grainTiles = new Map<string, HTMLCanvasElement>();

function grainTile(color: SlabColor, kind: CubeKind) {
  const key = `${kind}:${color}`;
  const hit = grainTiles.get(key);
  if (hit) return hit;
  const tile = document.createElement("canvas");
  tile.width = GRAIN_TILE;
  tile.height = GRAIN_TILE;
  const g = tile.getContext("2d");
  if (g) {
    const amount = grainFor(color, kind);
    const seed =
      color.charCodeAt(0) * 97 + color.charCodeAt(color.length - 1) * 13 +
      (kind === "void" ? 3 : kind === "stain" ? 7 : 1);
    const step = 2;
    for (let y = 0; y < GRAIN_TILE; y += step) {
      for (let x = 0; x < GRAIN_TILE; x += step) {
        const n = hash01(seed + x * 13, seed + y * 17);
        if (n < 1 - amount) continue;
        g.fillStyle = n > 0.88 ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.22)";
        g.fillRect(x, y, step, step);
      }
    }
  }
  grainTiles.set(key, tile);
  return tile;
}

function stampGrain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: SlabColor,
  kind: CubeKind,
  gx: number,
  gy: number,
) {
  if (w <= 0 || h <= 0) return;
  const tile = grainTile(color, kind);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const ox = x - (((gx * 19) % GRAIN_TILE) + GRAIN_TILE) % GRAIN_TILE;
  const oy = y - (((gy * 13) % GRAIN_TILE) + GRAIN_TILE) % GRAIN_TILE;
  for (let ty = oy; ty < y + h; ty += GRAIN_TILE) {
    for (let tx = ox; tx < x + w; tx += GRAIN_TILE) {
      ctx.drawImage(tile, tx, ty);
    }
  }
  ctx.restore();
}

function depthRatio(opts: CubeOpts) {
  if (opts.kind === "stain") return 0.1;
  if (opts.kind === "void") return 0.18;
  if (opts.reef) return 0.34;
  return 0.18;
}

function occupiedNeighbors(x: number, y: number, occ: Set<string>) {
  return {
    occN: occ.has(cellKey(x, y - 1)),
    occE: occ.has(cellKey(x + 1, y)),
    occS: occ.has(cellKey(x, y + 1)),
    occW: occ.has(cellKey(x - 1, y)),
  };
}

function drawDropShadow(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  S: number,
  originX: number,
  originY: number,
  occ: Set<string>,
) {
  const x = originX + gx * S;
  const y = originY + gy * S;
  const band = Math.max(2, Math.round(S * 0.22));
  ctx.save();
  ctx.fillStyle = "#050403";
  if (!occ.has(cellKey(gx + 1, gy))) {
    ctx.globalAlpha = 0.22;
    ctx.fillRect(x + S, y + band * 0.35, band, S - band * 0.2);
  }
  if (!occ.has(cellKey(gx, gy + 1))) {
    ctx.globalAlpha = 0.22;
    ctx.fillRect(x + band * 0.2, y + S, S - band * 0.15, band);
  }
  if (!occ.has(cellKey(gx + 1, gy + 1))) {
    ctx.globalAlpha = 0.34;
    ctx.fillRect(x + S, y + S, band * 1.15, band * 1.15);
  }
  ctx.restore();
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

const VOID_COBBLE = "#2b261f";
const STROKE_FLUSH_MS = 80;

function wallLayout(paneW: number, paneH: number, zoom: Zoom) {
  const byWidth = Math.floor(paneW / SLAB_WIDTH);
  const byHeight = Math.floor(paneH / SLAB_HEIGHT);
  const fitCell = Math.max(
    8,
    byWidth > 0 && byWidth * SLAB_HEIGHT <= paneH
      ? byWidth
      : byHeight > 0
        ? byHeight
        : SLAB_CELL_PX,
  );
  const cell = zoom === "2x" ? fitCell * 2 : fitCell;
  const gridW = SLAB_WIDTH * cell;
  const gridH = SLAB_HEIGHT * cell;
  if (zoom === "2x") {
    return { cell, ox: 0, oy: 0, canvasW: gridW, canvasH: gridH };
  }
  return {
    cell,
    ox: Math.floor((paneW - gridW) / 2),
    oy: Math.floor((paneH - gridH) / 2),
    canvasW: Math.max(1, paneW),
    canvasH: Math.max(1, paneH),
  };
}

function cobbleKey(
  cssW: number,
  cssH: number,
  dpr: number,
  cell: number,
  ox: number,
  oy: number,
) {
  return `${cssW}|${cssH}|${dpr}|${cell}|${ox}|${oy}`;
}

function paintCobbleLayer(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  cell: number,
  ox: number,
  oy: number,
) {
  ctx.fillStyle = VOID_COBBLE;
  ctx.fillRect(0, 0, cssW, cssH);
  const sky = ctx.createLinearGradient(0, 0, cssW * 0.4, cssH * 0.35);
  sky.addColorStop(0, "rgba(255, 214, 150, 0.07)");
  sky.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cssW, cssH);
  const col0 = Math.floor(-ox / cell) - 1;
  const col1 = Math.ceil((cssW - ox) / cell) + 1;
  const row0 = Math.floor(-oy / cell) - 1;
  const row1 = Math.ceil((cssH - oy) / cell) + 1;
  for (let y = row0; y < row1; y += 1) {
    for (let x = col0; x < col1; x += 1) {
      drawCube(
        ctx,
        x,
        y,
        cell,
        VOID_COBBLE,
        {
          kind: "void",
          colorId: "tar",
          outline: false,
          reef: false,
          wet: 0,
          punch: 0,
        },
        ox,
        oy,
      );
    }
  }
}

function drawCube(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  S: number,
  hex: string,
  opts: CubeOpts,
  originX: number,
  originY: number,
) {
  const inset = opts.punch * Math.max(2, Math.round(S * 0.22));
  const ox = originX + gx * S + inset * 0.35;
  const oy = originY + gy * S + inset * 0.65;
  const size = S - inset;
  const dd = Math.max(2, Math.round(size * depthRatio(opts)));
  const fx = ox;
  const fy = oy + dd;
  const fw = size - dd;
  const fh = size - dd;
  const stain = opts.kind === "stain";
  const voided = opts.kind === "void";
  const occN = Boolean(opts.occN);
  const occE = Boolean(opts.occE);
  const occS = Boolean(opts.occS);
  const occW = Boolean(opts.occW);
  const isolated = !voided && !stain && !occN && !occE && !occS && !occW;
  const topMix = stain ? 0 : voided ? 0.16 : opts.reef ? 0.58 : 0.38;
  const sideMix = stain ? 0.62 : voided ? 0.52 : opts.reef ? 0.4 : 0.46;
  const frontMix = stain ? 0.34 : voided ? 0.18 : 0.05;
  const topC = stain
    ? mixHex(hex, "#050403", 0.48)
    : mixHex(hex, "#fff6d8", occN ? topMix * 0.35 : topMix);
  const sideC = mixHex(hex, "#050403", occE ? Math.min(0.72, sideMix + 0.18) : sideMix);
  const frontC = mixHex(hex, "#000000", frontMix);
  const sunC = mixHex(frontC, "#fff1c8", voided ? 0.08 : isolated ? 0.28 : 0.16);
  const alpha = stain ? SLAB_STAIN_OPACITY : opts.kind === "ghost" ? 0.88 : 1;
  const band = Math.max(1, Math.round(Math.min(fw, fh) * 0.18));

  ctx.save();
  ctx.globalAlpha = alpha;

  if (!occE || opts.reef) {
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
  }

  if (!stain) {
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
    stampGrain(ctx, fx + dd, oy, fw, dd, opts.colorId, opts.kind, gx, gy - 1);
  } else {
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
  }

  ctx.fillStyle = frontC;
  ctx.fillRect(fx, fy, fw, fh);

  if (occW) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(fx, fy, band, fh);
  } else {
    ctx.fillStyle = sunC;
    ctx.fillRect(fx, fy, Math.max(1, Math.round(fw * (isolated ? 0.18 : 0.12))), fh);
  }
  if (occN) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(fx, fy, fw, band);
  } else if (!stain && !voided) {
    ctx.fillStyle = mixHex(frontC, "#fff6d8", isolated ? 0.55 : 0.22);
    ctx.fillRect(fx, fy, fw, Math.max(1, Math.round(band * (isolated ? 0.85 : 0.55))));
  }
  if (occE) {
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.fillRect(fx + fw - band, fy, band, fh);
  }
  if (occS) {
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.fillRect(fx, fy + fh - band, fw, band);
  }

  stampGrain(ctx, fx, fy, fw, fh, opts.colorId, opts.kind, gx, gy);

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
    ctx.globalAlpha = alpha * 0.22;
    fillPoly(
      ctx,
      [
        [fx, fy],
        [fx + dd, oy],
        [fx + fw + dd, oy],
        [fx + fw, fy],
      ],
      "rgba(200, 240, 255, 0.35)",
    );
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
  const cobbleRef = useRef<HTMLCanvasElement | null>(null);
  const cobbleKeyRef = useRef("");
  const painting = useRef(false);
  const panning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, sl: 0, st: 0 });
  const lastCell = useRef<SlabPixel | null>(null);
  const strokeRef = useRef<SlabPixel[]>(selected);
  const hoverRef = useRef<{
    x: number;
    y: number;
    cell: SlabCell | null;
  } | null>(null);
  const spaceHeld = useRef(false);
  const rafRef = useRef(0);
  const flushTimer = useRef(0);
  const lastFlushAt = useRef(0);
  const paintNowRef = useRef<() => void>(() => {});
  const onSelectRef = useRef(onSelect);
  const coatRef = useRef(coat);
  const heightRef = useRef(height);
  const liveMapRef = useRef<Map<string, SlabCell>>(new Map());
  onSelectRef.current = onSelect;
  coatRef.current = coat;
  heightRef.current = height;
  if (!painting.current) strokeRef.current = selected;
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

  const layout = wallLayout(faceW, faceH, zoom);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const { canvasW, canvasH } = layout;

  const liveMap = new Map(
    live
      .filter((cell) => isLiveCell(cell, height))
      .map((cell) => [cellKey(cell.x, cell.y), cell]),
  );
  liveMapRef.current = liveMap;
  const counts = bezelCounts({ live, stains, currentHeight: height });
  const worldRef = useRef({ live, stains, height, coat, color, wetKeys, punchT });
  worldRef.current = { live, stains, height, coat, color, wetKeys, punchT };

  function schedulePaint() {
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0;
      paintNowRef.current();
    });
  }

  function flushStroke(force: boolean) {
    const now = performance.now();
    if (!force && now - lastFlushAt.current < STROKE_FLUSH_MS) return;
    lastFlushAt.current = now;
    onSelectRef.current(strokeRef.current.map((pixel) => ({ ...pixel })));
  }

  function stopFlushClock() {
    if (flushTimer.current) {
      window.clearInterval(flushTimer.current);
      flushTimer.current = 0;
    }
  }

  function startFlushClock() {
    lastFlushAt.current = performance.now();
    if (flushTimer.current) return;
    flushTimer.current = window.setInterval(() => {
      if (!painting.current) return;
      flushStroke(false);
    }, STROKE_FLUSH_MS);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ensureCobble = (
      cssW: number,
      cssH: number,
      dpr: number,
      cell: number,
      ox: number,
      oy: number,
    ) => {
      const key = cobbleKey(cssW, cssH, dpr, cell, ox, oy);
      const pw = Math.floor(cssW * dpr);
      const ph = Math.floor(cssH * dpr);
      let off = cobbleRef.current;
      if (off && cobbleKeyRef.current === key && off.width === pw && off.height === ph) {
        return off;
      }
      if (!off) off = document.createElement("canvas");
      if (off.width !== pw || off.height !== ph) {
        off.width = pw;
        off.height = ph;
      }
      const offCtx = off.getContext("2d");
      if (!offCtx) return null;
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintCobbleLayer(offCtx, cssW, cssH, cell, ox, oy);
      cobbleRef.current = off;
      cobbleKeyRef.current = key;
      return off;
    };

    const paintNow = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW <= 0 || cssH <= 0) return;
      const { cell, ox, oy } = layoutRef.current;
      if (cell <= 0) return;
      const pw = Math.floor(cssW * dpr);
      const ph = Math.floor(cssH * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      const cobble = ensureCobble(cssW, cssH, dpr, cell, ox, oy);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      if (cobble) ctx.drawImage(cobble, 0, 0);
      else {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        paintCobbleLayer(ctx, cssW, cssH, cell, ox, oy);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const world = worldRef.current;
      const map = liveMapRef.current;
      const picked = strokeRef.current;
      const pickedSet = new Set(picked.map((pixel) => cellKey(pixel.x, pixel.y)));
      const occ = new Set<string>(map.keys());
      for (const stain of world.stains) occ.add(cellKey(stain.x, stain.y));
      for (const pixel of picked) occ.add(cellKey(pixel.x, pixel.y));
      const hoverCell = painting.current ? null : hoverRef.current;
      const punch = punchAmount(world.punchT);
      const wet = wetAmount(world.punchT);
      const lives = world.live
        .filter((item) => isLiveCell(item, world.height))
        .sort((a, b) => a.y - b.y || a.x - b.x);

      for (const liveCell of lives) {
        drawDropShadow(ctx, liveCell.x, liveCell.y, cell, ox, oy, occ);
      }

      for (const stain of world.stains) {
        const key = cellKey(stain.x, stain.y);
        if (map.has(key) || pickedSet.has(key)) continue;
        const hovered = Boolean(
          hoverCell && hoverCell.x === stain.x && hoverCell.y === stain.y,
        );
        drawCube(
          ctx,
          stain.x,
          stain.y,
          cell,
          paletteHex(stain.color),
          {
            kind: "stain",
            colorId: stain.color,
            outline: hovered,
            reef: false,
            wet: 0,
            punch: 0.35,
            ...occupiedNeighbors(stain.x, stain.y, occ),
          },
          ox,
          oy,
        );
      }

      for (const liveCell of lives) {
        const key = cellKey(liveCell.x, liveCell.y);
        const hovered = Boolean(
          hoverCell && hoverCell.x === liveCell.x && hoverCell.y === liveCell.y,
        );
        const settling = world.wetKeys.has(key);
        drawCube(
          ctx,
          liveCell.x,
          liveCell.y,
          cell,
          paletteHex(liveCell.color),
          {
            kind: "live",
            colorId: liveCell.color,
            outline: pickedSet.has(key) || hovered,
            reef: liveCell.coat === "reef",
            wet: settling ? wet : 0,
            punch: settling ? punch : 0,
            ...occupiedNeighbors(liveCell.x, liveCell.y, occ),
          },
          ox,
          oy,
        );
      }

      const ghosts = [...picked].sort((a, b) => a.y - b.y || a.x - b.x);
      for (const pixel of ghosts) {
        const key = cellKey(pixel.x, pixel.y);
        if (map.has(key)) continue;
        drawCube(
          ctx,
          pixel.x,
          pixel.y,
          cell,
          paletteHex(world.color),
          {
            kind: "ghost",
            colorId: world.color,
            outline: true,
            reef: world.coat === "reef",
            wet: 0,
            punch: 0,
            ...occupiedNeighbors(pixel.x, pixel.y, occ),
          },
          ox,
          oy,
        );
      }

      if (
        hoverCell &&
        !map.has(cellKey(hoverCell.x, hoverCell.y)) &&
        !pickedSet.has(cellKey(hoverCell.x, hoverCell.y)) &&
        !world.stains.some(
          (stain) => stain.x === hoverCell.x && stain.y === hoverCell.y,
        )
      ) {
        drawCube(
          ctx,
          hoverCell.x,
          hoverCell.y,
          cell,
          VOID_COBBLE,
          {
            kind: "void",
            colorId: "tar",
            outline: true,
            reef: false,
            wet: 0,
            punch: 0,
          },
          ox,
          oy,
        );
      }
    };

    paintNowRef.current = paintNow;
    paintNow();
    const observer = new ResizeObserver(() => {
      cobbleKeyRef.current = "";
      paintNow();
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      if (flushTimer.current) window.clearInterval(flushTimer.current);
      flushTimer.current = 0;
      paintNowRef.current = () => {};
    };
  }, []);

  useEffect(() => {
    schedulePaint();
  }, [
    canvasH,
    canvasW,
    coat,
    color,
    height,
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
    const map = liveMapRef.current;
    const nextCoat = coatRef.current;
    const nextHeight = heightRef.current;
    for (const pixel of next) {
      const key = cellKey(pixel.x, pixel.y);
      if (seen.has(key)) continue;
      const existing = map.get(key);
      if (!canOverwrite(nextCoat, existing, nextHeight)) continue;
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
    const { cell, ox, oy } = layoutRef.current;
    const pixel = cellFromPoint(
      canvas,
      event.clientX,
      event.clientY,
      cell,
      ox,
      oy,
    );
    if (!pixel) return;
    const added = tryAdd([], [pixel]);
    if (added.length === 0 && zoom === "2x") {
      startPan(event);
      return;
    }
    painting.current = true;
    panning.current = false;
    lastCell.current = pixel;
    hoverRef.current = null;
    setHover(null);
    strokeRef.current = added;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // synthetic pointer events have no capture
    }
    startFlushClock();
    schedulePaint();
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
    const { cell, ox, oy } = layoutRef.current;
    const pixel = cellFromPoint(
      canvas,
      event.clientX,
      event.clientY,
      cell,
      ox,
      oy,
    );
    if (!pixel) {
      if (!painting.current) {
        hoverRef.current = null;
        setHover(null);
        schedulePaint();
      }
      return;
    }
    const existing = liveMapRef.current.get(cellKey(pixel.x, pixel.y)) ?? null;
    if (!painting.current) {
      hoverRef.current = { x: pixel.x, y: pixel.y, cell: existing };
      schedulePaint();
      setHover((prev) => {
        if (!existing && !prev?.cell) return prev;
        if (
          existing &&
          prev?.cell &&
          prev.x === pixel.x &&
          prev.y === pixel.y
        ) {
          return prev;
        }
        return existing ? { x: pixel.x, y: pixel.y, cell: existing } : null;
      });
      return;
    }
    const from = lastCell.current ?? pixel;
    lastCell.current = pixel;
    const next = tryAdd(strokeRef.current, linePixels(from, pixel));
    if (next.length === strokeRef.current.length) return;
    strokeRef.current = next;
    schedulePaint();
  }

  function onPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const wasPainting = painting.current;
    painting.current = false;
    panning.current = false;
    lastCell.current = null;
    stopFlushClock();
    if (wasPainting) flushStroke(true);
    schedulePaint();
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
          style={
            zoom === "fit"
              ? { width: "100%", height: "100%" }
              : { width: canvasW, height: canvasH }
          }
          aria-label="the slab"
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => {
            if (painting.current) return;
            hoverRef.current = null;
            setHover(null);
            schedulePaint();
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
