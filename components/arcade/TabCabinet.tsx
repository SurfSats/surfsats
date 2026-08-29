"use client";

import Image from "next/image";
import { TabScreen } from "@/components/arcade/TabScreen";
import type { ArcadeScreenMode } from "@/components/arcade/ArcadeScreen";
import {
  ARCADE_ALIAS_MAX,
  ARCADE_CREDITS_PER_PAY,
  ARCADE_PRICE_SATS,
  formatCredits,
  sanitizeAlias,
} from "@/lib/arcade";
import type { BarEnding, BarNode, BarTree } from "@/lib/bar-tree";

export function TabCabinet({
  alias,
  credits,
  mode,
  pending,
  error,
  tree,
  node,
  lastEnding,
  scoreRank,
  onAlias,
  onInsert,
  onSit,
  onChoose,
}: {
  alias: string;
  credits: number;
  mode: ArcadeScreenMode;
  pending: boolean;
  error: string | null;
  tree: BarTree | null;
  node: BarNode | null;
  lastEnding: BarEnding | null;
  scoreRank: number | null;
  onAlias: (value: string) => void;
  onInsert: () => void;
  onSit: () => void;
  onChoose: (next: string) => void;
}) {
  const aliasOk = sanitizeAlias(alias).ok;
  const sitting = mode === "playing";
  const paying = mode === "invoice";
  const canSit =
    Boolean(tree) &&
    credits > 0 &&
    aliasOk &&
    mode !== "invoice" &&
    mode !== "playing";
  const insertLocked = !aliasOk || pending || paying || sitting || !tree;

  return (
    <div className="cab-wrap">
      <div className="cab-machine cab-machine-tab">
        <div className="cab-body">
          <p className="cab-plate">THE TAB</p>
          <Image
            src="/arcade-cabinet-wide.png"
            alt="SurfSats THE TAB cabinet"
            width={1712}
            height={1152}
            unoptimized
            className="cab-art"
            sizes="(max-width: 900px) 96vw, 58rem"
          />
          <div className="cab-crt-slot">
            <TabScreen
              mode={mode}
              credits={credits}
              tree={tree}
              node={node}
              lastEnding={lastEnding}
              scoreRank={scoreRank}
              onSit={onSit}
              onInsert={onInsert}
              onChoose={onChoose}
            />
          </div>
        </div>

        <div className="cab-coin" id="arcade-coin-tab">
          <div className="cab-coin-top">
            {canSit ? (
              <button type="button" className="cab-play" onClick={onSit}>
                SIT
                <span>1 CREDIT</span>
              </button>
            ) : (
              <button
                type="button"
                className="cab-insert cab-insert-primary"
                disabled={insertLocked}
                onClick={onInsert}
              >
                {pending
                  ? "BUILDING INVOICE…"
                  : !tree
                    ? "NO TREE"
                    : `INSERT ${ARCADE_PRICE_SATS} SATS`}
                <span>
                  {pending
                    ? "LIGHTNING"
                    : `GET INVOICE · ${ARCADE_CREDITS_PER_PAY} CREDITS`}
                </span>
              </button>
            )}
            <div className="cab-led">
              <p>CREDITS</p>
              <p className="cab-led-num">{formatCredits(credits)}</p>
            </div>
          </div>

          {canSit ? (
            <button
              type="button"
              className="cab-insert-more"
              disabled={!aliasOk || pending || paying}
              onClick={onInsert}
            >
              INSERT {ARCADE_PRICE_SATS} SATS · {ARCADE_CREDITS_PER_PAY} MORE
              CREDITS
            </button>
          ) : null}

          <label className="cab-alias">
            <span>CALLSIGN · REQUIRED</span>
            <input
              value={alias}
              maxLength={ARCADE_ALIAS_MAX}
              onChange={(event) => onAlias(event.target.value)}
              placeholder="YOUR ALIAS"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              disabled={paying || sitting}
            />
          </label>

          {!aliasOk && !canSit && tree ? (
            <p className="cab-hint">ENTER CALLSIGN (2–16) THEN INSERT COIN</p>
          ) : (
            <p className="cab-coin-note">
              {ARCADE_PRICE_SATS} SATS = {ARCADE_CREDITS_PER_PAY} CREDITS · TAB
              POOL · NO KYC
            </p>
          )}

          {error ? <p className="cab-error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
