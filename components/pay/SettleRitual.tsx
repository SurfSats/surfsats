"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SETTLE_MS,
  settlePhaseAt,
  type SettleFrame,
} from "@/lib/settle-ritual";

export function useSettleHandoff() {
  const [settling, setSettling] = useState(false);
  const next = useRef<(() => void) | null>(null);

  const beginSettle = useCallback((handoff: () => void) => {
    next.current = handoff;
    setSettling(true);
  }, []);

  const finishSettle = useCallback(() => {
    const fn = next.current;
    next.current = null;
    setSettling(false);
    fn?.();
  }, []);

  return { settling, beginSettle, finishSettle };
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function SettleRitual({
  subtitle,
  titleId,
  onComplete,
}: {
  subtitle?: string;
  titleId?: string;
  onComplete: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const done = useRef(false);
  const progressRef = useRef(0);
  const reduced = prefersReducedMotion();
  const [frame, setFrame] = useState<SettleFrame>(() =>
    settlePhaseAt({ elapsed: 0, reducedMotion: reduced }),
  );
  progressRef.current = frame.progress;

  useEffect(() => {
    done.current = false;
    const started = performance.now();
    let raf = 0;

    function tick(now: number) {
      const next = settlePhaseAt({
        elapsed: now - started,
        duration: SETTLE_MS,
        reducedMotion: reduced,
      });
      setFrame(next);
      if (next.done) {
        if (!done.current) {
          done.current = true;
          onComplete();
        }
        return;
      }
      raf = window.requestAnimationFrame(tick);
    }

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [onComplete, reduced]);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const started = performance.now();

    function paint(now: number) {
      const node = canvasRef.current;
      if (!node || !ctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = node.clientWidth;
      const h = node.clientHeight;
      if (node.width !== Math.floor(w * dpr) || node.height !== Math.floor(h * dpr)) {
        node.width = Math.floor(w * dpr);
        node.height = Math.floor(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const t = (now - started) / 1000;
      const level = h * (1 - progressRef.current);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#07090c";
      ctx.fillRect(0, 0, w, h);

      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 2) {
        const y =
          level +
          Math.sin(x * 0.045 + t * 2.1) * 9 +
          Math.sin(x * 0.11 + t * 1.35) * 4;
        if (x === 0) ctx.lineTo(0, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      const swell = ctx.createLinearGradient(0, level - 20, 0, h);
      swell.addColorStop(0, "rgba(61, 255, 243, 0.55)");
      swell.addColorStop(0.45, "rgba(61, 255, 243, 0.22)");
      swell.addColorStop(1, "rgba(255, 122, 24, 0.18)");
      ctx.fillStyle = swell;
      ctx.fill();

      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const y =
          level +
          Math.sin(x * 0.045 + t * 2.1) * 9 +
          Math.sin(x * 0.11 + t * 1.35) * 4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(255, 122, 24, 0.85)";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      raf = window.requestAnimationFrame(paint);
    }

    raf = window.requestAnimationFrame(paint);
    return () => window.cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <div className="settle-ritual" data-phase={frame.phase}>
      <p className="settle-kicker">lightning</p>
      <h2 id={titleId} className="settle-title" aria-live="polite">
        {frame.title}
      </h2>
      {subtitle ? <p className="settle-sub">{subtitle}</p> : null}
      <div className="settle-well">
        {reduced ? null : (
          <canvas ref={canvasRef} className="settle-wave" aria-hidden="true" />
        )}
        <div className="settle-meter" aria-hidden="true">
          <b style={{ width: `${Math.round(frame.progress * 100)}%` }} />
        </div>
        {frame.phase === "settled" ? (
          <span className="settle-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M13 2 4 14h7l-1 8 10-14h-7l0-6Z"
                fill="currentColor"
              />
            </svg>
          </span>
        ) : null}
      </div>
    </div>
  );
}
