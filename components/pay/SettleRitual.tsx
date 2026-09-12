"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createTimeline } from "animejs/timeline";
import { createDrawable } from "animejs/svg";
import { set as setStyle } from "animejs/utils";
import {
  SETTLE_CHECK_AT,
  SETTLE_CHECK_COLOR,
  SETTLE_CHECK_DRAW_MS,
  SETTLE_CHECK_MS,
  SETTLE_CHECK_PATH,
  SETTLE_CHECK_PATH_WIDTH,
  SETTLE_CHECK_RING,
  SETTLE_CHECK_VIEWBOX,
  SETTLE_FILL_MS,
  SETTLE_FILL_STYLE,
  SETTLE_HOLD_MS,
  SETTLE_RING_MS,
  SETTLE_WAIT_MS,
  drawWave,
  settleCopy,
  type SettleMachine,
  type SettlePhase,
} from "@/lib/settle-ritual";

type Tickable = {
  pause: () => unknown;
  cancel: () => unknown;
};

let host: HTMLElement | null = null;
let timeline: Tickable | null = null;
let raf = 0;
let holdTimer = 0;

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

function q<T extends Element>(root: HTMLElement, sel: string) {
  return root.querySelector<T>(sel);
}

function stop(item: Tickable | null) {
  if (!item) return;
  item.pause();
  item.cancel();
}

export function reset() {
  if (holdTimer) {
    window.clearTimeout(holdTimer);
    holdTimer = 0;
  }
  if (raf) {
    window.cancelAnimationFrame(raf);
    raf = 0;
  }
  stop(timeline);
  timeline = null;
}

function paintPlate(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  progress: number,
  time: number,
) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w <= 0 || h <= 0) return;
  const pw = Math.floor(w * dpr);
  const ph = Math.floor(h * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawWave(ctx, { width: w, height: h, progress, time });
}

function playCheck({
  root,
  onComplete,
}: {
  root: HTMLElement;
  onComplete: () => void;
}) {
  const ring = q<SVGCircleElement>(root, "[data-settle-ring]");
  const mark = q<SVGPathElement>(root, "[data-settle-check]");
  const ringDraw = ring ? createDrawable(ring) : [];
  const markDraw = mark ? createDrawable(mark) : [];
  if (ringDraw.length) setStyle(ringDraw, { draw: "0 0" });
  if (markDraw.length) setStyle(markDraw, { draw: "0 0" });

  const tl = createTimeline({
    defaults: { ease: "outCubic" },
    autoplay: true,
  });
  timeline = tl;
  if (ringDraw.length) {
    tl.add(ringDraw, { draw: ["0 0", "0 1"], duration: SETTLE_RING_MS }, 0);
  }
  if (markDraw.length) {
    tl.add(
      markDraw,
      { draw: ["0 0", "0 1"], duration: SETTLE_CHECK_DRAW_MS },
      SETTLE_CHECK_AT,
    );
  }

  holdTimer = window.setTimeout(() => {
    holdTimer = 0;
    onComplete();
  }, SETTLE_CHECK_MS + SETTLE_HOLD_MS);
}

export function play({
  machine,
  onComplete,
  onPhase,
}: {
  machine: SettleMachine;
  onComplete: () => void;
  onPhase?: (phase: SettlePhase) => void;
}) {
  reset();
  const root = host;
  if (!root) return;

  const reduced = prefersReducedMotion();
  let phase: SettlePhase | null = null;
  const apply = (next: SettlePhase) => {
    if (phase === next) return;
    phase = next;
    root.dataset.phase = next;
    onPhase?.(next);
  };

  apply("waiting");
  root.dataset.machine = machine;
  root.dataset.reduced = reduced ? "true" : "false";
  root.dataset.style = SETTLE_FILL_STYLE;

  if (reduced) {
    apply("settled");
    holdTimer = window.setTimeout(() => {
      holdTimer = 0;
      onComplete();
    }, SETTLE_HOLD_MS);
    return;
  }

  const canvas = q<HTMLCanvasElement>(root, "[data-settle-canvas]");
  const ctx = canvas?.getContext("2d") ?? null;
  const started = performance.now();
  let checkStarted = false;

  const tick = (now: number) => {
    const elapsed = now - started;
    const fillElapsed = Math.max(0, elapsed - SETTLE_WAIT_MS);
    const progress = Math.min(1, fillElapsed / SETTLE_FILL_MS);

    if (elapsed < SETTLE_WAIT_MS) {
      apply("waiting");
    } else if (progress < 1) {
      apply("settling");
    }

    if (canvas && ctx) {
      paintPlate(canvas, ctx, progress, elapsed / 1000);
    }

    if (progress >= 1) {
      raf = 0;
      if (!checkStarted) {
        checkStarted = true;
        apply("settled");
        playCheck({ root, onComplete });
      }
      return;
    }

    raf = window.requestAnimationFrame(tick);
  };

  raf = window.requestAnimationFrame(tick);
}

function SettleCheck() {
  return (
    <svg
      className="settle-check-svg"
      viewBox={SETTLE_CHECK_VIEWBOX}
      aria-hidden="true"
    >
      <circle
        data-settle-ring
        cx={SETTLE_CHECK_RING.cx}
        cy={SETTLE_CHECK_RING.cy}
        r={SETTLE_CHECK_RING.r}
        fill="none"
        stroke={SETTLE_CHECK_COLOR}
        strokeWidth={SETTLE_CHECK_RING.width}
      />
      <path
        data-settle-check
        d={SETTLE_CHECK_PATH}
        fill="none"
        stroke={SETTLE_CHECK_COLOR}
        strokeWidth={SETTLE_CHECK_PATH_WIDTH}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export function SettleRitual({
  machine,
  titleId,
  onComplete,
}: {
  machine: SettleMachine;
  titleId?: string;
  onComplete: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const [phase, setPhase] = useState<SettlePhase>("waiting");
  const copy = settleCopy({ machine, phase });

  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    host = node;
    play({
      machine,
      onComplete: () => onCompleteRef.current(),
      onPhase: setPhase,
    });
    return () => {
      reset();
      if (host === node) host = null;
    };
  }, [machine]);

  return (
    <div
      ref={rootRef}
      className="settle-ritual"
      data-phase={phase}
      data-machine={machine}
      data-style={SETTLE_FILL_STYLE}
    >
      <canvas data-settle-canvas className="settle-canvas" aria-hidden="true" />
      <div className="settle-hud">
        <div className="settle-hud-top">
          <p className="settle-kicker" data-settle-kicker>
            {copy.kicker}
          </p>
          <p className="settle-clock" data-settle-clock>
            {copy.clock}
          </p>
        </div>
        <h2
          id={titleId}
          className="settle-title"
          data-settle-title
          aria-live="polite"
        >
          {copy.title}
        </h2>
        <p className="settle-sub" data-settle-sub>
          {copy.subtitle}
        </p>
      </div>
      <div className="settle-check" data-settle-check-wrap>
        <SettleCheck />
      </div>
    </div>
  );
}
