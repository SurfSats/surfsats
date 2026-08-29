"use client";

import type { ArcadeScreenMode } from "@/components/arcade/ArcadeScreen";
import {
  ARCADE_CREDITS_PER_PAY,
  ARCADE_PRICE_SATS,
  formatScore,
} from "@/lib/arcade";
import type { BarEnding, BarNode, BarTree } from "@/lib/bar-tree";
import { nodeEnding } from "@/lib/bar-tree";

export function TabScreen({
  mode,
  credits,
  tree,
  node,
  lastEnding,
  scoreRank,
  onSit,
  onInsert,
  onChoose,
}: {
  mode: ArcadeScreenMode;
  credits: number;
  tree: BarTree | null;
  node: BarNode | null;
  lastEnding: BarEnding | null;
  scoreRank: number | null;
  onSit: () => void;
  onInsert: () => void;
  onChoose: (next: string) => void;
}) {
  if (!tree) {
    return (
      <div className="cab-crt cab-crt-photo tab-crt">
        <p className="tab-error">TREE MISSING · CANNOT SIT</p>
      </div>
    );
  }

  const ending = node ? nodeEnding(tree, node) : lastEnding;
  const live = mode === "playing" ? node : null;
  const result = mode === "result" ? ending : null;
  const whisper = live?.voices[0];

  return (
    <div className="cab-crt cab-crt-photo tab-crt">
      {live ? (
        <>
          <div className={`tab-face is-${live.face}`} aria-hidden="true">
            <span>{live.face}</span>
          </div>
          <p className="tab-him">{live.him}</p>
          {whisper ? (
            <p className="tab-voice">
              {whisper.skill} — {whisper.line}
            </p>
          ) : null}
          {live.choices.length ? (
            <div className="tab-choices">
              {live.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className="tab-choice"
                  onClick={() => onChoose(choice.next)}
                >
                  [{choice.skill}] {choice.label}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : result ? (
        <div className="tab-result">
          <p className="tab-result-kicker">
            {scoreRank && scoreRank <= 10
              ? scoreRank === 1
                ? "NEW HIGH SCORE"
                : `TOP 10 · RANK ${scoreRank}`
              : "SITTING OVER"}
          </p>
          <p className="tab-result-title">{result.title}</p>
          <p className="tab-result-score">{formatScore(result.score)}</p>
          <button
            type="button"
            className="tab-choice"
            onClick={credits > 0 ? onSit : onInsert}
          >
            {credits > 0
              ? "SIT AGAIN · 1 CREDIT"
              : `INSERT ${ARCADE_PRICE_SATS} SATS`}
          </button>
        </div>
      ) : (
        <div className="tab-attract">
          <p className="tab-attract-kicker">DIVE BAR</p>
          <p className="tab-attract-title">{tree.title}</p>
          <p className="tab-attract-sub">{tree.subtitle}</p>
          <p className="tab-attract-hint">
            {credits > 0
              ? "1 CREDIT · ONE SITTING"
              : `${ARCADE_PRICE_SATS} SATS = ${ARCADE_CREDITS_PER_PAY} CREDITS`}
          </p>
        </div>
      )}
    </div>
  );
}
