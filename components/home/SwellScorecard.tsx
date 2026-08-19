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
          <WaveMark up={up} />
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

function WaveMark({ up }: { up: boolean }) {
  return (
    <span className={cn("swell-wave", up ? "swell-wave-up" : "swell-wave-down")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={up ? "/swell-wave-up.jpg" : "/swell-wave-down.jpg"}
        alt=""
        width={160}
        height={96}
      />
    </span>
  );
}
