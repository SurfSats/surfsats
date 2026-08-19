"use client";

import { useId } from "react";
import {
  type TimechainSnapshot,
  formatBlockAge,
  formatInteger,
} from "@/lib/timechain";

const CX = 500;
const CY = 500;
const TARGET_BLOCK_SEC = 600;

const RINGS = {
  last: { r: 168, color: "#3dfff3", ticks: 48, width: 9 },
  day: { r: 228, color: "#ff7a18", ticks: 60, width: 10 },
  diff: { r: 288, color: "#ff2ec4", ticks: 72, width: 11 },
  half: { r: 348, color: "#ff9a3c", ticks: 96, width: 12 },
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
  const lastP = clamp01(ageSec / TARGET_BLOCK_SEC);
  const dayP = clamp01((snapshot.blocksLast24h ?? 0) / 144);
  const diffP = clamp01((snapshot.difficultyProgressPercent ?? 0) / 100);
  const halfP = clamp01((snapshot.halvingProgressPercent ?? 0) / 100);

  return (
    <svg
      viewBox="0 0 1000 1000"
      className="tide-clock"
      role="img"
      aria-label="Bitcoin protocol monitor: block height and four time rings"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id={glow} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={`${uid}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3dfff3" stopOpacity="0.14" />
          <stop offset="55%" stopColor="#3dfff3" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#05060a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={CX} cy={CY} r="420" fill={`url(#${uid}-core)`} />

      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * 360;
        const a0 = polar(118, a);
        const a1 = polar(360, a);
        return (
          <line
            key={i}
            x1={a0.x}
            y1={a0.y}
            x2={a1.x}
            y2={a1.y}
            stroke="rgba(61,255,243,0.08)"
            strokeWidth="1"
          />
        );
      })}

      <circle
        cx={CX}
        cy={CY}
        r="126"
        fill="none"
        stroke="rgba(61,255,243,0.28)"
        strokeWidth="1.2"
        strokeDasharray="3 5"
      />
      <circle
        cx={CX}
        cy={CY}
        r="118"
        fill="none"
        stroke="rgba(61,255,243,0.12)"
        strokeWidth="8"
      />

      <Ring
        glow={glow}
        r={RINGS.last.r}
        color={RINGS.last.color}
        progress={lastP}
        ticks={RINGS.last.ticks}
        width={RINGS.last.width}
      />
      <Ring
        glow={glow}
        r={RINGS.day.r}
        color={RINGS.day.color}
        progress={dayP}
        ticks={RINGS.day.ticks}
        width={RINGS.day.width}
      />
      <Ring
        glow={glow}
        r={RINGS.diff.r}
        color={RINGS.diff.color}
        progress={diffP}
        ticks={RINGS.diff.ticks}
        width={RINGS.diff.width}
      />
      <Ring
        glow={glow}
        r={RINGS.half.r}
        color={RINGS.half.color}
        progress={halfP}
        ticks={RINGS.half.ticks}
        width={RINGS.half.width}
      />

      <RingLabel
        r={RINGS.last.r}
        deg={312}
        color={RINGS.last.color}
        title="LAST BLOCK"
        value={formatBlockAge(ageSec)}
      />
      <RingLabel
        r={RINGS.day.r}
        deg={38}
        color={RINGS.day.color}
        title="24H BLOCKS"
        value={`${snapshot.blocksLast24h ?? "—"} / 144`}
      />
      <RingLabel
        r={RINGS.diff.r}
        deg={218}
        color={RINGS.diff.color}
        title="DIFFICULTY EPOCH"
        value={
          snapshot.remainingBlocksToRetarget !== null
            ? `${formatInteger(snapshot.remainingBlocksToRetarget)} LEFT`
            : "—"
        }
      />
      <RingLabel
        r={RINGS.half.r}
        deg={148}
        color={RINGS.half.color}
        title="NEXT HALVING"
        value={
          snapshot.blocksToHalving !== null
            ? `${formatInteger(snapshot.blocksToHalving)} BLOCKS`
            : "—"
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
  const filled = Math.max(0.02, progress) * c;

  return (
    <g>
      <circle
        cx={CX}
        cy={CY}
        r={r}
        fill="none"
        stroke={color}
        strokeOpacity="0.14"
        strokeWidth={width + 4}
      />
      <circle
        cx={CX}
        cy={CY}
        r={r}
        fill="none"
        stroke={color}
        strokeOpacity="0.22"
        strokeWidth="1"
      />
      {Array.from({ length: ticks }, (_, i) => {
        const a = (i / ticks) * 360;
        const major = i % 6 === 0;
        const p1 = polar(r - (major ? 9 : 5), a);
        const p2 = polar(r + (major ? 9 : 5), a);
        return (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={color}
            strokeOpacity={major ? 0.45 : 0.18}
            strokeWidth={major ? 1.4 : 0.8}
          />
        );
      })}
      <circle
        cx={CX}
        cy={CY}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${c}`}
        transform={`rotate(-90 ${CX} ${CY})`}
        filter={`url(#${glow})`}
        opacity="0.95"
      />
    </g>
  );
}

function RingLabel({
  r,
  deg,
  color,
  title,
  value,
}: {
  r: number;
  deg: number;
  color: string;
  title: string;
  value: string;
}) {
  const p = polar(r, deg);
  const right = deg < 180;
  return (
    <g transform={`translate(${p.x} ${p.y})`}>
      <text
        x={right ? 14 : -14}
        y="-6"
        textAnchor={right ? "start" : "end"}
        fill={color}
        className="tide-clock-kicker"
        fontFamily="ui-monospace, monospace"
      >
        {title}
      </text>
      <text
        x={right ? 14 : -14}
        y="14"
        textAnchor={right ? "start" : "end"}
        fill="#eceae4"
        className="tide-clock-read"
        fontFamily="ui-monospace, monospace"
      >
        {value}
      </text>
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
