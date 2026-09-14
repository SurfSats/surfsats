"use client";

import { Press_Start_2P } from "next/font/google";
import { useEffect, useState } from "react";
import { ArcadeBoards } from "@/components/arcade/ArcadeBoards";
import { ArcadeFloorCards } from "@/components/arcade/ArcadeFloorCards";
import { PlebBoxApp } from "@/components/arcade/PlebBoxApp";
import { RetroApp } from "@/components/arcade/RetroApp";
import { ConsoleShell } from "@/components/layout/ConsoleShell";
import {
  ARCADE_CREDITS_PER_PAY,
  ARCADE_MACHINE_PLEB,
  ARCADE_PRICE_SATS,
  PLEB_BOX_HOW,
  PLEB_BOX_LABEL,
  PLEB_BOX_RULES,
  isPlebBoxDeepLink,
  isRetroGameId,
  isWaveRunnerDeepLink,
  type ArcadeHighScore,
  type ArcadeRecentPlay,
} from "@/lib/arcade";

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-arcade-pixel",
});

type Cabinet = "pleb" | "retro";
type DeckTab = "scores" | "how" | "rules";

export function ArcadeFloor() {
  const [front, setFront] = useState<Cabinet>("pleb");
  const [tab, setTab] = useState<DeckTab>("scores");

  useEffect(() => {
    const game = new URLSearchParams(window.location.search).get("game");
    if (isWaveRunnerDeepLink(game)) {
      setFront("pleb");
      const url = new URL(window.location.href);
      url.searchParams.delete("game");
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
      return;
    }
    if (isPlebBoxDeepLink(game)) {
      setFront("pleb");
      return;
    }
    if (game === "retro" || isRetroGameId(game)) {
      setFront("retro");
    }
  }, []);

  useEffect(() => {
    document.body.dataset.arcadeFront = front;
    return () => {
      delete document.body.dataset.arcadeFront;
    };
  }, [front]);

  return (
    <>
    <ConsoleShell
      name="arcade"
      className={`${pixel.variable} arcade-page`}
      deckLabel="Arcade"
      strip={
        <p>
          lightning arcade · {ARCADE_PRICE_SATS} sats · {ARCADE_CREDITS_PER_PAY}{" "}
          credits
        </p>
      }
      stage={
        <>
          <h1 className="sr-only">SurfSats Lightning Arcade</h1>
          <div className="arcade-haze" aria-hidden="true" />
          <div id="cabinet" className="arcade-cabinet-anchor">
          <div className="arcade-toggle" role="tablist" aria-label="Cabinet">
            <button
              type="button"
              role="tab"
              aria-selected={front === "pleb"}
              className={front === "pleb" ? "is-on" : undefined}
              onClick={() => setFront("pleb")}
            >
              {PLEB_BOX_LABEL}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={front === "retro"}
              className={front === "retro" ? "is-on" : undefined}
              onClick={() => setFront("retro")}
            >
              RETRO
            </button>
          </div>
          <div className={`arcade-pit is-${front}`}>
            <PlebBoxApp
              front={front === "pleb"}
              onBringForward={() => setFront("pleb")}
            />
            <RetroApp
              front={front === "retro"}
              onBringForward={() => setFront("retro")}
            />
          </div>
          </div>
        </>
      }
      tabs={[
        { id: "scores", label: "SCORES" },
        { id: "how", label: "HOW" },
        { id: "rules", label: "RULES" },
      ]}
      tab={tab}
      onTab={(id) => setTab(id as DeckTab)}
      footer={
        <p className="arcade-deck-foot">
          {ARCADE_PRICE_SATS} SATS = {ARCADE_CREDITS_PER_PAY} CREDITS
        </p>
      }
    >
      {tab === "scores" ? <ArcadeScores machine={front} /> : null}
      {tab === "how" ? (
        <div className="arcade-deck-copy">
          {front === "pleb" ? (
            <p>{PLEB_BOX_HOW}</p>
          ) : (
            <>
              <p>
                {ARCADE_PRICE_SATS} sats. {ARCADE_CREDITS_PER_PAY} credits. Isolated
                pool. We don&apos;t HODL.
              </p>
              <p>
                RETRO keeps its own credits and legends. Anarch and Bouncing Bitties
                are on the floor.
              </p>
              <p>Insert coin on the glass. The CRT is the till.</p>
            </>
          )}
        </div>
      ) : null}
      {tab === "rules" ? (
        <div className="arcade-deck-copy">
          {front === "pleb" ? (
            <p>{PLEB_BOX_RULES}</p>
          ) : (
            <>
              <p>
                {ARCADE_PRICE_SATS} SATS = {ARCADE_CREDITS_PER_PAY} CREDITS · RETRO
              </p>
              <p>EACH MACHINE KEEPS ITS OWN CREDITS AND LEGENDS</p>
            </>
          )}
        </div>
      ) : null}
    </ConsoleShell>
    <ArcadeFloorCards />
    </>
  );
}

function ArcadeScores({ machine }: { machine: Cabinet }) {
  const [highScores, setHighScores] = useState<ArcadeHighScore[]>([]);
  const [lastPlayers, setLastPlayers] = useState<ArcadeRecentPlay[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const query =
          machine === "retro"
            ? "?machine=retro"
            : `?machine=${ARCADE_MACHINE_PLEB}`;
        const response = await fetch(`/api/arcade${query}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          highScores?: ArcadeHighScore[];
          lastPlayers?: ArcadeRecentPlay[];
        };
        if (cancelled) return;
        if (Array.isArray(data.highScores)) setHighScores(data.highScores);
        if (Array.isArray(data.lastPlayers)) setLastPlayers(data.lastPlayers);
      } catch {
        // keep last board
      }
    }

    void load();
    const poll = window.setInterval(() => void load(), 12_000);
    const tick = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [machine]);

  return (
    <ArcadeBoards
      highScores={highScores}
      lastPlayers={lastPlayers}
      now={now}
      title={machine === "retro" ? "RETRO LEGENDS" : `${PLEB_BOX_LABEL} LEGENDS`}
      recentTitle={machine === "retro" ? "LAST 10 RETRO" : "LAST 10 PLAYERS"}
      showGame={machine === "retro"}
    />
  );
}
