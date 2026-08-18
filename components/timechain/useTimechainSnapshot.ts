"use client";

import { useEffect, useState } from "react";
import {
  type TimechainSnapshot,
  emptySnapshot,
  hasLiveData,
} from "@/lib/timechain";

export function useTimechainSnapshot(initial: TimechainSnapshot | null) {
  const [snapshot, setSnapshot] = useState<TimechainSnapshot>(
    initial ?? emptySnapshot,
  );
  const [status, setStatus] = useState<"live" | "loading" | "error">(
    initial && hasLiveData(initial) ? "live" : "loading",
  );

  useEffect(() => {
    let cancelled = false;

    async function pull() {
      try {
        const response = await fetch("/api/timechain", { cache: "no-store" });
        if (!response.ok) throw new Error("bad status");
        const next = (await response.json()) as TimechainSnapshot;
        if (cancelled) return;
        setSnapshot(next);
        setStatus(hasLiveData(next) ? "live" : "error");
      } catch {
        if (!cancelled) {
          setStatus((current) => (current === "live" ? "live" : "error"));
        }
      }
    }

    if (!initial || !hasLiveData(initial)) {
      void pull();
    }

    const id = window.setInterval(() => {
      void pull();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [initial]);

  return { snapshot, status };
}
