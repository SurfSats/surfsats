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
import { GraffitiForm } from "@/components/graffiti/GraffitiForm";
import { GraffitiWall } from "@/components/graffiti/GraffitiWall";
import {
  GRAFFITI_HERO_BAND,
  GRAFFITI_STORAGE_KEY,
  type GraffitiMark,
  isActiveMark,
  seedMarks,
} from "@/lib/graffiti";

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

export function GraffitiApp() {
  const [paid, setPaid] = useState<GraffitiMark[]>([]);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [freshId, setFreshId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GRAFFITI_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as GraffitiMark[];
        if (Array.isArray(stored) && stored.length) {
          setPaid(stored.filter((mark) => Boolean(mark.paymentHash)));
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
        setPaid((current) => mergePaid(current, data.marks ?? []));
      } catch {
        // keep cached marks
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

  const addMark = useCallback((mark: GraffitiMark) => {
    setPaid((current) => mergePaid(current, [mark]));
    setFreshId(mark.id);
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

  return (
    <div
      className={`${marker.variable} ${throwup.variable} ${wild.variable} ${drip.variable} ${block.variable} ${fat.variable} ${stencil.variable} graffiti-page`}
    >
      <GraffitiWall marks={live} freshId={freshId} />
      <GraffitiForm onPaid={addMark} />
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
