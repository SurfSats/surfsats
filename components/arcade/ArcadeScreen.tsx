"use client";

import { ARCADE_PRICE_SATS } from "@/lib/arcade";

export type ArcadeScreenMode = "attract" | "invoice" | "ready" | "playing";

export function ArcadeScreen({
  mode,
  credits,
  waiting,
  invoiceError,
  expired,
}: {
  mode: ArcadeScreenMode;
  credits: number;
  waiting: boolean;
  invoiceError: string | null;
  expired: boolean;
}) {
  return (
    <div className="cab-crt">
      <div className="cab-crt-glass" aria-hidden="true" />
      <div className="cab-crt-scan" aria-hidden="true" />
      <p className="cab-crt-1up">1UP</p>

      {mode === "invoice" ? (
        <div className="cab-crt-attract">
          <PixelWave />
          <p className="cab-crt-insert cab-crt-blink">
            {expired ? "INVOICE EXPIRED" : `PAY ${ARCADE_PRICE_SATS} SATS`}
          </p>
          <p className="cab-crt-sub">
            {invoiceError
              ? invoiceError
              : waiting
                ? "LOOK AT THE COIN DOOR"
                : "SCAN THE COIN DOOR"}
          </p>
        </div>
      ) : null}

      {mode === "playing" ? (
        <div className="cab-crt-play">
          <PixelWave riding />
          <p className="cab-crt-insert cab-crt-blink">WAVE-1 DEMO</p>
          <p className="cab-crt-sub">CABINET WARMING UP</p>
        </div>
      ) : null}

      {mode === "ready" ? (
        <div className="cab-crt-attract">
          <PixelWave />
          <p className="cab-crt-insert cab-crt-blink">PRESS START</p>
          <p className="cab-crt-sub">
            {credits} CREDIT{credits === 1 ? "" : "S"}
          </p>
        </div>
      ) : null}

      {mode === "attract" ? (
        <div className="cab-crt-attract">
          <PixelWave />
          <p className="cab-crt-insert cab-crt-blink">INSERT COIN</p>
          <p className="cab-crt-sub">{ARCADE_PRICE_SATS} SATS · 3 CREDITS</p>
        </div>
      ) : null}
    </div>
  );
}

function PixelWave({ riding = false }: { riding?: boolean }) {
  return (
    <svg
      className={riding ? "cab-wave cab-wave-ride" : "cab-wave"}
      viewBox="0 0 220 110"
      aria-hidden="true"
    >
      <circle cx="168" cy="22" r="10" fill="#d7f4ff" opacity="0.85" />
      <path
        d="M8 86c22-28 44-28 66 0s44 28 66 0 44-28 66 0"
        fill="none"
        stroke="#3df0ff"
        strokeWidth="6"
        strokeLinecap="square"
      />
      <path
        d="M8 96c22-22 44-22 66 0s44 22 66 0 44-22 66 0"
        fill="none"
        stroke="#146a88"
        strokeWidth="8"
      />
      <path
        d="M92 58c8-2 18 6 28 8 6 1 10 8 4 12-8 6-24 6-34-2-6-6-6-16 2-18Z"
        fill="#cfd8dc"
      />
      <path d="M108 50 118 62 104 62Z" fill="#f4c430" />
      <rect x="112" y="40" width="8" height="14" fill="#f0e6d4" />
      <circle cx="116" cy="36" r="5" fill="#f0e6d4" />
    </svg>
  );
}
