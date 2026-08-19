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
          <Corners />
          <p className="swell-card-kicker">Swell</p>
          <p className="swell-card-size text-muted">—</p>
          <p className="swell-card-sub">waiting on 24h print</p>
        </aside>
      </div>
    );
  }

  const up = swell.direction === "up";
  const meter = Math.min(100, (Math.abs(swell.pct) / 10) * 100);
  const ladder = up ? "EPIC / GOOD / FAIR" : "POOR / CLOSEOUT / BLOWN OUT";

  return (
    <div className={cn("swell-stack", up ? "swell-card-up" : "swell-card-down")}>
      <aside
        className="swell-card"
        aria-label={`Swell ${swell.size}, ${swell.rating}, ${formatChange(swell.pct)} 24h`}
      >
        <Corners />
        <div
          className={cn("swell-art", up ? "swell-wave-up" : "swell-wave-down")}
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={up ? "/swell-wave-up.jpg" : "/swell-wave-down.jpg"}
            alt=""
          />
        </div>
        <BitcoinMark />
        <div className="swell-copy">
          <p className="swell-card-kicker">Swell</p>
          <p className="swell-card-size">{swell.size}</p>
          <p className="swell-card-rating">{swell.rating}</p>
          <p className="swell-card-sub">
            {up ? "Up day" : "Down day"} — {ladder}
          </p>
          <p className="swell-card-pct">
            {formatChange(swell.pct)}
            <span>24h</span>
          </p>
          <div className="swell-card-meter" aria-hidden="true">
            <b style={{ width: `${meter}%` }} />
            <em>0%</em>
            <i>10%+</i>
          </div>
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

function Corners() {
  return (
    <span className="swell-corners" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

function BitcoinMark() {
  return (
    <span className="swell-btc">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <text
          x="12"
          y="16"
          textAnchor="middle"
          fill="currentColor"
          fontSize="11"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontWeight="700"
        >
          ₿
        </text>
      </svg>
      <span className="swell-btc-pulse" />
    </span>
  );
}
