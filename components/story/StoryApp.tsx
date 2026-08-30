"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Cinzel_Decorative,
  Cormorant_Garamond,
  IM_Fell_English,
  UnifrakturMaguntia,
} from "next/font/google";
import { StoryBook } from "@/components/story/StoryBook";
import { StoryComposer } from "@/components/story/StoryComposer";
import { ConsoleShell } from "@/components/layout/ConsoleShell";
import {
  STORY_PRICE_SATS,
  STORY_STORAGE_KEY,
  isSeedStoryLine,
  type StoryLine,
} from "@/lib/story";

const titleFace = Cinzel_Decorative({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-story-title",
});

const faceBlackletter = UnifrakturMaguntia({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-story-0",
});

const faceFell = IM_Fell_English({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-story-1",
});

const faceGaramond = Cormorant_Garamond({
  weight: ["500", "600"],
  subsets: ["latin"],
  style: ["italic", "normal"],
  variable: "--font-story-2",
});

type DeckTab = "write" | "index" | "how";

export function StoryApp() {
  const [lines, setLines] = useState<StoryLine[]>([]);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [tab, setTab] = useState<DeckTab>("write");

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
      setFreshId((current) => (current === line.id ? null : current));
    }, 5200);
  }, []);

  const recent = [...lines].reverse().slice(0, 21);

  return (
    <ConsoleShell
      name="story"
      className={`${titleFace.variable} ${faceBlackletter.variable} ${faceFell.variable} ${faceGaramond.variable} story-page`}
      deckLabel="Story"
      strip={
        <p>
          story chain · {STORY_PRICE_SATS} sats · one line
        </p>
      }
      stage={<StoryBook lines={lines} freshId={freshId} />}
      tabs={[
        { id: "write", label: "WRITE" },
        { id: "index", label: "INDEX" },
        { id: "how", label: "HOW" },
      ]}
      tab={tab}
      onTab={(id) => setTab(id as DeckTab)}
    >
      {tab === "write" ? <StoryComposer onPaid={addLine} /> : null}
      {tab === "index" ? (
        <ol className="story-index">
          {recent.length ? (
            recent.map((line) => (
              <li key={line.id}>
                <p>{line.text}</p>
                <p>
                  — {line.alias}
                  {isSeedStoryLine(line) ? " · seed" : ""}
                </p>
              </li>
            ))
          ) : (
            <li className="is-empty">The book grows.</li>
          )}
        </ol>
      ) : null}
      {tab === "how" ? (
        <div className="story-how">
          <p>{STORY_PRICE_SATS} sats. One line. The book stays.</p>
          <p>Write the next sentence. Lightning seals it into the chain.</p>
          <p>No accounts. The page is public.</p>
        </div>
      ) : null}
    </ConsoleShell>
  );
}
