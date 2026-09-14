"use client";

import type { ArcadeScreenMode } from "@/components/arcade/ArcadeScreen";
import { verbPressProps } from "@/lib/verb-press";
import {
  ARCADE_PRICE_SATS,
  PLEB_BOX_ATTRACT,
  PLEB_BOX_LABEL,
  plebBoxGame,
  type PlebBoxGameId,
} from "@/lib/arcade";

export function PlebBoxScreen({
  mode,
  credits,
  game,
  onInsert,
}: {
  mode: ArcadeScreenMode;
  credits: number;
  game: PlebBoxGameId;
  onInsert: () => void;
}) {
  const tab = plebBoxGame(game);
  const paying = mode === "invoice";

  return (
    <div className="cab-crt cab-crt-photo cab-crt-pleb">
      <div className="cab-crt-well" />
      <div className="cab-crt-glass" aria-hidden="true" />
      <div className="cab-crt-scan" aria-hidden="true" />

      {paying ? (
        <div className="cab-crt-attract">
          <p className="cab-crt-insert cab-crt-blink">
            PAY {ARCADE_PRICE_SATS} SATS
          </p>
          <p className="cab-crt-sub">
            {PLEB_BOX_LABEL} · {tab.label}
          </p>
        </div>
      ) : (
        <div className="cab-crt-attract">
          <button
            type="button"
            className="cab-crt-verb"
            {...verbPressProps}
            onClick={credits > 0 ? undefined : onInsert}
          >
            <p className="cab-crt-insert cab-crt-blink">{tab.label}</p>
            <p className="cab-crt-sub">
              {credits > 0 ? tab.line : PLEB_BOX_ATTRACT}
            </p>
          </button>
        </div>
      )}
    </div>
  );
}
