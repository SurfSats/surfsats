"use client";

import { useEffect, useMemo, useState } from "react";
import type { BarChoice, BarNode, BarTree } from "@/lib/bar-tree";

const TICK_MS = 16;

export function TabTalk({
  node,
  tree,
  onChoose,
}: {
  node: BarNode;
  tree: BarTree;
  onChoose: (next: string) => void;
}) {
  const [cursor, setCursor] = useState(0);
  const [phase, setPhase] = useState<"him" | "voices" | "ready">("him");
  const reduced = usePrefersReducedMotion();
  const him = node.him;
  const done = cursor >= him.length;
  const shown = done ? him : him.slice(0, cursor);
  const sent = node.ending === "sent";
  const sentTitle = tree.endings.sent?.title || "THE WOOD ENDS";

  useEffect(() => {
    setCursor(reduced ? him.length : 0);
    setPhase(reduced ? "ready" : "him");
  }, [him, node.id, reduced]);

  useEffect(() => {
    if (reduced || phase !== "him" || done) return;
    const id = window.setTimeout(() => setCursor((n) => n + 1), TICK_MS);
    return () => window.clearTimeout(id);
  }, [cursor, done, phase, reduced]);

  useEffect(() => {
    if (phase !== "him" || !done) return;
    setPhase(node.voices.length ? "voices" : "ready");
  }, [done, node.voices.length, phase]);

  useEffect(() => {
    if (phase !== "voices") return;
    const id = window.setTimeout(() => setPhase("ready"), reduced ? 0 : 420);
    return () => window.clearTimeout(id);
  }, [phase, reduced]);

  const voicesVisible = phase === "voices" || phase === "ready";
  const choicesVisible = phase === "ready" && !sent;
  const cardVisible = phase === "ready" && sent;

  return (
    <div className="tab-talk">
      <p
        className="tab-him"
        onClick={() => setCursor(him.length)}
      >
        {shown}
        {!done ? <span className="tab-caret" aria-hidden="true" /> : null}
      </p>

      {voicesVisible
        ? node.voices.map((voice, index) => (
            <p
              key={`${voice.skill}-${index}`}
              className={`tab-voice is-${skillSlug(voice.skill)}`}
            >
              <span>{voice.skill}</span>
              {voice.line}
            </p>
          ))
        : null}

      {choicesVisible && node.choices.length ? (
        <div className="tab-choices">
          {node.choices.map((choice) => (
            <ChoiceButton
              key={choice.id}
              choice={choice}
              onChoose={onChoose}
            />
          ))}
        </div>
      ) : null}

      {cardVisible ? (
        <div className="tab-ending tab-ending-sent">
          <p className="tab-ending-title">{sentTitle}</p>
          <p className="tab-ending-door">the door is working.</p>
        </div>
      ) : null}
    </div>
  );
}

function ChoiceButton({
  choice,
  onChoose,
}: {
  choice: BarChoice;
  onChoose: (next: string) => void;
}) {
  return (
    <button
      type="button"
      className="tab-choice"
      onClick={() => onChoose(choice.next)}
    >
      {choice.skill ? (
        <em className={`tab-skill is-${skillSlug(choice.skill)}`}>
          {choice.skill}
        </em>
      ) : null}
      {choice.label}
    </button>
  );
}

function skillSlug(skill: string) {
  return skill.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function usePrefersReducedMotion() {
  const query = useMemo(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null,
    [],
  );
  const [reduced, setReduced] = useState(() => Boolean(query?.matches));
  useEffect(() => {
    if (!query) return;
    const onChange = () => setReduced(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [query]);
  return reduced;
}
