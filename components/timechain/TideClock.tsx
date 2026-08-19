"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  type TimechainSnapshot,
  formatBlockAge,
  formatInteger,
} from "@/lib/timechain";

const TARGET_BLOCK_SEC = 600;
const STAFF_TOP = 168;
const STAFF_BOTTOM = 820;
const STAFF_H = STAFF_BOTTOM - STAFF_TOP;
const BASIN_L = 168;
const BASIN_R = 1128;
const BASIN_W = BASIN_R - BASIN_L;

export function TideClock({ snapshot }: { snapshot: TimechainSnapshot }) {
  const [now, setNow] = useState(() => Date.now());
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ageSec =
    snapshot.lastBlockTimestamp !== null
      ? Math.max(0, now / 1000 - snapshot.lastBlockTimestamp)
      : 0;
  const swell = Math.min(1.35, ageSec / TARGET_BLOCK_SEC);
  const supply = clamp01((snapshot.supplyPercent ?? 0) / 100);
  const tide = clamp01((snapshot.difficultyProgressPercent ?? 0) / 100);
  const season = clamp01((snapshot.halvingProgressPercent ?? 0) / 100);
  const sets24 = snapshot.blocksLast24h ?? 0;
  const setMarks = Math.min(24, Math.max(0, Math.round(sets24 / 6)));

  const waterY = STAFF_BOTTOM - supply * STAFF_H;
  const tideY = STAFF_BOTTOM - tide * STAFF_H;
  const swellLift = 10 + swell * 42;
  const surfaceY = waterY - swellLift * 0.35;
  const t = now / 380;

  const arc = useMemo(() => kingArcPath(200, 1180, 128, 58), []);
  const arcLen = 1180;

  return (
    <svg
      viewBox="0 0 1400 900"
      className="tide-clock"
      role="img"
      aria-label="Tide clock: supply water, last-block swell, difficulty tide, and halving season"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#05070d" />
          <stop offset="55%" stopColor="#08141c" />
          <stop offset="100%" stopColor="#061018" />
        </linearGradient>
        <linearGradient id={`${uid}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5cfff6" stopOpacity="0.42" />
          <stop offset="18%" stopColor="#1a7f8c" />
          <stop offset="70%" stopColor="#0b3140" />
          <stop offset="100%" stopColor="#071018" />
        </linearGradient>
        <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3dfff3" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#3dfff3" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-king`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff7a18" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#ff9a3c" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ff7a18" stopOpacity="0.15" />
        </linearGradient>
        <clipPath id={`${uid}-basin`}>
          <rect
            x={BASIN_L}
            y={STAFF_TOP}
            width={BASIN_W}
            height={STAFF_H}
          />
        </clipPath>
      </defs>

      <rect width="1400" height="900" fill={`url(#${uid}-sky)`} />

      {/* Horizon 24h sets */}
      <text
        x="168"
        y="38"
        fill="#8b8d99"
        className="tide-clock-label"
        fontFamily="ui-monospace, monospace"
        letterSpacing="2"
      >
        24H SETS · {sets24 || "—"} / 144
      </text>
      {Array.from({ length: 24 }, (_, i) => (
        <rect
          key={i}
          x={168 + i * 40.4}
          y={46}
          width="28"
          height={i < setMarks ? 14 : 5}
          fill={i < setMarks ? "#ff7a18" : "rgba(236,234,228,0.16)"}
        />
      ))}

      {/* King-tide seasonal arc */}
      <path
        d={arc}
        fill="none"
        stroke="rgba(255,122,24,0.18)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d={arc}
        fill="none"
        stroke={`url(#${uid}-king)`}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={arcLen}
        strokeDashoffset={arcLen * (1 - season)}
      />
      <text
        x="700"
        y="118"
        textAnchor="middle"
        fill="#ff7a18"
        className="tide-clock-label"
        fontFamily="ui-monospace, monospace"
        letterSpacing="1.6"
      >
        KING TIDE · HALVING {seasonPct(snapshot)} ·{" "}
        {snapshot.blocksToHalving !== null
          ? `${formatInteger(snapshot.blocksToHalving)} BLKS`
          : "—"}
      </text>

      {/* Staff rails */}
      <path
        d={`M ${BASIN_L} ${STAFF_TOP} L ${BASIN_L} ${STAFF_BOTTOM} L ${BASIN_R} ${STAFF_BOTTOM} L ${BASIN_R} ${STAFF_TOP}`}
        fill="none"
        stroke="#3dfff3"
        strokeOpacity="0.45"
        strokeWidth="2"
      />
      <path
        d={`M ${BASIN_L - 10} ${STAFF_TOP} L ${BASIN_L - 10} ${STAFF_BOTTOM + 8} L ${BASIN_R + 10} ${STAFF_BOTTOM + 8} L ${BASIN_R + 10} ${STAFF_TOP}`}
        fill="none"
        stroke="#05080d"
        strokeWidth="8"
      />

      {/* Supply staff marks */}
      {[0, 0.25, 0.5, 0.75, 0.95, 1].map((mark) => {
        const y = STAFF_BOTTOM - mark * STAFF_H;
        return (
          <g key={mark}>
            <line
              x1={BASIN_L - 22}
              x2={BASIN_L}
              y1={y}
              y2={y}
              stroke="#3dfff3"
              strokeOpacity="0.45"
            />
            <text
              x={BASIN_L - 28}
              y={y + 4}
              fill="#8b8d99"
              className="tide-clock-tick"
              fontFamily="ui-monospace, monospace"
              textAnchor="end"
            >
              {Math.round(mark * 100)}
            </text>
          </g>
        );
      })}
      <text
        x={BASIN_L - 28}
        y={STAFF_TOP - 16}
        fill="#8b8d99"
        className="tide-clock-tick"
        fontFamily="ui-monospace, monospace"
        textAnchor="end"
      >
        WATER %
      </text>

      {/* Water = supply */}
      <g clipPath={`url(#${uid}-basin)`}>
        <rect
          x={BASIN_L}
          y={waterY}
          width={BASIN_W}
          height={STAFF_BOTTOM - waterY}
          fill={`url(#${uid}-water)`}
        />
        <path
          d={surfacePath(BASIN_L, BASIN_R, surfaceY, t)}
          fill={`url(#${uid}-sheen)`}
        />
        <path
          d={surfaceLine(BASIN_L, BASIN_R, surfaceY, t)}
          fill="none"
          stroke="#3dfff3"
          strokeWidth="2.4"
        />
      </g>

      {/* High-tide 21M */}
      <line
        x1={BASIN_L}
        x2={BASIN_R}
        y1={STAFF_TOP}
        y2={STAFF_TOP}
        stroke="#ff7a18"
        strokeDasharray="7 6"
        strokeOpacity="0.85"
      />
      <text
        x={BASIN_R + 14}
        y={STAFF_TOP + 4}
        fill="#ff7a18"
        className="tide-clock-label"
        fontFamily="ui-monospace, monospace"
      >
        HIGH TIDE · 21M
      </text>

      {/* Difficulty tide marker */}
      <g transform={`translate(${BASIN_R} ${tideY})`}>
        <polygon points="0,0 18,-9 18,9" fill="#ff2ec4" />
        <text
          x="26"
          y="-12"
          fill="#ff2ec4"
          className="tide-clock-read"
          fontFamily="ui-monospace, monospace"
        >
          TIDE TURNING
        </text>
        <text
          x="26"
          y="10"
          fill="#eceae4"
          className="tide-clock-read"
          fontFamily="ui-monospace, monospace"
        >
          {snapshot.difficultyProgressPercent !== null
            ? `${snapshot.difficultyProgressPercent.toFixed(1)}%`
            : "—"}
          {snapshot.remainingBlocksToRetarget !== null
            ? ` · ${formatInteger(snapshot.remainingBlocksToRetarget)} blks`
            : ""}
        </text>
      </g>

      {/* Callouts on the water */}
      <text
        x={BASIN_L + 18}
        y={Math.min(STAFF_BOTTOM - 48, waterY + 36)}
        fill="#eceae4"
        className="tide-clock-read"
        fontFamily="ui-monospace, monospace"
      >
        WATER · SUPPLY{" "}
        {snapshot.supplyPercent !== null
          ? `${snapshot.supplyPercent.toFixed(2)}%`
          : "—"}
      </text>
      <text
        x={BASIN_L + 18}
        y={Math.min(STAFF_BOTTOM - 28, waterY + 58)}
        fill="#8b8d99"
        className="tide-clock-label"
        fontFamily="ui-monospace, monospace"
      >
        {snapshot.supplyIssued !== null
          ? `${formatInteger(Math.round(snapshot.supplyIssued))} / 21,000,000`
          : "issued / 21M"}
      </text>

      <text
        x={BASIN_L + 18}
        y={Math.max(STAFF_TOP + 32, surfaceY - 20)}
        fill="#3dfff3"
        className="tide-clock-read"
        fontFamily="ui-monospace, monospace"
      >
        SWELL · {formatBlockAge(ageSec)} · {swellLabel(ageSec).toUpperCase()}
      </text>
    </svg>
  );
}

export function swellLabel(ageSec: number) {
  if (ageSec < 180) return "set just passed";
  if (ageSec < 480) return "swell building";
  if (ageSec < 720) return "peak window";
  return "overdue · closeout risk";
}

export function setCondition(blocks: number | null) {
  if (blocks === null) return "—";
  if (blocks >= 156) return "running hot";
  if (blocks >= 148) return "pushing";
  if (blocks >= 140) return "on schedule";
  if (blocks >= 132) return "slack";
  return "thin sets";
}

export function TideRead({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "cyan" | "magenta" | "sats";
}) {
  return (
    <div className="panel min-w-0 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 break-words font-display text-xl font-bold uppercase tracking-tight",
          tone === "cyan" && "text-cyan",
          tone === "magenta" && "text-magenta",
          tone === "sats" && "text-sats",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function seasonPct(snapshot: TimechainSnapshot) {
  return snapshot.halvingProgressPercent !== null
    ? `${snapshot.halvingProgressPercent.toFixed(1)}%`
    : "—";
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function kingArcPath(x1: number, x2: number, y: number, lift: number) {
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y} Q ${mid} ${y - lift} ${x2} ${y}`;
}

function surfacePath(x1: number, x2: number, y: number, t: number) {
  const c1 = x1 + (x2 - x1) * 0.28;
  const c2 = x1 + (x2 - x1) * 0.62;
  const w1 = Math.sin(t) * 8;
  const w2 = Math.cos(t * 0.85) * 7;
  return `M ${x1} 820 L ${x1} ${y + 4} C ${c1} ${y - 16 + w1} ${c2} ${y + 10 + w2} ${x2} ${y + 2} L ${x2} 820 Z`;
}

function surfaceLine(x1: number, x2: number, y: number, t: number) {
  const c1 = x1 + (x2 - x1) * 0.28;
  const c2 = x1 + (x2 - x1) * 0.62;
  const w1 = Math.sin(t) * 8;
  const w2 = Math.cos(t * 0.85) * 7;
  return `M ${x1} ${y + 4} C ${c1} ${y - 16 + w1} ${c2} ${y + 10 + w2} ${x2} ${y + 2}`;
}
