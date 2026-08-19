"use client";

import { useEffect, useState } from "react";
import {
  type LineupSnapshot,
  emptyLineup,
  hasLineupData,
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
        setSnapshot(next);
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
