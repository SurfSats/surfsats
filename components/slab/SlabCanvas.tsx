"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
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
  const painting = useRef(false);
  const lastCell = useRef<SlabPixel | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    cell: SlabCell | null;
  } | null>(null);

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
      const cellW = cssW / SLAB_WIDTH;
      const cellH = cssH / SLAB_HEIGHT;
      const map = new Map(
        live
          .filter((cell) => isLiveCell(cell, height))
          .map((cell) => [cellKey(cell.x, cell.y), cell]),
      );

      ctx.fillStyle = "#12100e";
      ctx.fillRect(0, 0, cssW, cssH);

      for (const stain of stains) {
        ctx.globalAlpha = SLAB_STAIN_OPACITY;
        ctx.fillStyle = paletteHex(stain.color);
        ctx.fillRect(stain.x * cellW, stain.y * cellH, cellW, cellH);
      }
      ctx.globalAlpha = 1;

      for (const cell of map.values()) {
        const key = cellKey(cell.x, cell.y);
        ctx.fillStyle = paletteHex(cell.color);
        ctx.fillRect(cell.x * cellW, cell.y * cellH, cellW, cellH);
        if (wetKeys.has(key)) {
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(cell.x * cellW, cell.y * cellH, cellW, cellH);
          ctx.globalAlpha = 1;
        }
      }

      ctx.globalAlpha = 0.85;
      ctx.fillStyle = paletteHex(color);
      for (const pixel of selected) {
        ctx.fillRect(pixel.x * cellW, pixel.y * cellH, cellW, cellH);
      }
      ctx.globalAlpha = 1;

      if (hover && !painting.current) {
        ctx.strokeStyle = "rgba(239, 230, 212, 0.85)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          hover.x * cellW + 0.4,
          hover.y * cellH + 0.4,
          Math.max(0.5, cellW - 0.8),
          Math.max(0.5, cellH - 0.8),
        );
      }
    };

    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [color, height, hover, live, selected, stains, wetKeys]);

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
        <p>
          painted {counts.painted} · swell {counts.swell} · reef {counts.reef} ·
          stain {counts.stain} · next{" "}
          {counts.nextExpiry == null ? "—" : `${counts.nextExpiry} blocks`}
        </p>
        <div className="slab-face">
          <canvas
            ref={canvasRef}
            className="slab-canvas"
            width={SLAB_WIDTH}
            height={SLAB_HEIGHT}
            aria-label="the slab"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={() => {
              if (!painting.current) setHover(null);
            }}
          />
          {hoverPlate ? (
            <div className="slab-hover" role="status">
              <p>{hoverPlate.callsign}</p>
              <p>{hoverPlate.coat} coat</p>
              <p>{hoverPlate.left} blocks left</p>
            </div>
          ) : null}
        </div>
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
