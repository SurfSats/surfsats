"use client";

import Image from "next/image";
import { PlebBoxScreen } from "@/components/arcade/PlebBoxScreen";
import { CreditLed } from "@/components/arcade/CreditLed";
import { CallsignField } from "@/components/glass/CallsignField";
import type { ArcadeScreenMode } from "@/components/arcade/ArcadeScreen";
import { verbPressProps } from "@/lib/verb-press";
import {
  ARCADE_CREDITS_PER_PAY,
  ARCADE_PRICE_SATS,
  PLEB_BOX_GAMES,
  PLEB_BOX_LABEL,
  sanitizeAlias,
  type PlebBoxGameId,
} from "@/lib/arcade";

export function PlebBoxCabinet({
  alias,
  credits,
  mode,
  pending,
  error,
  game,
  onInsert,
  onSelectGame,
}: {
  alias: string;
  credits: number;
  mode: ArcadeScreenMode;
  pending: boolean;
  error: string | null;
  game: PlebBoxGameId;
  onInsert: () => void;
  onSelectGame: (id: PlebBoxGameId) => void;
}) {
  const aliasOk = sanitizeAlias(alias).ok;
  const paying = mode === "invoice";
  const showInsert = credits < 1 && mode !== "invoice";

  return (
    <div className="cab-wrap">
      <div className="cab-machine cab-machine-pleb">
        <div className="cab-body">
          <p className="cab-plate">{PLEB_BOX_LABEL}</p>
          <Image
            src="/arcade-cabinet-wide.png"
            alt="SurfSats Pleb Box arcade cabinet"
            width={1712}
            height={1152}
            priority
            unoptimized
            className="cab-art"
            sizes="(max-width: 900px) 96vw, 58rem"
          />

          <div className="cab-crt-slot">
            <PlebBoxScreen
              mode={mode}
              credits={credits}
              game={game}
              onInsert={onInsert}
            />
          </div>
        </div>

        <div className="cab-games" role="tablist" aria-label="Pleb Box games">
          {PLEB_BOX_GAMES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={game === item.id}
              className={
                game === item.id
                  ? "cab-game-btn pleb-tab is-on"
                  : "cab-game-btn pleb-tab"
              }
              disabled={paying}
              onClick={() => onSelectGame(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="cab-coin cab-coin-plate" id="arcade-coin-pleb">
          <div className="cab-coin-top">
            {showInsert ? (
              <button
                type="button"
                className="cab-insert cab-insert-primary cab-till-insert"
                {...verbPressProps}
                disabled={!aliasOk || pending || paying}
                onClick={onInsert}
              >
                {pending
                  ? "BUILDING INVOICE…"
                  : `INSERT ${ARCADE_PRICE_SATS} SATS`}
                <span>
                  {pending
                    ? "LIGHTNING"
                    : `GET INVOICE · ${ARCADE_CREDITS_PER_PAY} CREDITS`}
                </span>
              </button>
            ) : null}
            <div className="cab-led">
              <p>CREDITS</p>
              <CreditLed credits={credits} />
            </div>
          </div>

          {showInsert && !aliasOk ? (
            <CallsignField
              className="cab-alias cab-till-alias"
              label="CALLSIGN · REQUIRED"
              placeholder="HOPE"
              disabled={paying || pending}
            />
          ) : null}

          {!aliasOk && showInsert ? (
            <p className="cab-hint">
              <span className="cab-hint-glass">
                CALLSIGN ON THE GLASS · THEN INSERT
              </span>
              <span className="cab-hint-till">
                ENTER CALLSIGN (2–16) THEN INSERT
              </span>
            </p>
          ) : null}

          {error ? <p className="cab-error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
