"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Anton,
  Bangers,
  Bungee,
  Permanent_Marker,
  Rubik_Dirt,
  Rubik_Glitch,
  Stardos_Stencil,
} from "next/font/google";
import { GraffitiFeed } from "@/components/graffiti/GraffitiFeed";
import { GraffitiForm } from "@/components/graffiti/GraffitiForm";
import { GraffitiHow } from "@/components/graffiti/GraffitiHow";
import { GraffitiWall } from "@/components/graffiti/GraffitiWall";
import {
  GRAFFITI_HERO_BAND,
  GRAFFITI_PRICE_SATS,
  GRAFFITI_STORAGE_KEY,
  GRAFFITI_TTL_HOURS,
  clampPlacement,
  organicPlacement,
  placeMark,
  type GraffitiColor,
  type GraffitiMark,
  type GraffitiPlacement,
  type GraffitiStyle,
  isActiveMark,
  seedMarks,
} from "@/lib/graffiti";
import { cn } from "@/lib/cn";

const marker = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graf-tag",
});

const throwup = Bangers({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graf-throw",
});

const wild = Rubik_Glitch({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graf-wild",
});

const drip = Rubik_Dirt({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graf-drip",
});

const block = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graf-block",
});

const fat = Bungee({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graf-fat",
});

const stencil = Stardos_Stencil({
  weight: "700",
  subsets: ["latin"],
  variable: "--font-graf-stencil",
});

type DeckTab = "spray" | "wall" | "how";

export function GraffitiApp() {
  const [paid, setPaid] = useState<GraffitiMark[]>([]);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [freshId, setFreshId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [tab, setTab] = useState<DeckTab>("spray");
  const [text, setText] = useState("");
  const [style, setStyle] = useState<GraffitiStyle>("tag");
  const [color, setColor] = useState<GraffitiColor>("banana");
  const [defaultPlacement] = useState<GraffitiPlacement>(() => placeMark());
  const [placement, setPlacement] = useState<GraffitiPlacement | null>(null);
  const [hover, setHover] = useState<{ top: number; left: number } | null>(
    null,
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GRAFFITI_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as GraffitiMark[];
        if (Array.isArray(stored) && stored.length) {
          setPaid(
            stored.filter(
              (mark) => Boolean(mark.paymentHash) && isActiveMark(mark),
            ),
          );
        }
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/graffiti", { cache: "no-store" });
        const data = (await response.json()) as { marks?: GraffitiMark[] };
        if (cancelled || !Array.isArray(data.marks)) return;
        const server = data.marks.filter(
          (mark) => Boolean(mark.paymentHash) && isActiveMark(mark),
        );
        setPaid((current) => {
          const optimistic = current.filter(
            (mark) =>
              mark.paymentHash &&
              !server.some((item) => item.paymentHash === mark.paymentHash),
          );
          return mergePaid(server, optimistic);
        });
      } catch {
        // keep last known public marks
      }
    }

    void load();
    const id = window.setInterval(() => void load(), 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(GRAFFITI_STORAGE_KEY, JSON.stringify(paid));
  }, [paid, ready]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const live = useMemo(() => {
    const byId = new Map<string, GraffitiMark>();
    for (const mark of [...seedMarks, ...paid]) {
      if (
        isActiveMark(mark, now) &&
        typeof mark.scale === "number" &&
        mark.top >= GRAFFITI_HERO_BAND
      ) {
        byId.set(mark.id, mark);
      }
    }
    return [...byId.values()];
  }, [paid, now]);

  const paidLive = useMemo(
    () => paid.filter((mark) => isActiveMark(mark, now)).length,
    [paid, now],
  );

  const ghostPlacement = useMemo(() => {
    if (placement) return placement;
    if (hover) {
      const clamped = clampPlacement(hover.top, hover.left);
      return {
        top: clamped.top,
        left: clamped.left,
        rotate: defaultPlacement.rotate,
        scale: defaultPlacement.scale,
      };
    }
    return defaultPlacement;
  }, [placement, hover, defaultPlacement]);

  const showGhost = tab === "spray" && text.trim().length >= 2;

  const addMark = useCallback((mark: GraffitiMark) => {
    setPaid((current) => mergePaid(current, [mark]));
    setFreshId(mark.id);
    setHighlightId(mark.id);
    setTab("spray");
    window.setTimeout(() => {
      document.getElementById(`graf-${mark.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
    window.setTimeout(() => {
      setFreshId((current) => (current === mark.id ? null : current));
    }, 5200);
  }, []);

  const resetDraft = useCallback(() => {
    setText("");
    setStyle("tag");
    setColor("banana");
    setPlacement(null);
    setHover(null);
  }, []);

  function selectMark(id: string) {
    setHighlightId(id);
    window.setTimeout(() => {
      document.getElementById(`graf-${id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 40);
  }

  return (
    <div
      className={`${marker.variable} ${throwup.variable} ${wild.variable} ${drip.variable} ${block.variable} ${fat.variable} ${stencil.variable} graffiti-page`}
    >
      <header className="graffiti-strip">
        <p>
          city wall · {GRAFFITI_PRICE_SATS} sats · {GRAFFITI_TTL_HOURS} hours
        </p>
      </header>

      <div className="graffiti-shell">
        <div className="graffiti-stage">
          <GraffitiWall
            marks={live}
            freshId={freshId}
            highlightId={highlightId}
            placing
            quiet={paidLive === 0}
            ghost={
              showGhost
                ? {
                    text: text.trim(),
                    style,
                    color,
                    placement: ghostPlacement,
                    locked: Boolean(placement),
                  }
                : null
            }
            onPlace={(top, left) => {
              setPlacement(organicPlacement(top, left));
              setTab("spray");
            }}
            onHover={(point) => {
              if (placement) return;
              setHover(point);
            }}
          />
        </div>

        <aside className="graffiti-deck">
          <nav className="graffiti-deck-tabs" aria-label="Deck">
            {(
              [
                ["spray", "SPRAY"],
                ["wall", "WALL"],
                ["how", "HOW"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={cn(tab === id && "is-on")}
                aria-selected={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="graffiti-deck-body">
            {tab === "spray" ? (
              <GraffitiForm
                text={text}
                style={style}
                color={color}
                placed={Boolean(placement)}
                placement={placement ?? defaultPlacement}
                onText={setText}
                onStyle={setStyle}
                onColor={setColor}
                onPaid={addMark}
                onResetDraft={resetDraft}
              />
            ) : null}
            {tab === "wall" ? (
              <GraffitiFeed
                marks={live}
                highlightId={highlightId}
                now={now}
                onSelect={selectMark}
              />
            ) : null}
            {tab === "how" ? <GraffitiHow /> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function mergePaid(current: GraffitiMark[], incoming: GraffitiMark[]) {
  const byKey = new Map<string, GraffitiMark>();
  for (const mark of [...current, ...incoming]) {
    const key = mark.paymentHash || mark.id;
    if (!key) continue;
    byKey.set(key, mark);
  }
  return [...byKey.values()];
}
