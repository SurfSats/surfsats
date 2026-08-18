"use client";

import { useEffect, useState } from "react";
import {
  type LineupSnapshot,
  emptyLineup,
  hasLineupData,
  mergeLineupSurfers,
} from "@/lib/lineup";

export function useLineupSnapshot(initial: LineupSnapshot | null) {
  const [snapshot, setSnapshot] = useState<LineupSnapshot>(
    initial ?? emptyLineup,
  );
  const [status, setStatus] = useState<"live" | "loading" | "error">(
    initial && hasLineupData(initial) ? "live" : "loading",
  );

  useEffect(() => {
    let cancelled = false;

    async function pull() {
      try {
        const response = await fetch("/api/lineup", { cache: "no-store" });
        if (!response.ok) throw new Error("bad status");
        const next = (await response.json()) as LineupSnapshot;
        if (cancelled) return;
        setSnapshot((current) => {
          const advanced =
            current.blockHeight !== null &&
            next.blockHeight !== null &&
            next.blockHeight > current.blockHeight;
          const kept = advanced
            ? current.surfers.filter((surfer) => surfer.setIndex > 0)
            : current.surfers;
          return {
            ...next,
            surfers: mergeLineupSurfers(kept, next.surfers, next.sets),
          };
        });
        setStatus(hasLineupData(next) ? "live" : "error");
      } catch {
        if (!cancelled) {
          setStatus((current) => (current === "live" ? "live" : "error"));
        }
      }
    }

    if (!initial || !hasLineupData(initial)) {
      void pull();
    }

    const id = window.setInterval(() => {
      void pull();
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [initial]);

  return { snapshot, status };
}
