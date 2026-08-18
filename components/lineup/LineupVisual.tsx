"use client";

import { useEffect, useRef } from "react";
import type { LineupSnapshot, LineupSurfer } from "@/lib/lineup";

type Sprite = LineupSurfer & {
  x: number;
  y: number;
  phase: number;
  state: "idle" | "dropping" | "caught";
  drop: number;
};

export function LineupVisual({
  snapshot,
  catching,
}: {
  snapshot: LineupSnapshot;
  catching: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<Sprite[]>([]);
  const catchingRef = useRef(catching);

  catchingRef.current = catching;

  useEffect(() => {
    spritesRef.current = snapshot.surfers.map((surfer) => {
      const prior = spritesRef.current.find((sprite) => sprite.id === surfer.id);
      const pos = place(surfer);
      return {
        ...surfer,
        x: prior?.x ?? pos.x,
        y: prior?.y ?? pos.y,
        phase: prior?.phase ?? surfer.seed * Math.PI * 2,
        state: prior?.state === "dropping" ? "dropping" : "idle",
        drop: prior?.drop ?? 0,
      };
    });
  }, [snapshot.surfers]);

  useEffect(() => {
    if (!catching) return;
    spritesRef.current = spritesRef.current.map((sprite) =>
      sprite.setIndex === 0 ? { ...sprite, state: "dropping", drop: 0 } : sprite,
    );
  }, [catching]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const gfx: CanvasRenderingContext2D = maybeCtx;

    let frame = 0;
    let running = true;

    function resize() {
      const node = canvasRef.current;
      if (!node) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = node.clientWidth;
      const height = node.clientHeight;
      node.width = Math.floor(width * dpr);
      node.height = Math.floor(height * dpr);
      gfx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    function tick(now: number) {
      if (!running || !canvasRef.current) return;
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      draw(gfx, width, height, now / 1000, spritesRef.current);
      frame = window.requestAnimationFrame(tick);
    }

    frame = window.requestAnimationFrame(tick);

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="overflow-hidden border border-cyan/35 bg-black">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        <span className="text-cyan">crt://lineup</span>
        <span className={catching ? "text-sats" : "text-magenta"}>
          {catching ? "set incoming" : "waiting on the peak"}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="block h-[300px] w-full sm:h-[400px] lg:h-[460px]"
        aria-label="Live mempool lineup visualization"
      />
    </div>
  );
}

function place(surfer: LineupSurfer) {
  const band = Math.min(surfer.setIndex, 4);
  const xMin = [0.7, 0.52, 0.36, 0.2, 0.07][band];
  const xMax = [0.88, 0.68, 0.5, 0.34, 0.19][band];
  const yBase = [0.42, 0.5, 0.58, 0.66, 0.74][band];
  return {
    x: xMin + surfer.seed * (xMax - xMin),
    y: yBase + (surfer.seed - 0.5) * 0.16,
  };
}

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  sprites: Sprite[],
) {
  ctx.clearRect(0, 0, width, height);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#05060c");
  sky.addColorStop(0.55, "#08131c");
  sky.addColorStop(1, "#071018");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  drawHorizon(ctx, width, height);
  drawSea(ctx, width, height, time);
  drawWave(ctx, width, height, time);

  for (const sprite of sprites) {
    updateSprite(sprite, time);
    drawSurfer(ctx, width, height, sprite, time);
  }

  drawScan(ctx, width, height);
}

function updateSprite(sprite: Sprite, time: number) {
  sprite.phase += 0.02;
  if (sprite.state === "dropping") {
    sprite.drop = Math.min(1, sprite.drop + 0.016);
    sprite.x += (0.93 - sprite.x) * 0.045;
    sprite.y += (0.34 - sprite.y) * 0.04;
    if (sprite.drop >= 1) sprite.state = "caught";
  } else if (sprite.state === "idle") {
    sprite.y += Math.sin(time * 1.4 + sprite.phase) * 0.00035;
  }
}

function drawHorizon(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.strokeStyle = "rgba(61,255,243,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.28);
  ctx.lineTo(width, height * 0.28);
  ctx.stroke();
}

function drawSea(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
) {
  const sea = ctx.createLinearGradient(0, height * 0.28, 0, height);
  sea.addColorStop(0, "rgba(14,61,79,0.35)");
  sea.addColorStop(1, "rgba(5,8,13,0.95)");
  ctx.fillStyle = sea;
  ctx.fillRect(0, height * 0.28, width, height * 0.72);

  ctx.strokeStyle = "rgba(61,255,243,0.12)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i += 1) {
    const y = height * (0.38 + i * 0.12);
    ctx.beginPath();
    for (let x = 0; x <= width; x += 12) {
      const wobble = Math.sin(x * 0.012 + time * 1.1 + i) * 5;
      if (x === 0) ctx.moveTo(x, y + wobble);
      else ctx.lineTo(x, y + wobble);
    }
    ctx.stroke();
  }
}

function drawWave(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
) {
  const pulse = 0.85 + Math.sin(time * 1.6) * 0.08;
  const crestX = width * 0.9;
  const crestY = height * 0.32;

  ctx.save();
  ctx.globalAlpha = pulse;
  const face = ctx.createLinearGradient(width * 0.62, height * 0.2, width, height * 0.7);
  face.addColorStop(0, "rgba(61,255,243,0.05)");
  face.addColorStop(0.45, "rgba(61,255,243,0.45)");
  face.addColorStop(1, "rgba(255,122,24,0.35)");

  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.moveTo(width * 0.58, height * 0.78);
  ctx.bezierCurveTo(
    width * 0.68,
    height * 0.5,
    width * 0.74,
    height * 0.22,
    crestX,
    crestY,
  );
  ctx.bezierCurveTo(
    width * 0.97,
    height * 0.38,
    width * 0.98,
    height * 0.58,
    width * 0.94,
    height * 0.82,
  );
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(61,255,243,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width * 0.7, height * 0.48);
  ctx.quadraticCurveTo(width * 0.84, height * 0.2, width * 0.95, height * 0.4);
  ctx.stroke();

  ctx.fillStyle = "rgba(5,8,13,0.75)";
  ctx.beginPath();
  ctx.ellipse(width * 0.86, height * 0.4, 22, 14, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,122,24,0.7)";
  ctx.stroke();
  ctx.restore();
}

function drawSurfer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sprite: Sprite,
  time: number,
) {
  if (sprite.state === "caught") return;

  const bob = Math.sin(time * 2 + sprite.phase) * 3;
  const x = sprite.x * width;
  const y = sprite.y * height + bob;
  const fade = sprite.state === "dropping" ? 1 - sprite.drop : 1;
  const color =
    sprite.setIndex === 0
      ? "255,122,24"
      : sprite.setIndex === 1
        ? "61,255,243"
        : sprite.setIndex === 2
          ? "126,224,208"
          : "255,46,196";

  ctx.save();
  ctx.globalAlpha = 0.25 + fade * 0.75;

  ctx.strokeStyle = `rgba(${color},0.85)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 7, y + 4);
  ctx.lineTo(x + 8, y - 2);
  ctx.stroke();

  ctx.shadowColor = `rgba(${color},0.8)`;
  ctx.shadowBlur = 8;
  ctx.fillStyle = `rgba(${color},0.95)`;
  ctx.beginPath();
  ctx.arc(x, y - 5, 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawScan(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1);
  }
}
