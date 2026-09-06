"use client";

import { useEffect, useState } from "react";
import {
  MEMPOOL_POLL_MS,
  emptyMempoolTelemetry,
  fetchMempoolTelemetry,
  shouldPulseOnTip,
  type MempoolTelemetry,
} from "@/lib/mempool-fees";

export function useMempoolTelemetry() {
  const [telemetry, setTelemetry] = useState<MempoolTelemetry>(emptyMempoolTelemetry);
  const [pulse, setPulse] = useState(false);
  const [status, setStatus] = useState<"idle" | "live" | "error">("idle");

  useEffect(() => {
    let cancelled = false;
    let prevHeight: number | null = null;

    async function pull() {
      try {
        const next = await fetchMempoolTelemetry();
        if (cancelled) return;
        if (shouldPulseOnTip(prevHeight, next.tipHeight)) {
          setPulse(true);
          window.setTimeout(() => {
            if (!cancelled) setPulse(false);
          }, 1600);
        }
        prevHeight = next.tipHeight;
        setTelemetry(next);
        setStatus(next.tipHeight !== null ? "live" : "error");
      } catch {
        if (!cancelled) setStatus((current) => (current === "live" ? "live" : "error"));
      }
    }

    void pull();
    const id = window.setInterval(() => void pull(), MEMPOOL_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return { telemetry, pulse, status };
}
