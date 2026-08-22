"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import {
  STORY_PRICE_SATS,
  isSeedStoryLine,
  storyFaceIndex,
  type StoryLine,
} from "@/lib/story";

export function StoryBook({
  lines,
  freshId,
}: {
  lines: StoryLine[];
  freshId?: string | null;
}) {
  const chapterRef = useRef<HTMLOListElement | null>(null);
  const latest = lines[lines.length - 1] ?? null;
  const hasPaid = lines.some((line) => !isSeedStoryLine(line));
  const showJump = lines.length > 5;

  function jumpToLatest() {
    const node = chapterRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    if (latest) {
      document.getElementById(`story-line-${latest.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }

  useEffect(() => {
    const node = chapterRef.current;
    if (!node) return;
    node.scrollTo({
      top: node.scrollHeight,
      behavior: freshId ? "smooth" : "auto",
    });
  }, [lines.length, freshId]);

  return (
    <article className="story-book">
      <div className="story-book-frame" aria-hidden="true" />
      <header className="story-head">
        <p className="story-kicker">liber fulminis · cap. xxi</p>
        <h1 className="story-title">The Chain</h1>
        <p className="story-blurb">
          {STORY_PRICE_SATS} sats. One line. The book grows.
        </p>
        <p className="story-rules">
          {STORY_PRICE_SATS} sats · one sentence · permanent · no accounts
        </p>
        <div className="story-rule" aria-hidden="true" />
      </header>

      {showJump ? (
        <button type="button" className="story-jump" onClick={jumpToLatest}>
          jump to latest
        </button>
      ) : null}

      <ol ref={chapterRef} className="story-lines">
        {lines.map((line, index) => {
          const last = index === lines.length - 1;
          const face = storyFaceIndex(line.id);
          return (
            <li
              key={line.id}
              id={`story-line-${line.id}`}
              className={cn(
                "story-line",
                `story-face-${face}`,
                last && "story-line-latest",
                !last && "story-line-quiet",
                freshId === line.id && "story-line-fresh",
              )}
            >
              <p className="story-line-text">{line.text}</p>
              <p className="story-line-meta">
                — {line.alias}
                {last ? " · latest" : ""}
              </p>
            </li>
          );
        })}
      </ol>

      {!hasPaid ? (
        <p className="story-prompt">The next line is yours.</p>
      ) : null}
    </article>
  );
}
