"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

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

        <aside className={skin(name, "console-deck", "graffiti-deck")}>
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

          <div className={skin(name, "console-deck-body", "graffiti-deck-body")}>
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
