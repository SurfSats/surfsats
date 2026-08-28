"use client";

import { useEffect, useRef } from "react";
import type { LineupSnapshot } from "@/lib/lineup";
import {
  feeRgb,
  particlePose,
  pickBand,
  wellVisualFromSnapshot,
} from "@/components/lineup/wellVisual";

export function WellFallback({ snapshot }: { snapshot: LineupSnapshot }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let lastHeight = snapshotRef.current.blockHeight;
    let pulseUntil = 0;
    const pointer = { x: 0.5, y: 0.5 };
    const started = performance.now();

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointer.x = (event.clientX - rect.left) / rect.width;
      pointer.y = (event.clientY - rect.top) / rect.height;
    };
    canvas.addEventListener("pointermove", onPointer);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const frame = (nowMs: number) => {
      if (!running) return;
      resize();
      const time = (nowMs - started) / 1000;
      const vis = wellVisualFromSnapshot(snapshotRef.current);
      if (
        lastHeight !== null &&
        vis.height !== null &&
        vis.height > lastHeight
      ) {
        pulseUntil = time + 0.9;
      }
      lastHeight = vis.height;
      const pulse = pulseUntil > time ? (pulseUntil - time) / 0.9 : 0;
      drawWell(ctx, canvas.width, canvas.height, vis, time, pulse, pointer);
      raf = window.requestAnimationFrame(frame);
    };

    raf = window.requestAnimationFrame(frame);
    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="well-canvas well-fallback-canvas"
      aria-hidden="true"
    />
  );
}

function drawWell(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  vis: ReturnType<typeof wellVisualFromSnapshot>,
  time: number,
  pulse: number,
  pointer: { x: number; y: number },
) {
  ctx.fillStyle = "#05060a";
  ctx.fillRect(0, 0, width, height);

  const cx = width * 0.5;
  const cy = height * 0.48;
  const scale = Math.min(width, height) * 0.5;
  const nudgeX = (pointer.x - 0.5) * scale * 0.08;
  const nudgeY = (pointer.y - 0.5) * scale * 0.08;
  const ox = cx + nudgeX;
  const oy = cy + nudgeY;
  const pool = Math.min(1, vis.vmb / 50);

  for (const band of vis.bands) {
    if (band.weight < 0.0008) continue;
    const rad = band.radius * scale;
    const widthPx = (0.14 - Math.min(band.fee / 40, 1) * 0.11) * scale;
    const inner = Math.max(0, rad - widthPx);
    const outer = rad + widthPx;
    const [r, g, b] = feeRgb(band.fee, vis.fastest);
    const alpha = Math.pow(band.weight, 0.45) * (0.28 + pool * 0.55);
    const gradient = ctx.createRadialGradient(ox, oy, inner, ox, oy, outer);
    gradient.addColorStop(0, `rgba(${ch(r)},${ch(g)},${ch(b)},0)`);
    gradient.addColorStop(0.5, `rgba(${ch(r)},${ch(g)},${ch(b)},${alpha})`);
    gradient.addColorStop(1, `rgba(${ch(r)},${ch(g)},${ch(b)},0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ox, oy, outer, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const ring of vis.rings) {
    const [r, g, b] = feeRgb(ring.fee, vis.fastest);
    ctx.strokeStyle = `rgba(${ch(r)},${ch(g)},${ch(b)},0.45)`;
    ctx.lineWidth = Math.max(1, ring.thickness * scale * 2);
    ctx.beginPath();
    ctx.arc(ox, oy, ring.radius * scale, 0, Math.PI * 2);
    ctx.stroke();
  }

  const count = vis.particleCount;
  for (let i = 0; i < count; i += 1) {
    const u = (i + 0.5) / Math.max(count, 1);
    const band = pickBand(vis, u);
    if (!band) continue;
    const pose = particlePose(i, band, time, pulse);
    const [r, g, b] = feeRgb(band.fee, vis.fastest);
    const x = ox + pose.x * scale;
    const y = oy - pose.y * scale;
    const size = 1.2 + (1 - pose.sucked) * 1.6;
    ctx.fillStyle = `rgba(${ch(r)},${ch(g)},${ch(b)},${0.55 + pool * 0.4})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  const wellR = 0.11 * scale;
  ctx.strokeStyle = `rgba(247,147,26,${0.95 - vis.fill * 0.45})`;
  ctx.lineWidth = Math.max(1.5, (2.8 - vis.fill * 1.2) * (scale / 280));
  ctx.beginPath();
  ctx.arc(ox, oy, wellR, 0, Math.PI * 2);
  ctx.stroke();

  if (vis.fill > 0.02) {
    ctx.fillStyle = `rgba(247,147,26,${0.12 + vis.fill * 0.55})`;
    ctx.beginPath();
    ctx.arc(ox, oy, wellR * (0.2 + vis.fill * 0.8), 0, Math.PI * 2);
    ctx.fill();
  }

  if (pulse > 0) {
    ctx.fillStyle = `rgba(247,147,26,${pulse * 0.28})`;
    ctx.beginPath();
    ctx.arc(ox, oy, wellR * (1.4 + (1 - pulse) * 0.8), 0, Math.PI * 2);
    ctx.fill();
  }
}

function ch(unit: number) {
  return Math.round(unit * 255);
}
