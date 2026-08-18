import { cn } from "@/lib/cn";
import type { PriceDirection } from "@/lib/timechain";
import { formatChange, formatUsd } from "@/lib/timechain";
import { WAVE_POOL_GOAL_SATS, poolProgress } from "@/lib/wavepool";

export type WaveMode = "barrel" | "closeout" | "chop" | "complete";

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
  changePct,
  priceUsd,
  complete,
}: {
  total: number;
  direction: PriceDirection | null;
  changePct: number | null;
  priceUsd: number | null;
  complete: boolean;
}) {
  const mode = waveModeFromDirection(direction, complete);
  const progress = poolProgress(total);
  const fill = 18 + progress * 64;
  const charged = Math.round(progress * 100);

  return (
    <div
      className={cn(
        "relative overflow-hidden border bg-black",
        mode === "barrel" && "border-cyan/55",
        mode === "closeout" && "border-magenta/60",
        mode === "chop" && "border-sats/45",
        mode === "complete" && "border-sats",
      )}
      data-wave-mode={mode}
      data-price-direction={direction ?? "unknown"}
      data-wave-progress={progress.toFixed(3)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em]">
        <span className="text-cyan">crt://wave</span>
        <span
          className={cn(
            "font-semibold",
            mode === "barrel" && "text-cyan",
            mode === "closeout" && "text-magenta",
            mode === "chop" && "text-sats",
            mode === "complete" && "text-sats",
          )}
        >
          {mode === "barrel" && "24h up · barrel forming"}
          {mode === "closeout" && "24h down · closeout incoming"}
          {mode === "chop" && "24h flat · sideways chop"}
          {mode === "complete" && "2100 locked · set unlocked"}
        </span>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2",
          mode === "barrel" && "border-cyan/25 bg-cyan/8",
          mode === "closeout" && "border-magenta/30 bg-magenta/10",
          mode === "chop" && "border-sats/25 bg-sats/8",
          mode === "complete" && "border-sats/40 bg-sats/12",
        )}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          btc 24h swell
        </p>
        <p
          className={cn(
            "font-display text-xl font-bold uppercase",
            mode === "barrel" && "text-cyan",
            mode === "closeout" && "text-magenta",
            mode === "chop" && "text-sats",
            mode === "complete" && "text-sats",
          )}
        >
          {changePct !== null ? formatChange(changePct) : "awaiting print"}
          {priceUsd !== null ? ` · ${formatUsd(priceUsd)}` : ""}
        </p>
      </div>

      <div className="relative h-[320px] sm:h-[420px] lg:h-[480px]">
        <svg
          viewBox="0 0 1000 500"
          className={cn(
            "absolute inset-0 h-full w-full",
            mode === "complete" && "wave-unlock",
          )}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="wp-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#04050a" />
              <stop offset="100%" stopColor="#05080d" />
            </linearGradient>
            <linearGradient id="wp-sea" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={
                  mode === "closeout"
                    ? "#4a1028"
                    : mode === "complete"
                      ? "#3a1a08"
                      : "#0a3040"
                }
              />
              <stop offset="100%" stopColor="#05080d" />
            </linearGradient>
            <linearGradient id="wp-face" x1="0" y1="0" x2="1" y2="1">
              <stop
                offset="0%"
                stopColor={mode === "closeout" ? "#ff2ec4" : "#3dfff3"}
              />
              <stop
                offset="55%"
                stopColor={mode === "complete" ? "#ff7a18" : "#0d5c6a"}
              />
              <stop offset="100%" stopColor="#05080d" />
            </linearGradient>
            <filter id="wp-glow">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="1000" height="500" fill="url(#wp-sky)" />
          <rect
            x="0"
            y={500 - fill * 4.4}
            width="1000"
            height={fill * 4.4 + 50}
            fill="url(#wp-sea)"
            opacity={0.5 + progress * 0.45}
          />

          <g
            className={
              mode === "closeout"
                ? "wave-slam"
                : mode === "complete"
                  ? "wave-unlock"
                  : "wave-swell"
            }
          >
            <path
              d="M-40 370 C 90 320, 200 410, 340 350 C 480 290, 580 420, 720 330 C 840 270, 930 370, 1060 320 L 1060 530 L -40 530 Z"
              fill="url(#wp-sea)"
            />

            {mode === "closeout" ? <CloseoutShape /> : <BarrelShape complete={mode === "complete"} />}
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                pool energy
              </p>
              <p className="font-display text-3xl font-bold uppercase tracking-tight text-sats sm:text-4xl">
                {Math.min(total, WAVE_POOL_GOAL_SATS)}
                <span className="text-lg text-muted sm:text-xl">
                  {" "}
                  / {WAVE_POOL_GOAL_SATS}
                </span>
              </p>
            </div>
            <p
              className={cn(
                "font-display text-3xl font-bold",
                mode === "closeout" ? "text-magenta" : "text-cyan",
              )}
            >
              {charged}%
            </p>
          </div>
          <div className="mt-3 h-3 overflow-hidden border border-white/15 bg-black">
            <div
              className={cn(
                "h-full transition-[width] duration-500",
                mode === "closeout" && "bg-magenta",
                mode === "barrel" && "bg-cyan",
                mode === "chop" && "bg-sats",
                mode === "complete" && "bg-sats",
              )}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BarrelShape({ complete }: { complete: boolean }) {
  return (
    <>
      <path
        d="M340 360 L420 250 L500 160 L590 110 L680 90 L760 110 L820 180 L800 240 L740 270 L700 240 L660 230 L630 290 L560 350 L450 370 Z"
        fill="url(#wp-face)"
        stroke="#05080d"
        strokeWidth="8"
        filter="url(#wp-glow)"
      />
      <path
        d="M340 360 L420 250 L500 160 L590 110 L680 90 L760 110 L820 180"
        fill="none"
        stroke={complete ? "#ff7a18" : "#3dfff3"}
        strokeWidth="4"
      />
      <ellipse
        className="tube-glow"
        cx="700"
        cy="200"
        rx="48"
        ry="30"
        fill="#05080d"
        stroke={complete ? "#ff7a18" : "#3dfff3"}
        strokeWidth="5"
      />
      <path
        d="M620 130 L650 70 L670 130"
        fill={complete ? "#ff7a18" : "#3dfff3"}
      />
      <path
        d="M700 95 L730 50 L750 110"
        fill={complete ? "#ff7a18" : "#3dfff3"}
      />
      {complete ? (
        <path
          d="M500 40 L518 118 H590 L532 162 L552 240 L500 190 L448 240 L468 162 L410 118 H482 Z"
          fill="#ff7a18"
          filter="url(#wp-glow)"
        />
      ) : null}
    </>
  );
}

function CloseoutShape() {
  return (
    <>
      <path
        d="M380 360 L500 200 L620 90 L740 40 L820 70 L880 160 L900 280 L820 250 L700 320 L560 380 Z"
        fill="url(#wp-face)"
        stroke="#05080d"
        strokeWidth="8"
        filter="url(#wp-glow)"
      />
      <path
        d="M620 90 L700 10 L760 80 L840 20 L900 110"
        fill="none"
        stroke="#ff2ec4"
        strokeWidth="6"
      />
      <path d="M680 70 L710 0 L735 75" fill="#ff7a18" />
      <path d="M760 55 L800 -10 L830 70" fill="#ff2ec4" />
      <path d="M820 90 L870 20 L900 105" fill="#eceae4" />
      <circle className="foam-pop" cx="790" cy="50" r="7" fill="#ff2ec4" />
      <circle className="foam-pop" cx="850" cy="90" r="5" fill="#eceae4" />
      <circle className="foam-pop" cx="720" cy="40" r="6" fill="#ff7a18" />
    </>
  );
}
