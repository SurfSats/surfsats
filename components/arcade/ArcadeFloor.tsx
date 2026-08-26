"use client";

import { Press_Start_2P } from "next/font/google";
import { ArcadeApp } from "@/components/arcade/ArcadeApp";
import { RetroApp } from "@/components/arcade/RetroApp";
import { ARCADE_CREDITS_PER_PAY, ARCADE_PRICE_SATS } from "@/lib/arcade";

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-arcade-pixel",
});

export function ArcadeFloor() {
  return (
    <div className={`${pixel.variable} arcade-page`}>
      <div className="arcade-haze" aria-hidden="true" />
      <h1 className="sr-only">SurfSats Lightning Arcade</h1>
      <div className="arcade-floor">
        <ArcadeApp />
        <RetroApp />
      </div>
      <div className="arcade-rail">
        <p>
          {ARCADE_PRICE_SATS} SATS = {ARCADE_CREDITS_PER_PAY} CREDITS · WAVE
          RUNNER · RETRO
        </p>
        <p>EACH MACHINE KEEPS ITS OWN CREDITS AND LEGENDS</p>
      </div>
    </div>
  );
}
