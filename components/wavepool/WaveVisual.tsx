import { cn } from "@/lib/cn";
import type { PriceDirection } from "@/lib/timechain";
import { WAVE_POOL_GOAL_SATS, poolProgress } from "@/lib/wavepool";

type WaveMode = "barrel" | "closeout" | "chop" | "complete";

export function waveModeFromDirection(
  direction: PriceDirection | null,
  complete: boolean,
): WaveMode {
  // 24h swell picks the break. Complete overrides into a celebration set.
  if (complete) return "complete";
  if (direction === "up") return "barrel";
  if (direction === "down") return "closeout";
  return "chop";
}

export function WaveVisual({
  total,
  direction,
  complete,
}: {
  total: number;
  direction: PriceDirection | null;
  complete: boolean;
}) {
  const mode = waveModeFromDirection(direction, complete);
  const progress = poolProgress(total);
  const fill = 22 + progress * 58;
  const energy = 0.35 + progress * 0.65;

  return (
    <div
      className={cn(
        "relative overflow-hidden border bg-black",
        mode === "barrel" && "border-cyan/45",
        mode === "closeout" && "border-magenta/50",
        mode === "chop" && "border-sats/40",
        mode === "complete" && "border-sats",
      )}
      data-wave-mode={mode}
      data-wave-progress={progress.toFixed(3)}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        <span className="text-cyan">crt://wave</span>
        <span
          className={cn(
            mode === "barrel" && "text-cyan",
            mode === "closeout" && "text-magenta",
            mode === "chop" && "text-sats",
            mode === "complete" && "text-sats",
          )}
        >
          {mode === "barrel" && "barrel · rising tide"}
          {mode === "closeout" && "closeout · wipeout"}
          {mode === "chop" && "chop · sideways"}
          {mode === "complete" && "set unlocked"}
        </span>
      </div>

      <div className="relative h-[300px] sm:h-[400px] lg:h-[460px]">
        <svg
          viewBox="0 0 1000 500"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#05060c" />
              <stop offset="70%" stopColor="#0a1220" />
              <stop offset="100%" stopColor="#061018" />
            </linearGradient>
            <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={mode === "closeout" ? "#5b1a44" : "#0e3d4f"} />
              <stop offset="100%" stopColor="#05080d" />
            </linearGradient>
            <linearGradient id="face" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={mode === "closeout" ? "#ff2ec4" : "#3dfff3"} />
              <stop offset="55%" stopColor={mode === "complete" ? "#ff7a18" : "#1a8a9c"} />
              <stop offset="100%" stopColor="#071018" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="1000" height="500" fill="url(#sky)" />

          <rect
            x="0"
            y={500 - fill * 4.2}
            width="1000"
            height={fill * 4.2 + 40}
            fill="url(#sea)"
            opacity={0.55 + progress * 0.35}
          />

          <g
            className={mode === "closeout" ? "wave-crash" : "wave-swell"}
            style={{ opacity: energy }}
          >
            <path
              d="M-40 360 C 80 330, 180 390, 320 350 C 460 308, 560 400, 700 340 C 820 296, 920 360, 1040 330 L 1040 520 L -40 520 Z"
              fill="url(#sea)"
              opacity="0.85"
            />

            {mode === "closeout" ? (
              <>
                <path
                  d="M420 330 C 520 210, 640 120, 760 90 C 820 180, 860 250, 900 330 C 780 300, 620 360, 420 330 Z"
                  fill="url(#face)"
                  filter="url(#glow)"
                />
                <path
                  d="M700 95 C 780 40, 860 70, 930 160"
                  fill="none"
                  stroke="#ff2ec4"
                  strokeWidth="6"
                  opacity="0.8"
                />
                <circle className="foam-pop" cx="780" cy="70" r="8" fill="#eceae4" />
                <circle className="foam-pop" cx="830" cy="110" r="5" fill="#ff2ec4" />
                <circle className="foam-pop" cx="880" cy="150" r="7" fill="#eceae4" />
                <circle className="foam-pop" cx="740" cy="130" r="4" fill="#ff7a18" />
              </>
            ) : (
              <>
                <path
                  d="M380 340 C 500 250, 560 160, 620 130 C 690 100, 760 130, 810 210 C 780 250, 730 270, 690 250 C 650 228, 630 250, 610 300 C 540 350, 450 360, 380 340 Z"
                  fill="url(#face)"
                  filter="url(#glow)"
                />
                <ellipse
                  className="tube-glow"
                  cx="690"
                  cy="210"
                  rx="42"
                  ry="28"
                  fill="#05080d"
                  stroke={mode === "complete" ? "#ff7a18" : "#3dfff3"}
                  strokeWidth="4"
                />
                <path
                  d="M560 150 C 640 90, 740 90, 820 170"
                  fill="none"
                  stroke={mode === "complete" ? "#ff7a18" : "#3dfff3"}
                  strokeWidth="5"
                  opacity="0.75"
                />
                <circle className="foam-pop" cx="800" cy="150" r="6" fill="#eceae4" />
                <circle className="foam-pop" cx="760" cy="120" r="4" fill="#3dfff3" />
              </>
            )}
          </g>

          {mode === "complete" ? (
            <path
              d="M500 70 L520 140 H590 L535 180 L555 250 L500 205 L445 250 L465 180 L410 140 H480 Z"
              fill="#ff7a18"
              opacity="0.9"
              filter="url(#glow)"
            />
          ) : null}
        </svg>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.14em]">
            <span className="text-cyan">
              {Math.round(progress * 100)}% charged
            </span>
            <span className="text-sats">
              {Math.min(total, WAVE_POOL_GOAL_SATS)} / {WAVE_POOL_GOAL_SATS} sats
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden border border-cyan/25 bg-black/60">
            <div
              className={cn(
                "h-full",
                mode === "closeout" ? "bg-magenta" : "bg-sats",
              )}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
