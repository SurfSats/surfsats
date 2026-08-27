"use client";

import { useEffect, useRef } from "react";

type Bill = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  scale: number;
  kind: number;
  wobble: number;
  wobbleSpeed: number;
};

type Props = {
  dollarsPerSecond: number;
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function makeSprites() {
  const labels = ["1", "20", "100"];
  const fills = ["#d7ead0", "#e4f3dc", "#c8dfc0"];
  const inks = ["#1a4d2a", "#163f22", "#0f331c"];
  return labels.map((label, i) => {
    const sheet = document.createElement("canvas");
    sheet.width = 96;
    sheet.height = 44;
    const g = sheet.getContext("2d");
    if (!g) return sheet;
    g.fillStyle = fills[i];
    roundRect(g, 1, 1, 94, 42, 5);
    g.fill();
    g.strokeStyle = "rgba(22, 52, 28, 0.8)";
    g.lineWidth = 2;
    g.stroke();
    g.strokeStyle = "rgba(46, 92, 52, 0.35)";
    g.lineWidth = 1;
    roundRect(g, 6, 5, 84, 34, 3);
    g.stroke();
    g.fillStyle = "rgba(46, 110, 58, 0.18)";
    g.beginPath();
    g.arc(48, 22, 11, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = inks[i];
    g.font = "700 20px Georgia, 'Times New Roman', serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("$", 34, 23);
    g.font = "700 13px ui-monospace, monospace";
    g.fillText(label, 62, 23);
    return sheet;
  });
}

function spawnRate(dollarsPerSecond: number) {
  const t = Math.max(0, dollarsPerSecond) / 250_000;
  return Math.min(60, 10 + t * 34);
}

function maxAlive(dollarsPerSecond: number) {
  const t = Math.max(0, dollarsPerSecond) / 250_000;
  return Math.round(Math.min(200, 60 + t * 110));
}

function spawnBill(width: number, fromTop: boolean): Bill {
  const leftBias = Math.random() < 0.42;
  const x = leftBias
    ? Math.random() * width * 0.38
    : Math.random() * width;
  return {
    x,
    y: fromTop ? -28 - Math.random() * 80 : Math.random() * -40,
    vx: (Math.random() - 0.48) * 38,
    vy: 78 + Math.random() * 110,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 1.8,
    scale: 0.55 + Math.random() * 0.7,
    kind: Math.floor(Math.random() * 3),
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 1.2 + Math.random() * 2.4,
  };
}

export function MoneyRain({ dollarsPerSecond }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rateRef = useRef(dollarsPerSecond);

  useEffect(() => {
    rateRef.current = dollarsPerSecond;
  }, [dollarsPerSecond]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const surface: HTMLCanvasElement = canvas;
    const g: CanvasRenderingContext2D = ctx;
    const sprites = makeSprites();
    const bills: Bill[] = [];
    let frame = 0;
    let last = performance.now();
    let spawnAcc = 0;
    let running = true;
    const dprCap = window.matchMedia("all and (max-width: 700px)").matches
      ? 1.25
      : 1.75;

    function resize() {
      const parent = surface.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      const dpr = Math.min(dprCap, window.devicePixelRatio || 1);
      surface.width = Math.max(1, Math.floor(w * dpr));
      surface.height = Math.max(1, Math.floor(h * dpr));
      surface.style.width = `${w}px`;
      surface.style.height = `${h}px`;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    const observer = new ResizeObserver(() => resize());
    if (surface.parentElement) observer.observe(surface.parentElement);

    const seed = Math.min(36, maxAlive(rateRef.current) * 0.35);
    for (let i = 0; i < seed; i += 1) {
      const bill = spawnBill(surface.parentElement?.clientWidth ?? 800, true);
      bill.y = Math.random() * (surface.parentElement?.clientHeight ?? 600);
      bills.push(bill);
    }

    function tick(now: number) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const parent = surface.parentElement;
      const width = parent?.clientWidth ?? 0;
      const height = parent?.clientHeight ?? 0;
      const rate = rateRef.current;
      const perSec = spawnRate(rate);
      const cap = maxAlive(rate);

      if (document.visibilityState !== "hidden") {
        spawnAcc += perSec * dt;
        while (spawnAcc >= 1 && bills.length < cap) {
          bills.push(spawnBill(width, true));
          spawnAcc -= 1;
        }
        if (spawnAcc >= 1) spawnAcc = 1;
      }

      g.clearRect(0, 0, width, height);
      for (let i = bills.length - 1; i >= 0; i -= 1) {
        const bill = bills[i];
        bill.wobble += bill.wobbleSpeed * dt;
        bill.x += (bill.vx + Math.sin(bill.wobble) * 26) * dt;
        bill.y += bill.vy * dt;
        bill.rot += bill.vr * dt;
        if (
          bill.y > height + 40 ||
          bill.x < -80 ||
          bill.x > width + 80
        ) {
          bills.splice(i, 1);
          continue;
        }
        const sprite = sprites[bill.kind] ?? sprites[0];
        const w = 52 * bill.scale;
        const h = 24 * bill.scale;
        g.save();
        g.translate(bill.x, bill.y);
        g.rotate(bill.rot);
        g.globalAlpha = 0.94;
        g.shadowColor = "rgba(0, 0, 0, 0.45)";
        g.shadowBlur = 6;
        g.drawImage(sprite, -w / 2, -h / 2, w, h);
        g.restore();
      }

      frame = window.requestAnimationFrame(tick);
    }

    tick(performance.now());
    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="fiat-rain" aria-hidden="true" />;
}
