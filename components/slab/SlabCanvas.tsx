"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  SLAB_CELL_PX,
  SLAB_HEIGHT,
  SLAB_MAX_PIXELS,
  SLAB_MORTAR_PX,
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

function drawVoxel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  hex: string,
  alpha: number,
  outline: boolean,
) {
  const mortar = Math.max(1, Math.round(cell * (SLAB_MORTAR_PX / SLAB_CELL_PX)));
  const fill = Math.max(2, cell - mortar);
  const px = x * cell;
  const py = y * cell;
  const edge = Math.max(1, Math.round(fill * 0.14));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = hex;
  ctx.fillRect(px, py, fill, fill);
  ctx.fillStyle = mixHex(hex, "#ffffff", 0.34);
  ctx.fillRect(px, py, fill, edge);
  ctx.fillRect(px, py, edge, fill);
  ctx.fillStyle = mixHex(hex, "#000000", 0.4);
  ctx.fillRect(px, py + fill - edge, fill, edge);
  ctx.fillRect(px + fill - edge, py, edge, fill);
  if (outline) {
    ctx.strokeStyle = "#f4ead6";
    ctx.lineWidth = Math.max(1, Math.round(cell * 0.08));
    ctx.strokeRect(
      px + edge,
      py + edge,
      Math.max(1, fill - edge * 2),
      Math.max(1, fill - edge * 2),
    );
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
  const lastCell = useRef<SlabPixel | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [faceW, setFaceW] = useState(0);
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    cell: SlabCell | null;
  } | null>(null);

  useEffect(() => {
    const face = faceRef.current;
    if (!face) return;
    const measure = () => setFaceW(face.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(face);
    return () => observer.disconnect();
  }, []);

  const fitCell = Math.max(6, Math.floor(faceW / SLAB_WIDTH) || SLAB_CELL_PX);
  const cellPx = zoom === "2x" ? fitCell * 2 : fitCell;
  const canvasW = SLAB_WIDTH * cellPx;
  const canvasH = SLAB_HEIGHT * cellPx;

  const liveMap = new Map(
    live
      .filter((cell) => isLiveCell(cell, height))
      .map((cell) => [cellKey(cell.x, cell.y), cell]),
  );
  const selectedSet = new Set(selected.map((pixel) => cellKey(pixel.x, pixel.y)));
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

      ctx.fillStyle = "#0c0a08";
      ctx.fillRect(0, 0, cssW, cssH);

      for (let y = 0; y < SLAB_HEIGHT; y += 1) {
        for (let x = 0; x < SLAB_WIDTH; x += 1) {
          const key = cellKey(x, y);
          const liveCell = map.get(key);
          const stain = stainMap.get(key);
          const picked = pickedSet.has(key);
          const hovered = Boolean(hover && hover.x === x && hover.y === y);
          if (liveCell) {
            drawVoxel(
              ctx,
              x,
              y,
              cell,
              paletteHex(liveCell.color),
              1,
              picked || hovered,
            );
            if (wetKeys.has(key)) {
              ctx.save();
              ctx.globalAlpha = 0.28;
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
              ctx.restore();
            }
            continue;
          }
          if (picked) {
            drawVoxel(ctx, x, y, cell, paletteHex(color), 0.92, true);
            continue;
          }
          if (stain) {
            drawVoxel(
              ctx,
              x,
              y,
              cell,
              paletteHex(stain.color),
              SLAB_STAIN_OPACITY,
              hovered,
            );
            continue;
          }
          drawVoxel(ctx, x, y, cell, "#1c1814", 1, hovered);
        }
      }
    };

    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [canvasH, canvasW, color, height, hover, live, selected, stains, wetKeys, zoom]);

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

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pixel = cellFromPoint(canvas, event.clientX, event.clientY);
    if (!pixel) return;
    painting.current = true;
    lastCell.current = pixel;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // synthetic pointer events have no capture
    }
    onSelect(tryAdd([], [pixel]));
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
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
    hover?.cell && !painting.current
      ? {
          callsign: hover.cell.callsign,
          coat: hover.cell.coat,
          left: blocksRemaining(hover.cell, height),
        }
      : null;

  return (
    <div className="slab-stage">
      <div className="slab-bezel">
        <div className="slab-bezel-bar">
          <p>
            painted {counts.painted} · swell {counts.swell} · reef {counts.reef}{" "}
            · stain {counts.stain} · next{" "}
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
      {selectedSet.size > 0 ? (
        <p className="slab-select-hint">
          {selectedSet.size} px marked · drag to lay more
        </p>
      ) : (
        <p className="slab-select-hint">click-drag a stroke · {coat} coat</p>
      )}
    </div>
  );
}
