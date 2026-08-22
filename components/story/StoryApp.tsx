"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Cinzel_Decorative,
  Cormorant_Garamond,
  Great_Vibes,
  IM_Fell_English,
  MedievalSharp,
  UnifrakturCook,
  UnifrakturMaguntia,
} from "next/font/google";
import { StoryBook } from "@/components/story/StoryBook";
import { StoryComposer } from "@/components/story/StoryComposer";
import {
  STORY_STORAGE_KEY,
  type StoryLine,
} from "@/lib/story";

const titleFace = Cinzel_Decorative({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-story-title",
});

const faceGothic = UnifrakturMaguntia({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-story-0",
});

const faceSharp = MedievalSharp({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-story-1",
});

const faceFell = IM_Fell_English({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-story-2",
});

const faceCook = UnifrakturCook({
  weight: "700",
  subsets: ["latin"],
  variable: "--font-story-3",
});

const faceScript = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-story-4",
});

const faceGaramond = Cormorant_Garamond({
  weight: ["500", "600"],
  subsets: ["latin"],
  style: ["italic", "normal"],
  variable: "--font-story-5",
});

export function StoryApp() {
  const [lines, setLines] = useState<StoryLine[]>([]);
  const [freshId, setFreshId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/story", { cache: "no-store" });
      const data = (await response.json()) as { lines?: StoryLine[] };
      if (Array.isArray(data.lines)) setLines(data.lines);
    } catch {
      // keep last
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORY_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as StoryLine[];
        if (Array.isArray(stored) && stored.length) setLines(stored);
      }
    } catch {
      // ignore
    }
    void load();
    const id = window.setInterval(() => void load(), 12_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!lines.length) return;
    try {
      window.localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // ignore
    }
  }, [lines]);

  const addLine = useCallback((line: StoryLine) => {
    setLines((current) => {
      if (current.some((item) => item.id === line.id)) return current;
      return [...current, line];
    });
    setFreshId(line.id);
    window.setTimeout(() => {
      document.getElementById(`story-line-${line.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
    window.setTimeout(() => {
      setFreshId((current) => (current === line.id ? null : current));
    }, 4800);
  }, []);

  return (
    <div
      className={`${titleFace.variable} ${faceGothic.variable} ${faceSharp.variable} ${faceFell.variable} ${faceCook.variable} ${faceScript.variable} ${faceGaramond.variable} story-page`}
    >
      <div className="story-veil" aria-hidden="true" />
      <div className="story-column">
        <StoryBook lines={lines} freshId={freshId} />
        <StoryComposer onPaid={addLine} />
      </div>
    </div>
  );
}
