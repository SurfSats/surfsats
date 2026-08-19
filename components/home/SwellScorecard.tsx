"use client";

import { useTimechainSnapshot } from "@/components/timechain/useTimechainSnapshot";
import { cn } from "@/lib/cn";
import { SWELL_SCALE, swellFromPct } from "@/lib/swell";
import { formatChange, type TimechainSnapshot } from "@/lib/timechain";

export function SwellScorecard({
  initial,
}: {
  initial: TimechainSnapshot | null;
}) {
  const { snapshot } = useTimechainSnapshot(initial);
  const pct = snapshot.priceChangePct;
  const swell = pct !== null ? swellFromPct(pct) : null;

  if (!swell) {
    return (
      <div className="swell-stack swell-card-idle">
        <aside className="swell-card">
          <p className="swell-card-kicker">Swell</p>
          <p className="swell-card-size text-muted">—</p>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            waiting on 24h print
          </p>
        </aside>
      </div>
    );
  }

  const up = swell.direction === "up";
  const meter = Math.min(100, (Math.abs(swell.pct) / 10) * 100);

  return (
    <div className={cn("swell-stack", up ? "swell-card-up" : "swell-card-down")}>
      <aside
        className="swell-card"
        aria-label={`Swell ${swell.size}, ${swell.rating}, ${formatChange(swell.pct)} 24h`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="swell-card-kicker">Swell</p>
          <WaveGlyph up={up} />
        </div>
        <p className="swell-card-size">{swell.size}</p>
        <p className="swell-card-rating">{swell.rating}</p>
        <p className="swell-card-pct">
          {formatChange(swell.pct)}
          <span> 24h</span>
        </p>
        <div className="swell-card-meter" aria-hidden="true">
          <span style={{ width: `${meter}%` }} />
        </div>
      </aside>
      <ol className="swell-legend" aria-label="Swell size scale">
        {SWELL_SCALE.map((row) => (
          <li
            key={row.label}
            className={cn(
              "swell-legend-row",
              swell.size === row.label && "swell-legend-active",
            )}
          >
            <span>{row.range}</span>
            <span>{row.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function WaveGlyph({ up }: { up: boolean }) {
  if (up) {
    return (
      <svg viewBox="0 0 96 58" className="swell-glyph" aria-hidden="true">
        <path
          d="M4 50 C18 50 24 38 34 30 C44 22 50 16 56 10 C62 4 70 3 80 8 C76 20 68 30 56 38 C42 48 28 52 4 50 Z"
          fill="currentColor"
          opacity="0.16"
        />
        <path
          d="M8 48 C22 46 30 34 40 26 C50 18 58 12 70 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M14 48 C26 42 34 32 46 24 C54 18 62 14 74 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          opacity="0.75"
          strokeLinecap="round"
        />
        <path
          d="M22 48 C32 40 40 32 52 26"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          opacity="0.5"
          strokeLinecap="round"
        />
        <path
          d="M68 9 C76 6 84 5 92 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M72 14 C80 10 86 8 93 9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          opacity="0.6"
          strokeLinecap="round"
        />
        <circle cx="82" cy="7" r="1.2" fill="currentColor" />
        <circle cx="88" cy="5" r="0.9" fill="currentColor" />
        <circle cx="91" cy="10" r="0.8" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 96 58" className="swell-glyph" aria-hidden="true">
      <path
        d="M4 18 C16 16 22 28 32 34 C42 40 50 36 56 28 C62 20 66 14 72 22 C78 32 84 46 94 52 L4 52 Z"
        fill="currentColor"
        opacity="0.16"
      />
      <path
        d="M6 20 C18 18 24 30 34 36 C46 44 56 34 64 26 C70 20 76 28 86 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M12 22 C22 28 30 36 42 42 C50 46 58 40 66 34"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.7"
        strokeLinecap="round"
      />
      <path
        d="M58 28 C66 36 74 46 86 52"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M62 32 C70 42 78 50 90 54"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.55"
        strokeLinecap="round"
      />
      <circle cx="80" cy="46" r="1.1" fill="currentColor" />
      <circle cx="86" cy="50" r="0.9" fill="currentColor" />
      <circle cx="91" cy="48" r="0.7" fill="currentColor" />
    </svg>
  );
}
