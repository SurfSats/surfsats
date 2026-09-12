"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate } from "animejs/animation";
import { set as setStyle } from "animejs/utils";
import { cn } from "@/lib/cn";
import { DECK_WIPE_NARROW_MQ, deckWipeMotion } from "@/lib/deck-wipe";

export type ConsoleTab = {
  id: string;
  label: string;
  ariaLabel?: string;
};

export type ConsoleShellProps = {
  className?: string;
  name?: string;
  strip?: ReactNode;
  stage: ReactNode;
  tabs: ConsoleTab[];
  tab: string;
  onTab: (id: string) => void;
  children: ReactNode;
  footer?: ReactNode;
  deckLabel?: string;
};

function skin(name: string | undefined, structural: string, graf: string) {
  return name === "graffiti" ? `${structural} ${graf}` : structural;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isNarrow() {
  return window.matchMedia(DECK_WIPE_NARROW_MQ).matches;
}

function clearWipe(node: HTMLElement) {
  setStyle(node, { opacity: 1, translateX: 0 });
  node.style.removeProperty("opacity");
  node.style.removeProperty("transform");
  node.style.removeProperty("translate");
}

export function ConsoleShell({
  className,
  name,
  strip,
  stage,
  tabs,
  tab,
  onTab,
  children,
  footer,
  deckLabel = "Deck",
}: ConsoleShellProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const prevTab = useRef<string | null>(null);
  const safetyRef = useRef(0);

  useEffect(() => {
    const node = bodyRef.current;
    if (!node) return;

    const prior = prevTab.current;
    if (prior === null) {
      prevTab.current = tab;
      return;
    }
    if (prior === tab) return;
    prevTab.current = tab;

    const motion = deckWipeMotion({
      narrow: isNarrow(),
      reducedMotion: prefersReducedMotion(),
    });
    if (motion.kind === "instant") {
      clearWipe(node);
      return;
    }

    window.clearTimeout(safetyRef.current);
    animate(node, {
      opacity: [0, 1],
      ...(motion.x === 0 ? {} : { translateX: [motion.x, 0] }),
      duration: motion.duration,
      ease: motion.ease,
      loop: false,
      composition: "replace",
      onComplete: () => {
        window.clearTimeout(safetyRef.current);
        clearWipe(node);
      },
    });
    safetyRef.current = window.setTimeout(
      () => clearWipe(node),
      motion.duration + 80,
    );
  }, [tab]);

  return (
    <div
      className={cn(skin(name, "console-page", "graffiti-page"), className)}
      data-console={name}
    >
      {strip ? (
        <header className={skin(name, "console-strip", "graffiti-strip")}>
          {strip}
        </header>
      ) : null}

      <div className={skin(name, "console-shell", "graffiti-shell")}>
        <div className={skin(name, "console-stage", "graffiti-stage")}>
          {stage}
        </div>

        <aside
          className={skin(name, "console-deck", "graffiti-deck")}
          id={name === "graffiti" ? "graf-spray-dock" : undefined}
        >
          <nav
            className={skin(name, "console-deck-tabs", "graffiti-deck-tabs")}
            role="tablist"
            aria-label={deckLabel}
            style={{
              gridTemplateColumns: `repeat(${Math.max(tabs.length, 1)}, minmax(0, 1fr))`,
            }}
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                className={cn(tab === item.id && "is-on")}
                aria-label={item.ariaLabel ?? item.label}
                aria-selected={tab === item.id}
                onClick={() => onTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div
            ref={bodyRef}
            className={skin(name, "console-deck-body", "graffiti-deck-body")}
            data-deck-wipe=""
          >
            {children}
          </div>

          {footer ? (
            <div className="console-deck-footer">{footer}</div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
