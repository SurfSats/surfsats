"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { animate } from "animejs/animation";
import { createTimeline } from "animejs/timeline";
import { createDrawable } from "animejs/svg";
import { set as setStyle, stagger } from "animejs/utils";
import {
  SETTLE_HOLD_MS,
  SETTLE_MS,
  SETTLE_SETTLED_AT,
  SETTLE_SETTLING_AT,
  SETTLE_WAIT_MS,
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
let pulse: Tickable | null = null;
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
  stop(pulse);
  pulse = null;
  stop(timeline);
  timeline = null;
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
  const apply = (phase: SettlePhase) => {
    root.dataset.phase = phase;
    onPhase?.(phase);
  };

  apply("waiting");
  root.dataset.machine = machine;
  root.dataset.reduced = reduced ? "true" : "false";

  const ghost = q<SVGGElement>(root, "[data-settle-ghost]");
  const slash = q<SVGGElement>(root, "[data-settle-slash]");
  const stamp = q<SVGGElement>(root, "[data-settle-stamp]");
  const ring = q<SVGPathElement>(root, "[data-settle-ring]");
  const bolt = q<SVGPathElement>(root, "[data-settle-bolt]");
  const wave = q<SVGPathElement>(root, "[data-settle-wave]");
  const btc = q<SVGPathElement>(root, "[data-settle-btc]");
  const boltFill = q<SVGPathElement>(root, "[data-settle-bolt-fill]");
  const hemiL = q<SVGPathElement>(root, "[data-settle-hemi-l]");
  const hemiR = q<SVGPathElement>(root, "[data-settle-hemi-r]");
  const fills = [boltFill, hemiL, hemiR].filter(
    (node): node is SVGPathElement => Boolean(node),
  );
  const drawables = [ring, bolt, wave, btc].filter(
    (node): node is SVGPathElement => Boolean(node),
  );

  if (reduced) {
    if (ghost) setStyle(ghost, { opacity: 0, scale: 1 });
    if (slash) setStyle(slash, { opacity: 0, translateY: 0 });
    if (stamp) setStyle(stamp, { opacity: 1, scale: 1 });
    for (const node of drawables) setStyle(node, { opacity: 1 });
    for (const node of fills) setStyle(node, { opacity: 1 });
    if (wave) setStyle(wave, { fillOpacity: 1 });
    apply("settled");
    holdTimer = window.setTimeout(() => {
      holdTimer = 0;
      onComplete();
    }, SETTLE_HOLD_MS);
    return;
  }

  if (ghost) {
    pulse = animate(ghost, {
      opacity: [0.32, 0.78],
      scale: [1, 1.05],
      duration: 860,
      ease: "inOutSine",
      alternate: true,
      loop: true,
    });
  }

  const ringDraw = ring ? createDrawable(ring) : [];
  const boltDraw = bolt ? createDrawable(bolt) : [];
  const markDraw = [wave, btc].flatMap((node) =>
    node ? createDrawable(node) : [],
  );

  const tl = createTimeline({
    defaults: { ease: "outCubic", duration: 400 },
    autoplay: true,
  });
  timeline = tl;

  if (slash) {
    tl.add(
      slash,
      {
        opacity: [0, 1],
        translateY: ["-42%", "0%"],
        duration: 220,
        ease: "inQuad",
      },
      SETTLE_WAIT_MS,
    );
  }
  tl.call(() => {
    stop(pulse);
    pulse = ghost
      ? animate(ghost, { opacity: 0, scale: 1.02, duration: 180, ease: "outQuad" })
      : null;
  }, SETTLE_WAIT_MS);
  if (ringDraw.length) {
    tl.add(ringDraw, { draw: ["0 0", "0 1"], duration: 680, ease: "inOutQuad" }, 480);
  }
  if (boltDraw.length) {
    tl.add(boltDraw, { draw: ["0 0", "0 1"], duration: 620, ease: "inOutQuad" }, 700);
  }
  if (markDraw.length) {
    tl.add(
      markDraw,
      {
        draw: ["0 0", "0 1"],
        duration: 700,
        delay: stagger(140),
        ease: "inOutQuad",
      },
      900,
    );
  }
  tl.call(() => apply("settling"), SETTLE_SETTLING_AT);
  if (fills.length) {
    tl.add(fills, { opacity: [0, 1], duration: 480, ease: "outQuad" }, SETTLE_SETTLING_AT);
  }
  if (wave) {
    tl.add(wave, { fillOpacity: [0, 1], duration: 420, ease: "outQuad" }, SETTLE_SETTLING_AT);
  }
  tl.call(() => apply("settled"), SETTLE_SETTLED_AT);
  if (stamp) {
    tl.add(
      stamp,
      { opacity: [0, 1], scale: [1.7, 1], duration: 280, ease: "outBack" },
      SETTLE_SETTLED_AT + 40,
    );
  }
  tl.call(onComplete, SETTLE_MS + SETTLE_HOLD_MS);
}

function CutMark() {
  return (
    <svg
      className="settle-mark-svg"
      viewBox="0 0 200 200"
      aria-hidden="true"
    >
      <defs>
        <clipPath id="settle-disk">
          <circle cx="100" cy="100" r="84" />
        </clipPath>
      </defs>

      <circle className="settle-plate" cx="100" cy="100" r="94" />

      <g data-settle-ghost className="settle-ghost-wrap">
        <circle className="settle-ghost" cx="100" cy="100" r="86" />
      </g>

      <g clipPath="url(#settle-disk)">
        <path
          data-settle-hemi-l
          className="settle-hemi settle-hemi-l"
          d="M100 16 A84 84 0 0 0 100 184 Z"
        />
        <path
          data-settle-hemi-r
          className="settle-hemi settle-hemi-r"
          d="M100 16 A84 84 0 0 1 100 184 Z"
        />
      </g>

      <path
        data-settle-ring
        className="settle-ring settle-draw"
        d="M100 14 A86 86 0 1 1 99.99 14"
      />

      <path
        data-settle-wave
        className="settle-wave settle-draw"
        d="M30 150 C34 120 50 104 70 110 C86 115 90 132 78 140 C96 124 114 112 116 86 C118 62 98 50 82 60 C64 72 60 96 70 116 C54 104 36 116 30 150 Z"
      />

      <path
        data-settle-bolt-fill
        className="settle-bolt-fill"
        d="M120 16 94 94 H124 L80 184 134 104 H104 Z"
      />
      <path
        data-settle-bolt
        className="settle-bolt settle-draw"
        d="M112 20 94 98 H126 L90 180"
      />

      <path
        data-settle-btc
        className="settle-btc settle-draw"
        d="M138 54 V146 M147 54 V146 M147 68 H164 C178 68 180 94 166 96 H147 M147 96 H168 C184 96 186 130 168 132 H147"
      />

      <g data-settle-slash className="settle-slash-wrap">
        <line className="settle-slash" x1="176" y1="6" x2="24" y2="196" />
      </g>

      <g transform="translate(100 108) rotate(-18)">
        <g data-settle-stamp className="settle-stamp-wrap">
          <text className="settle-stamp" textAnchor="middle" dominantBaseline="middle">
            SETTLED
          </text>
        </g>
      </g>
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
    >
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
      <div className="settle-plate-well">
        <CutMark />
      </div>
    </div>
  );
}
