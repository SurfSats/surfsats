"use client";

import { Press_Start_2P } from "next/font/google";
import { useEffect, useState } from "react";
import { ArcadeApp } from "@/components/arcade/ArcadeApp";
import { ArcadeBoards } from "@/components/arcade/ArcadeBoards";
import { RetroApp } from "@/components/arcade/RetroApp";
import { ConsoleShell } from "@/components/layout/ConsoleShell";
import {
  ARCADE_CREDITS_PER_PAY,
  ARCADE_PRICE_SATS,
  type ArcadeHighScore,
  type ArcadeRecentPlay,
} from "@/lib/arcade";

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-arcade-pixel",
});

type Cabinet = "wave" | "retro";
type DeckTab = "scores" | "how" | "rules";

export function ArcadeFloor() {
  const [front, setFront] = useState<Cabinet>("wave");
  const [tab, setTab] = useState<DeckTab>("scores");

  useEffect(() => {
    document.body.dataset.arcadeFront = front;
    return () => {
      delete document.body.dataset.arcadeFront;
    };
  }, [front]);

  return (
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
          <div className="arcade-toggle" role="tablist" aria-label="Cabinet">
            <button
              type="button"
              role="tab"
              aria-selected={front === "wave"}
              className={front === "wave" ? "is-on" : undefined}
              onClick={() => setFront("wave")}
            >
              WAVE RUNNER
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
            <ArcadeApp
              front={front === "wave"}
              onBringForward={() => setFront("wave")}
            />
            <RetroApp
              front={front === "retro"}
              onBringForward={() => setFront("retro")}
            />
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
          <p>
            {ARCADE_PRICE_SATS} sats. {ARCADE_CREDITS_PER_PAY} credits. Isolated
            pool. We don&apos;t HODL.
          </p>
          <p>
            WAVE RUNNER and RETRO are separate cabinets. Each keeps its own
            credits and legends.
          </p>
          <p>
            WAVE RUNNER: tap the screen to hop. The swell gets meaner the longer
            you ride.
          </p>
          <p>Insert coin on the glass. The CRT is the till.</p>
        </div>
      ) : null}
      {tab === "rules" ? (
        <div className="arcade-deck-copy">
          <p>
            {ARCADE_PRICE_SATS} SATS = {ARCADE_CREDITS_PER_PAY} CREDITS · WAVE
            RUNNER · RETRO
          </p>
          <p>EACH MACHINE KEEPS ITS OWN CREDITS AND LEGENDS</p>
        </div>
      ) : null}
    </ConsoleShell>
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
        const query = machine === "retro" ? "?machine=retro" : "";
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
      title={machine === "retro" ? "RETRO LEGENDS" : "HIGH SCORES"}
      recentTitle={machine === "retro" ? "LAST 10 RETRO" : "LAST 10 PLAYERS"}
      showGame={machine === "retro"}
    />
  );
}
