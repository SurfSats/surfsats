"use client";

import {
  ARCADE_PRICE_SATS,
  formatScore,
  formatTimeAgo,
  type ArcadeHighScore,
  type ArcadeRecentPlay,
} from "@/lib/arcade";

export function ArcadeBoards({
  highScores,
  lastPlayers,
  now,
}: {
  highScores: ArcadeHighScore[];
  lastPlayers: ArcadeRecentPlay[];
  now: number;
}) {
  const rows = Array.from({ length: 10 }, (_, index) => highScores[index] ?? null);

  return (
    <div className="arcade-boards">
      <section className="arcade-board arcade-board-scores" aria-label="High scores">
        <header className="arcade-board-head">
          <span className="arcade-board-ico" aria-hidden="true">
            ★
          </span>
          <h2>HIGH SCORES</h2>
          <span className="arcade-board-btc" aria-hidden="true">
            ₿
          </span>
        </header>
        <div className="arcade-board-cols">
          <span>RANK</span>
          <span>ALIAS</span>
          <span>SCORE</span>
        </div>
        {highScores.length ? (
          <ol className="arcade-board-list">
            {rows.map((row, index) => (
              <li key={row?.rank ?? index} className={row ? undefined : "is-empty"}>
                <span>{index + 1}</span>
                <span>{row?.alias ?? "--------"}</span>
                <span>{row ? formatScore(row.score) : "--------"}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="arcade-board-empty">NO LEGENDS YET · INSERT COIN</p>
        )}
      </section>

      <section className="arcade-board arcade-board-recent" aria-label="Last 10 players">
        <header className="arcade-board-head">
          <span className="arcade-board-ico" aria-hidden="true">
            ⚡
          </span>
          <div>
            <h2>LAST 10 PLAYERS</h2>
            <p>SHOUT-OUT WALL</p>
          </div>
          <span className="arcade-board-ico" aria-hidden="true">
            ⚡
          </span>
        </header>
        {lastPlayers.length ? (
          <ol className="arcade-recent-list">
            {lastPlayers.map((play, index) => (
              <li key={`${play.alias}-${play.createdAt}-${index}`}>
                <span className="arcade-diamond" aria-hidden="true">
                  ◆
                </span>
                <span className="arcade-recent-alias">{play.alias}</span>
                <span className="arcade-recent-sats">{ARCADE_PRICE_SATS} SATS</span>
                <span className="arcade-recent-ago">
                  {formatTimeAgo(play.createdAt, now)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="arcade-board-empty">NO COINS YET · BE FIRST</p>
        )}
        <p className="arcade-board-foot">
          STAY LIGHTNING. STAY LEGEND.
          <span aria-hidden="true"> ∿</span>
        </p>
      </section>
    </div>
  );
}
