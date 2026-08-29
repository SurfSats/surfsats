"use client";

import { Press_Start_2P } from "next/font/google";
import { useEffect, useState } from "react";
import { ArcadeApp } from "@/components/arcade/ArcadeApp";
import { RetroApp } from "@/components/arcade/RetroApp";
import { TabApp } from "@/components/arcade/TabApp";
import { ARCADE_CREDITS_PER_PAY, ARCADE_PRICE_SATS } from "@/lib/arcade";

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-arcade-pixel",
});

export function ArcadeFloor() {
  const [front, setFront] = useState<"wave" | "retro" | "tab">("wave");

  useEffect(() => {
    document.body.dataset.arcadeFront = front;
    return () => {
      delete document.body.dataset.arcadeFront;
    };
  }, [front]);

  return (
    <div className={`${pixel.variable} arcade-page`}>
      <div className="arcade-haze" aria-hidden="true" />
      <h1 className="sr-only">SurfSats Lightning Arcade</h1>
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
        <button
          type="button"
          role="tab"
          aria-selected={front === "tab"}
          className={front === "tab" ? "is-on" : undefined}
          onClick={() => setFront("tab")}
        >
          THE TAB
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
        <TabApp
          front={front === "tab"}
          onBringForward={() => setFront("tab")}
        />
      </div>
      <div className="arcade-rail">
        <p>
          {ARCADE_PRICE_SATS} SATS = {ARCADE_CREDITS_PER_PAY} CREDITS · WAVE
          RUNNER · RETRO · THE TAB
        </p>
        <p>EACH MACHINE KEEPS ITS OWN CREDITS AND LEGENDS</p>
      </div>
    </div>
  );
}
