"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LineupSnapshot, LineupSurfer } from "@/lib/lineup";
import {
  formatBtc,
  formatVsize,
  mempoolUrl,
  shortTxid,
} from "@/lib/lineup";
import { formatBlockAge } from "@/lib/timechain";

type Sprite = LineupSurfer & {
  x: number;
  y: number;
  tx: number;
  ty: number;
  phase: number;
  state: "idle" | "dropping" | "caught";
  drop: number;
};

type Hit = { id: string; x: number; y: number; r: number };

export function LineupVisual({
  snapshot,
  catching,
}: {
  snapshot: LineupSnapshot;
  catching: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<Sprite[]>([]);
  const hitsRef = useRef<Hit[]>([]);
  const hoverIdRef = useRef<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const pack = useMemo(
    () => [...snapshot.ghosts, ...snapshot.surfers],
    [snapshot.ghosts, snapshot.surfers],
  );

  const selected =
    snapshot.surfers.find((surfer) => surfer.id === selectedId) ??
    snapshot.surfers.find((surfer) => surfer.id === hoverId) ??
    null;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const ranked = [...snapshot.surfers].sort((a, b) => b.feeRate - a.feeRate);
    spritesRef.current = pack.map((surfer) => {
      const prior = spritesRef.current.find((sprite) => sprite.id === surfer.id);
      const pos = place(surfer, ranked);
      return {
        ...surfer,
        x: prior?.x ?? pos.x,
        y: prior?.y ?? pos.y,
        tx: pos.x,
        ty: pos.y,
        phase: prior?.phase ?? surfer.seed * Math.PI * 2,
        state: prior?.state === "dropping" ? "dropping" : "idle",
        drop: prior?.drop ?? 0,
      };
    });
  }, [pack, snapshot.surfers]);

  useEffect(() => {
    if (!catching) return;
    spritesRef.current = spritesRef.current.map((sprite) =>
      sprite.setIndex === 0 && sprite.interactive
        ? { ...sprite, state: "dropping", drop: 0 }
        : sprite,
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
      node.width = Math.floor(node.clientWidth * dpr);
      node.height = Math.floor(node.clientHeight * dpr);
      gfx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    function tick(stamp: number) {
      if (!running || !canvasRef.current) return;
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      hitsRef.current = draw(
        gfx,
        width,
        height,
        stamp / 1000,
        spritesRef.current,
        hoverIdRef.current,
      );
      frame = window.requestAnimationFrame(tick);
    }

    frame = window.requestAnimationFrame(tick);

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  function pick(event: { clientX: number; clientY: number }) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let best: Hit | null = null;
    let bestDist = Infinity;
    for (const hit of hitsRef.current) {
      const dx = hit.x - x;
      const dy = hit.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist <= hit.r && dist < bestDist) {
        best = hit;
        bestDist = dist;
      }
    }
    return best;
  }

  return (
    <div className="overflow-hidden border border-cyan/35 bg-black">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        <span className="text-cyan">crt://lineup</span>
        <span className={catching ? "text-sats" : "text-muted"}>
          {catching ? "set incoming" : "inspect a body · click for mempool"}
        </span>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="block h-[320px] w-full cursor-crosshair sm:h-[420px] lg:h-[500px]"
          aria-label="Interactive mempool lineup. Hover or tap a surfer for transaction details."
          onPointerMove={(event) => {
            const hit = pick(event);
            hoverIdRef.current = hit?.id ?? null;
            setHoverId(hit?.id ?? null);
          }}
          onPointerLeave={() => {
            hoverIdRef.current = null;
            setHoverId(null);
          }}
          onClick={(event) => {
            const hit = pick(event);
            if (!hit) {
              setSelectedId(null);
              return;
            }
            if (selectedId === hit.id) {
              const txid = snapshot.surfers.find((item) => item.id === hit.id)?.txid;
              if (txid) window.open(mempoolUrl(txid), "_blank", "noreferrer");
              return;
            }
            setSelectedId(hit.id);
          }}
        />

        <p className="pointer-events-none absolute left-3 top-3 font-mono text-[10px] uppercase tracking-[0.16em] text-magenta/80">
          outside
        </p>
        <p className="pointer-events-none absolute right-3 top-3 font-mono text-[10px] uppercase tracking-[0.16em] text-sats">
          takeoff
        </p>

        {selected ? (
          <InspectPanel
            surfer={selected}
            now={now}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

function InspectPanel({
  surfer,
  now,
  onClose,
}: {
  surfer: LineupSurfer;
  now: number;
  onClose: () => void;
}) {
  const txid = surfer.txid;
  const wait =
    surfer.firstSeen !== null ? formatBlockAge(now / 1000 - surfer.firstSeen) : null;

  return (
    <aside className="absolute bottom-3 left-3 right-3 max-w-md border border-cyan/40 bg-background/95 p-4 shadow-[4px_4px_0_var(--color-magenta)] sm:right-auto">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-sats">
          {"//"} inspect
        </p>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-cyan"
        >
          close
        </button>
      </div>
      {txid ? (
        <a
          href={mempoolUrl(txid)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block font-mono text-sm text-cyan glitch-hover hover:text-sats"
        >
          {shortTxid(txid)}
        </a>
      ) : (
        <p className="mt-3 font-mono text-sm text-muted">sample body · no txid</p>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-[0.12em]">
        <div>
          <dt className="text-muted">fee_rate</dt>
          <dd className="mt-0.5 text-sats">{surfer.feeRate.toFixed(2)} sat/vB</dd>
        </div>
        <div>
          <dt className="text-muted">fee</dt>
          <dd className="mt-0.5 text-foreground">{Math.round(surfer.fee)} sats</dd>
        </div>
        <div>
          <dt className="text-muted">size</dt>
          <dd className="mt-0.5 text-foreground">
            {surfer.vsize !== null ? formatVsize(surfer.vsize) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">value</dt>
          <dd className="mt-0.5 text-foreground">
            {surfer.value !== null ? formatBtc(surfer.value) : "—"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted">in_the_water</dt>
          <dd className="mt-0.5 text-cyan">{wait ?? "unknown"}</dd>
        </div>
      </dl>
      {txid ? (
        <a
          href={mempoolUrl(txid)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex font-mono text-[11px] uppercase tracking-[0.14em] text-sats hover:text-cyan"
        >
          open on mempool.space -&gt;
        </a>
      ) : null}
    </aside>
  );
}

function place(surfer: LineupSurfer, ranked: LineupSurfer[]) {
  if (surfer.interactive && ranked.length > 0) {
    const index = Math.max(
      0,
      ranked.findIndex((item) => item.id === surfer.id),
    );
    const t = ranked.length === 1 ? 1 : 1 - index / (ranked.length - 1);
    const arc = Math.sin(t * Math.PI) * 0.08;
    return {
      x: 0.14 + t * 0.7,
      y: 0.62 - t * 0.18 + (surfer.seed - 0.5) * 0.1 - arc,
    };
  }

  const band = Math.min(surfer.setIndex, 4);
  const xMin = [0.68, 0.5, 0.34, 0.2, 0.08][band];
  const xMax = [0.84, 0.64, 0.48, 0.32, 0.18][band];
  const yBase = [0.46, 0.54, 0.62, 0.7, 0.76][band];
  return {
    x: xMin + surfer.seed * (xMax - xMin),
    y: yBase + (surfer.seed - 0.5) * 0.1,
  };
}

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  sprites: Sprite[],
  hoverId: string | null,
): Hit[] {
  ctx.clearRect(0, 0, width, height);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#04050a");
  sky.addColorStop(0.42, "#08141d");
  sky.addColorStop(1, "#05080d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const moon = ctx.createRadialGradient(width * 0.18, height * 0.12, 2, width * 0.18, height * 0.12, 70);
  moon.addColorStop(0, "rgba(236,234,228,0.55)");
  moon.addColorStop(1, "rgba(236,234,228,0)");
  ctx.fillStyle = moon;
  ctx.fillRect(0, 0, width, height * 0.4);

  drawSea(ctx, width, height, time);
  drawWave(ctx, width, height, time);

  const hits: Hit[] = [];
  for (const sprite of sprites) {
    if (!sprite.interactive) {
      updateSprite(sprite, time);
      drawSurfer(ctx, width, height, sprite, time, false);
    }
  }
  for (const sprite of sprites) {
    if (!sprite.interactive) continue;
    updateSprite(sprite, time);
    const hit = drawSurfer(ctx, width, height, sprite, time, hoverId === sprite.id);
    if (hit) hits.push(hit);
  }

  drawScan(ctx, width, height);
  return hits;
}

function updateSprite(sprite: Sprite, time: number) {
  sprite.x += (sprite.tx - sprite.x) * 0.045;
  sprite.y += (sprite.ty - sprite.y) * 0.045;
  sprite.phase += 0.018;

  if (sprite.state === "dropping") {
    sprite.drop = Math.min(1, sprite.drop + 0.014);
    sprite.tx = 0.9;
    sprite.ty = 0.34;
    if (sprite.drop >= 1) sprite.state = "caught";
  } else if (sprite.state === "idle") {
    sprite.y += Math.sin(time * 1.15 + sprite.phase) * 0.00025;
  }
}

function drawSea(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
) {
  const sea = ctx.createLinearGradient(0, height * 0.3, 0, height);
  sea.addColorStop(0, "rgba(10,48,64,0.28)");
  sea.addColorStop(1, "rgba(5,8,13,0.96)");
  ctx.fillStyle = sea;
  ctx.fillRect(0, height * 0.3, width, height * 0.7);

  ctx.strokeStyle = "rgba(61,255,243,0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = height * (0.38 + i * 0.1);
    ctx.beginPath();
    for (let x = 0; x <= width; x += 10) {
      const wobble = Math.sin(x * 0.01 + time * 0.9 + i * 0.7) * (3 + i);
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
  const pulse = 0.88 + Math.sin(time * 1.25) * 0.07;
  ctx.save();
  ctx.globalAlpha = pulse;

  const face = ctx.createLinearGradient(width * 0.58, height * 0.18, width, height * 0.75);
  face.addColorStop(0, "rgba(61,255,243,0.04)");
  face.addColorStop(0.4, "rgba(61,255,243,0.38)");
  face.addColorStop(1, "rgba(255,122,24,0.28)");
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.moveTo(width * 0.56, height * 0.8);
  ctx.bezierCurveTo(width * 0.66, height * 0.52, width * 0.73, height * 0.2, width * 0.9, height * 0.3);
  ctx.bezierCurveTo(width * 0.97, height * 0.38, width * 0.99, height * 0.58, width * 0.93, height * 0.84);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(61,255,243,0.65)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(width * 0.68, height * 0.5);
  ctx.quadraticCurveTo(width * 0.83, height * 0.18, width * 0.95, height * 0.38);
  ctx.stroke();

  ctx.fillStyle = "rgba(5,8,13,0.72)";
  ctx.beginPath();
  ctx.ellipse(width * 0.855, height * 0.39, 26, 16, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,122,24,0.75)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

function drawSurfer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sprite: Sprite,
  time: number,
  hover: boolean,
): Hit | null {
  if (sprite.state === "caught") return null;

  const bob = Math.sin(time * 1.8 + sprite.phase) * (sprite.interactive ? 2.6 : 1.6);
  const x = sprite.x * width;
  const y = sprite.y * height + bob;
  const fade = sprite.state === "dropping" ? 1 - sprite.drop : 1;
  const color = colorFor(sprite);
  const scale = sprite.interactive ? 1 : 0.62;

  ctx.save();
  ctx.globalAlpha = (sprite.interactive ? 0.55 : 0.18) + fade * 0.45;
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.scale(scale, scale);

  ctx.strokeStyle = `rgba(${color},${hover ? 1 : 0.85})`;
  ctx.lineWidth = hover ? 2.4 : 1.7;
  ctx.beginPath();
  ctx.moveTo(-9, 3);
  ctx.quadraticCurveTo(0, 6, 11, -1);
  ctx.stroke();

  ctx.shadowColor = `rgba(${color},0.9)`;
  ctx.shadowBlur = hover ? 14 : 7;
  ctx.fillStyle = `rgba(${color},0.95)`;
  ctx.beginPath();
  ctx.ellipse(0, -6, 2.1, 3.2, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-1.1, -4, 2.2, 5);

  if (hover) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,122,24,0.85)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -3, 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  if (!sprite.interactive) return null;
  return { id: sprite.id, x, y, r: 16 };
}

function colorFor(sprite: Sprite) {
  if (sprite.setIndex === 0) return "255,122,24";
  if (sprite.setIndex === 1) return "61,255,243";
  if (sprite.setIndex === 2) return "180,230,224";
  return "255,46,196";
}

function drawScan(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1);
  }
}
