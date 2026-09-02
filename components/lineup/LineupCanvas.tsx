"use client";

import { useEffect, useRef } from "react";
import {
  formatValueSats,
  shortTxid,
  tileRgb,
  tileSide,
  txUrl,
  type LiveTx,
} from "@/lib/lineup-field";

type Tile =
  | {
      kind: "fall";
      txid: string;
      value: number;
      size: number;
      x: number;
      y: number;
      vy: number;
    }
  | {
      kind: "rest";
      txid: string;
      value: number;
      size: number;
      x: number;
      y: number;
    }
  | {
      kind: "pack";
      txid: string;
      value: number;
      size: number;
      x: number;
      y: number;
      tx: number;
      ty: number;
    };

export function LineupCanvas({
  txs,
  packing,
  reduced,
  onHover,
}: {
  txs: LiveTx[];
  packing: LiveTx[] | null;
  reduced: boolean;
  onHover: (tx: LiveTx | null, point: { x: number; y: number } | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tilesRef = useRef<Tile[]>([]);
  const knownRef = useRef(new Set<string>());
  const hoverRef = useRef<string | null>(null);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tiles = tilesRef.current;
    const known = knownRef.current;
    const incoming = new Set(txs.map((tx) => tx.txid));

    for (const tx of txs) {
      if (known.has(tx.txid)) continue;
      known.add(tx.txid);
      tiles.push(spawnTile(tx, canvas, reducedRef.current));
    }

    if (known.size > incoming.size + 40) {
      for (let i = tiles.length - 1; i >= 0; i -= 1) {
        const tile = tiles[i];
        if (tile.kind === "pack") continue;
        if (incoming.has(tile.txid)) continue;
        tiles.splice(i, 1);
        known.delete(tile.txid);
      }
    }
  }, [txs]);

  useEffect(() => {
    if (!packing || packing.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tiles = tilesRef.current;
    const box = canvas.getBoundingClientRect();
    const destX = box.width * 0.5;
    const destY = box.height + 24;
    const want = new Set(packing.map((tx) => tx.txid));
    const present = new Set(tiles.map((tile) => tile.txid));

    for (let i = 0; i < tiles.length; i += 1) {
      const tile = tiles[i];
      if (!want.has(tile.txid)) continue;
      tiles[i] = {
        kind: "pack",
        txid: tile.txid,
        value: tile.value,
        size: tile.size,
        x: tile.x,
        y: tile.y,
        tx: destX - tile.size / 2,
        ty: destY,
      };
    }

    if (!reducedRef.current) {
      for (const tx of packing) {
        if (present.has(tx.txid)) continue;
        const size = tileSide(tx.value, 7, 42);
        tiles.push({
          kind: "pack",
          txid: tx.txid,
          value: tx.value,
          size,
          x: Math.random() * Math.max(8, box.width - size),
          y: Math.random() * Math.max(8, box.height * 0.45),
          tx: destX - size / 2,
          ty: destY,
        });
      }
    }
  }, [packing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let running = true;
    let lastW = 0;
    let lastH = 0;

    function measure() {
      const node = canvasRef.current;
      if (!node) return { w: 0, h: 0, dpr: 1 };
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = node.clientWidth;
      const h = node.clientHeight;
      if (node.width !== Math.round(w * dpr) || node.height !== Math.round(h * dpr)) {
        node.width = Math.round(w * dpr);
        node.height = Math.round(h * dpr);
      }
      return { w, h, dpr };
    }

    function step() {
      if (!running || !ctx) return;
      const { w, h, dpr } = measure();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#07080b";
      ctx.fillRect(0, 0, w, h);
      if (w < 40 || h < 40) {
        frame = window.requestAnimationFrame(step);
        return;
      }

      const tiles = tilesRef.current;
      const floor = h - 8;
      const reducedMotion = reducedRef.current;
      if (w !== lastW || h !== lastH) {
        lastW = w;
        lastH = h;
        reflowTiles(tiles, w, floor);
      }

      for (let i = 0; i < tiles.length; i += 1) {
        const tile = tiles[i];
        if (tile.kind === "fall") {
          if (reducedMotion) {
            tiles[i] = land(tile, tiles, w, floor);
            continue;
          }
          tile.vy += 0.38;
          tile.y += tile.vy;
          const hit = restHit(tile, tiles, i);
          if (tile.y + tile.size >= floor) {
            tile.y = floor - tile.size;
            tiles[i] = { ...tile, kind: "rest" };
          } else if (hit) {
            tile.y = hit.y - tile.size;
            tiles[i] = { ...tile, kind: "rest" };
          }
        } else if (tile.kind === "pack") {
          if (reducedMotion) {
            tiles.splice(i, 1);
            i -= 1;
            continue;
          }
          tile.x += (tile.tx - tile.x) * 0.14;
          tile.y += (tile.ty - tile.y) * 0.14;
          if (tile.y > h + 8) {
            tiles.splice(i, 1);
            i -= 1;
          }
        }
      }

      for (const tile of tiles) {
        const [r, g, b] = tileRgb(tile.value);
        const hot = hoverRef.current === tile.txid;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.globalAlpha = tile.kind === "pack" ? 0.85 : hot ? 1 : 0.92;
        ctx.fillRect(tile.x, tile.y, tile.size - 1, tile.size - 1);
        if (hot) {
          ctx.strokeStyle = "#3dfff3";
          ctx.lineWidth = 1;
          ctx.strokeRect(tile.x + 0.5, tile.y + 0.5, tile.size - 2, tile.size - 2);
        }
      }
      ctx.globalAlpha = 1;
      frame = window.requestAnimationFrame(step);
    }

    frame = window.requestAnimationFrame(step);
    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="lineup-canvas"
      aria-label="Unconfirmed transaction field"
      onMouseMove={(event) => {
        const hit = hitTile(tilesRef.current, event.nativeEvent.offsetX, event.nativeEvent.offsetY);
        hoverRef.current = hit?.txid ?? null;
        onHover(
          hit ? { txid: hit.txid, value: hit.value } : null,
          hit ? { x: event.clientX, y: event.clientY } : null,
        );
      }}
      onMouseLeave={() => {
        hoverRef.current = null;
        onHover(null, null);
      }}
      onClick={() => {
        const id = hoverRef.current;
        if (!id) return;
        window.open(txUrl(id), "_blank", "noopener,noreferrer");
      }}
    />
  );
}

function spawnTile(tx: LiveTx, canvas: HTMLCanvasElement, reduced: boolean): Tile {
  const box = canvas.getBoundingClientRect();
  const size = tileSide(tx.value, 7, Math.min(52, Math.max(28, box.width * 0.08)));
  const x = 6 + Math.random() * Math.max(4, box.width - size - 12);
  if (reduced) {
    return land(
      { kind: "fall", txid: tx.txid, value: tx.value, size, x, y: 0, vy: 0 },
      [],
      box.width,
      box.height - 8,
    );
  }
  return {
    kind: "fall",
    txid: tx.txid,
    value: tx.value,
    size,
    x,
    y: -size - Math.random() * 40,
    vy: 0.2 + Math.random() * 0.6,
  };
}

function land(
  tile: { txid: string; value: number; size: number; x: number },
  tiles: Tile[],
  width: number,
  floor: number,
): Extract<Tile, { kind: "rest" }> {
  const x = Math.max(4, Math.min(width - tile.size - 4, tile.x));
  let y = floor - tile.size;
  for (const other of tiles) {
    if (other.kind === "pack") continue;
    if (x + tile.size <= other.x || x >= other.x + other.size) continue;
    const top = other.y - tile.size;
    if (top < y) y = top;
  }
  return {
    kind: "rest",
    txid: tile.txid,
    value: tile.value,
    size: tile.size,
    x,
    y: Math.max(0, y),
  };
}

function reflowTiles(tiles: Tile[], width: number, floor: number) {
  const placed: Tile[] = [];
  for (let i = 0; i < tiles.length; i += 1) {
    const tile = tiles[i];
    if (tile.kind === "pack") continue;
    const landed = land(tile, placed, width, floor);
    tiles[i] = landed;
    placed.push(landed);
  }
}

function restHit(tile: Tile, tiles: Tile[], index: number) {
  for (let i = 0; i < tiles.length; i += 1) {
    if (i === index) continue;
    const other = tiles[i];
    if (other.kind !== "rest") continue;
    if (
      tile.x < other.x + other.size &&
      tile.x + tile.size > other.x &&
      tile.y < other.y + other.size &&
      tile.y + tile.size > other.y
    ) {
      return other;
    }
  }
  return null;
}

function hitTile(tiles: Tile[], x: number, y: number) {
  for (let i = tiles.length - 1; i >= 0; i -= 1) {
    const tile = tiles[i];
    if (tile.kind === "pack") continue;
    if (
      x >= tile.x &&
      x <= tile.x + tile.size &&
      y >= tile.y &&
      y <= tile.y + tile.size
    ) {
      return tile;
    }
  }
  return null;
}

export function hoverCopy(tx: LiveTx) {
  return `${formatValueSats(tx.value)} · ${shortTxid(tx.txid)}`;
}
