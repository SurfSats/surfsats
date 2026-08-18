"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { TimechainSnapshot } from "@/lib/timechain";

const TARGET_BLOCK_SEC = 600;

export function TideClock({ snapshot }: { snapshot: TimechainSnapshot }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const ageSec =
    snapshot.lastBlockTimestamp !== null
      ? Math.max(0, now / 1000 - snapshot.lastBlockTimestamp)
      : 0;
  const swell = Math.min(1.25, ageSec / TARGET_BLOCK_SEC);
  const supply = (snapshot.supplyPercent ?? 0) / 100;
  const tide = (snapshot.difficultyProgressPercent ?? 0) / 100;
  const season = (snapshot.halvingProgressPercent ?? 0) / 100;
  const sets24 = Math.min(24, Math.round((snapshot.blocksLast24h ?? 0) / 6));

  const waterTop = 420 - supply * 250;
  const swellLift = swell * 36;

  return (
    <div className="overflow-hidden border border-cyan/30 bg-black">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        <span className="text-cyan">gauge://tide</span>
        <span className="text-sats">ocean time · live</span>
      </div>
      <svg
        viewBox="0 0 420 520"
        className="h-auto w-full"
        role="img"
        aria-label="Tide clock showing Bitcoin supply, last block swell, difficulty tide, and halving season"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#05060c" />
            <stop offset="100%" stopColor="#0a1520" />
          </linearGradient>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3dfff3" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#0d5a6a" />
            <stop offset="100%" stopColor="#071018" />
          </linearGradient>
          <linearGradient id="king" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff7a18" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#ff7a18" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ff7a18" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <rect width="420" height="520" fill="url(#sky)" />

        {/* 24h set ticks along the horizon */}
        {Array.from({ length: 24 }, (_, i) => (
          <rect
            key={i}
            x={48 + i * 13.4}
            y={78}
            width="8"
            height={i < sets24 ? 10 : 4}
            fill={i < sets24 ? "#ff7a18" : "rgba(236,234,228,0.18)"}
          />
        ))}
        <text x="48" y="72" fill="#8b8d99" fontSize="9" fontFamily="monospace">
          24H SETS
        </text>

        {/* Staff / basin walls */}
        <path
          d="M70 110 L70 450 L350 450 L350 110"
          fill="none"
          stroke="#3dfff3"
          strokeOpacity="0.45"
          strokeWidth="2"
        />
        <path
          d="M58 110 L58 458 L362 458 L362 110"
          fill="none"
          stroke="#05080d"
          strokeWidth="6"
        />

        {/* Staff hash marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((mark) => {
          const y = 450 - mark * 250;
          return (
            <g key={mark}>
              <line
                x1="58"
                x2="78"
                y1={y}
                y2={y}
                stroke="#3dfff3"
                strokeOpacity="0.5"
              />
              <text
                x="50"
                y={y + 3}
                fill="#8b8d99"
                fontSize="8"
                fontFamily="monospace"
                textAnchor="end"
              >
                {Math.round(mark * 100)}
              </text>
            </g>
          );
        })}

        {/* Supply water */}
        <rect
          x="72"
          y={waterTop}
          width="276"
          height={450 - waterTop}
          fill="url(#water)"
        />

        {/* King-tide / halving season current */}
        <rect
          x="72"
          y={450 - 28}
          width={276 * Math.max(0.08, season)}
          height="18"
          fill="url(#king)"
        />

        {/* Surface swell = time since last block */}
        <path
          d={surfacePath(72, 348, waterTop, swellLift, now / 400)}
          fill="#3dfff3"
          fillOpacity="0.35"
        />
        <path
          d={surfacePath(72, 348, waterTop, swellLift, now / 400)}
          fill="none"
          stroke="#3dfff3"
          strokeWidth="2"
        />

        {/* Tide-turning marker = difficulty cycle */}
        <g transform={`translate(350 ${450 - tide * 250})`}>
          <polygon points="0,0 16,-7 16,7" fill="#ff2ec4" />
          <text
            x="20"
            y="4"
            fill="#ff2ec4"
            fontSize="8"
            fontFamily="monospace"
          >
            TIDE
          </text>
        </g>

        {/* High-tide mark = 21M */}
        <line
          x1="72"
          x2="348"
          y1="170"
          y2="170"
          stroke="#ff7a18"
          strokeDasharray="5 4"
          strokeOpacity="0.7"
        />
        <text x="352" y="173" fill="#ff7a18" fontSize="8" fontFamily="monospace">
          21M
        </text>

        <text
          x="210"
          y="488"
          fill="#8b8d99"
          fontSize="10"
          fontFamily="monospace"
          textAnchor="middle"
        >
          SUPPLY = WATER · LAST BLOCK = SWELL
        </text>
      </svg>
    </div>
  );
}

function surfacePath(
  x1: number,
  x2: number,
  baseY: number,
  lift: number,
  t: number,
) {
  const mid = (x1 + x2) / 2;
  const y = baseY - lift;
  const wobble = Math.sin(t) * 6;
  return `M ${x1} 450 L ${x1} ${y} Q ${mid} ${y - 18 - wobble} ${x2} ${y + 4} L ${x2} 450 Z`;
}

export function swellLabel(ageSec: number) {
  if (ageSec < 180) return "set just passed";
  if (ageSec < 480) return "swell building";
  if (ageSec < 720) return "peak window";
  return "overdue · closeout risk";
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
