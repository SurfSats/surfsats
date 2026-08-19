"use client";

import { useId } from "react";
import {
  type TimechainSnapshot,
  formatBlockAge,
  formatInteger,
  formatInterval,
} from "@/lib/timechain";

const CX = 550;
const CY = 550;

const RINGS = {
  last: { r: 228, w: 24, color: "#3dfff3", ticks: 48 },
  day: { r: 282, w: 26, color: "#ff7a18", ticks: 60 },
  diff: { r: 340, w: 28, color: "#e14aff", ticks: 72 },
  half: { r: 400, w: 30, color: "#f0b429", ticks: 96 },
} as const;

export function TideClock({
  snapshot,
  ageSec,
}: {
  snapshot: TimechainSnapshot;
  ageSec: number;
}) {
  const uid = useId().replace(/:/g, "");
  const glow = `${uid}-glow`;
  const lastP = clamp01(ageSec / 600);
  const dayP = clamp01((snapshot.blocksLast24h ?? 0) / 144);
  const diffP = clamp01((snapshot.difficultyProgressPercent ?? 0) / 100);
  const halfP = clamp01((snapshot.halvingProgressPercent ?? 0) / 100);

  return (
    <svg
      viewBox="0 0 1100 1100"
      className="tide-clock"
      role="img"
      aria-label="Bitcoin protocol monitor with four concentric time rings"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={`${uid}-core`} cx="50%" cy="50%" r="48%">
          <stop offset="0%" stopColor="#3dfff3" stopOpacity="0.16" />
          <stop offset="42%" stopColor="#3dfff3" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#05060a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={CX} cy={CY} r="520" fill={`url(#${uid}-core)`} />

      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * 360;
        const inner = polar(176, a);
        const outer = polar(418, a);
        return (
          <line
            key={i}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="rgba(61,255,243,0.07)"
            strokeWidth="1"
          />
        );
      })}

      <circle
        cx={CX}
        cy={CY}
        r="184"
        fill="none"
        stroke="rgba(61,255,243,0.35)"
        strokeWidth="1.4"
        strokeDasharray="2 6"
      />
      <circle
        cx={CX}
        cy={CY}
        r="176"
        fill="none"
        stroke="rgba(61,255,243,0.1)"
        strokeWidth="12"
      />

      <Ring
        glow={glow}
        r={RINGS.half.r}
        color={RINGS.half.color}
        progress={halfP}
        ticks={RINGS.half.ticks}
        width={RINGS.half.w}
      />
      <Ring
        glow={glow}
        r={RINGS.diff.r}
        color={RINGS.diff.color}
        progress={diffP}
        ticks={RINGS.diff.ticks}
        width={RINGS.diff.w}
      />
      <Ring
        glow={glow}
        r={RINGS.day.r}
        color={RINGS.day.color}
        progress={dayP}
        ticks={RINGS.day.ticks}
        width={RINGS.day.w}
      />
      <Ring
        glow={glow}
        r={RINGS.last.r}
        color={RINGS.last.color}
        progress={lastP}
        ticks={RINGS.last.ticks}
        width={RINGS.last.w}
      />

      <OnRing
        r={RINGS.last.r}
        deg={308}
        value={formatBlockAge(ageSec)}
        color={RINGS.last.color}
      />
      <OnRing
        r={RINGS.day.r}
        deg={52}
        value={`${snapshot.blocksLast24h ?? "—"}/144`}
        color={RINGS.day.color}
      />
      <OnRing
        r={RINGS.diff.r}
        deg={0}
        value={
          snapshot.difficultyProgressPercent !== null
            ? `${snapshot.difficultyProgressPercent.toFixed(1)}%`
            : "—"
        }
        color={RINGS.diff.color}
      />
      <OnRing
        r={RINGS.half.r}
        deg={180}
        value={
          snapshot.daysToHalving !== null
            ? `${snapshot.daysToHalving.toFixed(1)}d`
            : "—"
        }
        color={RINGS.half.color}
      />

      <OuterLabel
        r={RINGS.last.r}
        w={RINGS.last.w}
        deg={308}
        color={RINGS.last.color}
        title="Last block"
        value={formatBlockAge(ageSec)}
        sub={
          snapshot.avgIntervalMs !== null
            ? `avg ${formatInterval(snapshot.avgIntervalMs)}`
            : "avg 10m"
        }
      />
      <OuterLabel
        r={RINGS.day.r}
        w={RINGS.day.w}
        deg={52}
        color={RINGS.day.color}
        title="24h block production"
        value={`${snapshot.blocksLast24h ?? "—"} / 144`}
      />
      <OuterLabel
        r={RINGS.diff.r}
        w={RINGS.diff.w}
        deg={0}
        color={RINGS.diff.color}
        title="Difficulty epoch"
        value={
          snapshot.epochBlocksDone !== null
            ? `${formatInteger(snapshot.epochBlocksDone)} / ${snapshot.epochLength}`
            : "— / 2016"
        }
        sub={
          snapshot.difficultyProgressPercent !== null
            ? `${snapshot.difficultyProgressPercent.toFixed(2)}%`
            : undefined
        }
      />
      <OuterLabel
        r={RINGS.half.r}
        w={RINGS.half.w}
        deg={180}
        color={RINGS.half.color}
        title="Path to next halving"
        value={
          snapshot.blocksToHalving !== null
            ? `${formatInteger(snapshot.blocksToHalving)} blocks`
            : "—"
        }
        sub={
          snapshot.daysToHalving !== null
            ? `≈ ${snapshot.daysToHalving.toFixed(1)} days`
            : undefined
        }
      />
    </svg>
  );
}

function Ring({
  glow,
  r,
  color,
  progress,
  ticks,
  width,
}: {
  glow: string;
  r: number;
  color: string;
  progress: number;
  ticks: number;
  width: number;
}) {
  const c = 2 * Math.PI * r;
  const filled = Math.max(0.035, progress) * c;

  return (
    <g>
      <circle
        cx={CX}
        cy={CY}
        r={r}
        fill="none"
        stroke={color}
        strokeOpacity="0.16"
        strokeWidth={width + 6}
      />
      <circle
        cx={CX}
        cy={CY}
        r={r}
        fill="none"
        stroke="#07080c"
        strokeWidth={width}
      />
      <circle
        cx={CX}
        cy={CY}
        r={r}
        fill="none"
        stroke={color}
        strokeOpacity="0.22"
        strokeWidth={width}
        strokeDasharray="7 5"
      />
      {Array.from({ length: ticks }, (_, i) => {
        const a = (i / ticks) * 360;
        const major = i % 8 === 0;
        const p1 = polar(r - width / 2 - (major ? 3 : 1), a);
        const p2 = polar(r + width / 2 + (major ? 4 : 1), a);
        return (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={color}
            strokeOpacity={major ? 0.7 : 0.28}
            strokeWidth={major ? 1.6 : 0.8}
          />
        );
      })}
      <circle
        cx={CX}
        cy={CY}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={width - 4}
        strokeLinecap="butt"
        strokeDasharray={`${filled} ${c}`}
        transform={`rotate(-90 ${CX} ${CY})`}
        filter={`url(#${glow})`}
      />
    </g>
  );
}

function OnRing({
  r,
  deg,
  value,
  color,
}: {
  r: number;
  deg: number;
  value: string;
  color: string;
}) {
  const p = polar(r, deg);
  return (
    <text
      x={p.x}
      y={p.y + 5}
      textAnchor="middle"
      fill="#05060a"
      stroke={color}
      strokeWidth="4"
      paintOrder="stroke"
      className="tide-clock-onring"
      fontFamily="ui-monospace, monospace"
    >
      {value}
    </text>
  );
}

function OuterLabel({
  r,
  w,
  deg,
  color,
  title,
  value,
  sub,
}: {
  r: number;
  w: number;
  deg: number;
  color: string;
  title: string;
  value: string;
  sub?: string;
}) {
  const start = polar(r + w / 2 + 6, deg);
  const end = polar(r + w / 2 + 28, deg);
  const text = polar(r + w / 2 + 46, deg);
  const right = deg > 0 && deg < 180;
  const top = deg < 25 || deg > 335;
  const bottom = deg > 155 && deg < 205;
  const anchor = top || bottom ? "middle" : right ? "start" : "end";
  const dx = top || bottom ? 0 : right ? 6 : -6;

  return (
    <g>
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={color}
        strokeOpacity="0.7"
        strokeWidth="1.4"
      />
      <circle cx={start.x} cy={start.y} r="2.4" fill={color} />
      <text
        x={text.x + dx}
        y={text.y + (bottom ? 14 : -10)}
        textAnchor={anchor}
        fill={color}
        className="tide-clock-kicker"
        fontFamily="ui-monospace, monospace"
      >
        {title}
      </text>
      <text
        x={text.x + dx}
        y={text.y + (bottom ? 32 : 10)}
        textAnchor={anchor}
        fill="#f4f1ea"
        className="tide-clock-read"
        fontFamily="ui-monospace, monospace"
      >
        {value}
      </text>
      {sub ? (
        <text
          x={text.x + dx}
          y={text.y + (bottom ? 48 : 26)}
          textAnchor={anchor}
          fill={color}
          className="tide-clock-kicker"
          fontFamily="ui-monospace, monospace"
        >
          {sub}
        </text>
      ) : null}
    </g>
  );
}

export function swellLabel(ageSec: number) {
  if (ageSec < 180) return "set just passed";
  if (ageSec < 480) return "swell building";
  if (ageSec < 720) return "peak window";
  return "overdue · closeout risk";
}

function polar(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
