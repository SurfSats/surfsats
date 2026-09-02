"use client";

import { useState } from "react";
import { useTimechainSnapshot } from "@/components/timechain/useTimechainSnapshot";
import { cn } from "@/lib/cn";
import { SWELL_SCALE, swellFromPct } from "@/lib/swell";
import { formatChange, type TimechainSnapshot } from "@/lib/timechain";

const WAVE = {
  up: "/swell-wave-up.jpg",
  down: "/swell-wave-down.jpg",
} as const;

export function SwellScorecard({
  initial,
}: {
  initial: TimechainSnapshot | null;
}) {
  const { snapshot } = useTimechainSnapshot(initial);
  const pct = snapshot.priceChangePct;
  const swell = pct !== null ? swellFromPct(pct) : null;
  const [artMissing, setArtMissing] = useState(false);
  const up = swell?.direction !== "down";
  const meter =
    swell !== null ? Math.min(100, (Math.abs(swell.pct) / 10) * 100) : 0;
  const ladder = up ? "EPIC / GOOD / FAIR" : "POOR / CLOSEOUT / BLOWN OUT";
  const size = swell?.size ?? "—";
  const src = up ? WAVE.up : WAVE.down;

  return (
    <div
      className={cn(
        "swell-stack",
        swell ? (up ? "swell-card-up" : "swell-card-down") : "swell-card-idle",
      )}
      data-art={artMissing ? "missing" : undefined}
      style={{ minHeight: "21.75rem" }}
    >
      <aside
        className="swell-card"
        style={{ position: "relative", overflow: "hidden", minHeight: "13.5rem" }}
        aria-label={
          swell
            ? `Swell ${swell.size}, ${swell.rating}, ${formatChange(swell.pct)} 24h`
            : "Swell waiting on 24h print"
        }
      >
        <Corners />
        <div
          className={cn("swell-art", up ? "swell-wave-up" : "swell-wave-down")}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "0 0 0 auto",
            width: "62%",
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            width={1168}
            height={784}
            decoding="async"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              maxWidth: "none",
              objectFit: "cover",
            }}
            onLoad={() => setArtMissing(false)}
            onError={() => setArtMissing(true)}
          />
        </div>
        <BitcoinMark />
        <div className="swell-copy">
          <p className="swell-card-kicker">Swell</p>
          <p className={cn("swell-card-size", !swell && "text-muted")}>{size}</p>
          <p className="swell-card-rating">{swell?.rating ?? "—"}</p>
          <p className="swell-card-sub">
            {swell
              ? `${up ? "Up day" : "Down day"} — ${ladder}`
              : "waiting on 24h print"}
          </p>
          <p className="swell-card-pct">
            {swell ? formatChange(swell.pct) : "—"}
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
              swell?.size === row.label && "swell-legend-active",
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
