"use client";

import { useEffect, useMemo, useState } from "react";
import { Permanent_Marker, Rubik_Dirt } from "next/font/google";
import { GraffitiForm } from "@/components/graffiti/GraffitiForm";
import { GraffitiWall } from "@/components/graffiti/GraffitiWall";
import {
  GRAFFITI_STORAGE_KEY,
  type GraffitiColor,
  type GraffitiMark,
  type GraffitiStyle,
  createMark,
  isActiveMark,
  seedMarks,
} from "@/lib/graffiti";

const marker = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graf-tag",
});

const drip = Rubik_Dirt({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graf-drip",
});

export function GraffitiApp() {
  const [marks, setMarks] = useState<GraffitiMark[]>(seedMarks);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GRAFFITI_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as GraffitiMark[];
        if (Array.isArray(stored) && stored.length) {
          setMarks(stored);
        }
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(GRAFFITI_STORAGE_KEY, JSON.stringify(marks));
  }, [marks, ready]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const live = useMemo(
    () => marks.filter((mark) => isActiveMark(mark, now)),
    [marks, now],
  );

  function addMark(text: string, style: GraffitiStyle, color: GraffitiColor) {
    setMarks((current) => {
      const next = createMark(text, style, color);
      return [...current.filter((mark) => isActiveMark(mark)), next];
    });
  }

  return (
    <div className={`${marker.variable} ${drip.variable} space-y-8`}>
      <GraffitiWall marks={live} now={now} />
      <GraffitiForm onPaid={addMark} />
    </div>
  );
}
