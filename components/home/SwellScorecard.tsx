"use client";

import { useTimechainSnapshot } from "@/components/timechain/useTimechainSnapshot";
import { cn } from "@/lib/cn";
import { swellFromPct } from "@/lib/swell";
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
      <aside className="swell-card swell-card-idle">
        <p className="swell-card-kicker">Swell</p>
        <p className="swell-card-size text-muted">—</p>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          waiting on 24h print
        </p>
      </aside>
    );
  }

  const up = swell.direction === "up";
  const meter = Math.min(100, (Math.abs(swell.pct) / 10) * 100);

  return (
    <aside
      className={cn("swell-card", up ? "swell-card-up" : "swell-card-down")}
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
  );
}

function WaveGlyph({ up }: { up: boolean }) {
  if (up) {
    return (
      <svg viewBox="0 0 64 40" className="swell-glyph" aria-hidden="true">
        <path
          d="M2 28 C10 28 12 12 22 12 C32 12 34 28 44 22 C54 16 56 8 62 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M44 22 C50 10 56 6 62 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 40" className="swell-glyph" aria-hidden="true">
      <path
        d="M2 10 C12 10 14 22 24 22 C34 22 36 8 46 14 C52 18 56 30 62 34"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M46 14 C50 26 54 32 62 36"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
