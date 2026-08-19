"use client";

import { useId } from "react";
import {
  type TimechainSnapshot,
  formatBlockAge,
  formatInteger,
  formatInterval,
} from "@/lib/timechain";

const CX = 500;
const CY = 500;

const RINGS = {
  last: { r: 188, w: 18, color: "#3dfff3", ticks: 48 },
  day: { r: 228, w: 20, color: "#ff7a18", ticks: 60 },
  diff: { r: 272, w: 22, color: "#e14aff", ticks: 72 },
  half: { r: 318, w: 24, color: "#f0b429", ticks: 96 },
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
  const dayShare =
    snapshot.blocksLast24h !== null ? snapshot.blocksLast24h / 144 : 0;

  return (
    <svg
      viewBox="0 0 1000 1000"
      className="tide-clock"
      role="img"
      aria-label="Bitcoin protocol monitor with four concentric time rings"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.6" result="b" />
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

      <circle cx={CX} cy={CY} r="430" fill={`url(#${uid}-core)`} />

      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * 360;
        const inner = polar(148, a);
        const outer = polar(338, a);
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
        r="152"
        fill="none"
        stroke="rgba(61,255,243,0.35)"
        strokeWidth="1.4"
        strokeDasharray="2 6"
      />
      <circle
        cx={CX}
        cy={CY}
        r="146"
        fill="none"
        stroke="rgba(61,255,243,0.1)"
        strokeWidth="10"
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

      <Anno
        r={RINGS.diff.r}
        deg={0}
        color={RINGS.diff.color}
        kicker="DIFFICULTY EPOCH"
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
        anchor="middle"
      />
      <Anno
        r={RINGS.day.r}
        deg={8}
        color={RINGS.day.color}
        kicker="24H BLOCK PRODUCTION"
        value={`${snapshot.blocksLast24h ?? "—"} / 144`}
        sub="BLOCKS"
        anchor="start"
      />
      <Anno
        r={RINGS.last.r}
        deg={42}
        color={RINGS.last.color}
        kicker="AVG INTERVAL"
        value={
          snapshot.avgIntervalMs !== null
            ? formatInterval(snapshot.avgIntervalMs)
            : "10m"
        }
        anchor="start"
      />
      <Anno
        r={RINGS.last.r}
        deg={318}
        color={RINGS.last.color}
        kicker="LAST BLOCK"
        value={formatBlockAge(ageSec)}
        anchor="end"
      />
      <Anno
        r={RINGS.day.r}
        deg={230}
        color={RINGS.day.color}
        kicker="24H RATE"
        value={`${snapshot.blocksLast24h ?? "—"} / 144`}
        sub={`${(dayShare * 100).toFixed(1)}%`}
        anchor="end"
      />
      <Anno
        r={RINGS.half.r}
        deg={180}
        color={RINGS.half.color}
        kicker="PATH TO NEXT HALVING"
        value={
          snapshot.daysToHalving !== null
            ? `≈ ${snapshot.daysToHalving.toFixed(1)} DAYS`
            : "—"
        }
        sub={
          snapshot.blocksToHalving !== null
            ? `${formatInteger(snapshot.blocksToHalving)} BLOCKS`
            : undefined
        }
        anchor="middle"
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
        strokeWidth={width - 3}
        strokeLinecap="butt"
        strokeDasharray={`${filled} ${c}`}
        transform={`rotate(-90 ${CX} ${CY})`}
        filter={`url(#${glow})`}
      />
    </g>
  );
}

function Anno({
  r,
  deg,
  color,
  kicker,
  value,
  sub,
  anchor,
}: {
  r: number;
  deg: number;
  color: string;
  kicker: string;
  value: string;
  sub?: string;
  anchor: "start" | "end" | "middle";
}) {
  const p = polar(r, deg);
  const dx = anchor === "start" ? 16 : anchor === "end" ? -16 : 0;
  return (
    <g transform={`translate(${p.x} ${p.y})`}>
      <text
        x={dx}
        y={sub ? -12 : -4}
        textAnchor={anchor}
        fill={color}
        className="tide-clock-kicker"
        fontFamily="ui-monospace, monospace"
      >
        {kicker}
      </text>
      <text
        x={dx}
        y={sub ? 8 : 14}
        textAnchor={anchor}
        fill="#f4f1ea"
        className="tide-clock-read"
        fontFamily="ui-monospace, monospace"
      >
        {value}
      </text>
      {sub ? (
        <text
          x={dx}
          y={24}
          textAnchor={anchor}
          fill="#8b8d99"
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
