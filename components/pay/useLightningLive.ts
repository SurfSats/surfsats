"use client";

import { useEffect, useRef } from "react";
import {
  parseSettlementPayload,
  type SettlementEvent,
} from "@/lib/lightning-live";

function emitFromRaw(raw: unknown, onEvent: (event: SettlementEvent) => void) {
  const event = parseSettlementPayload(
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            return raw;
          }
        })()
      : raw,
  );
  if (event) onEvent(event);
}

export function useLightningLive({
  paymentHash,
  enabled = true,
  onEvent,
}: {
  paymentHash: string;
  enabled?: boolean;
  onEvent: (event: SettlementEvent) => void;
}) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const hash = paymentHash.trim();
    if (!enabled || !hash) return;
    const seen = new Set<string>();
    const handle = (event: SettlementEvent) => {
      if (event.paymentHash && event.paymentHash !== hash) return;
      const key = `${event.type}:${event.paymentHash}:${event.preimage}`;
      if (seen.has(key) || seen.has(`paid:${event.paymentHash}`)) return;
      seen.add(key);
      seen.add(`paid:${event.paymentHash}`);
      onEventRef.current(event);
    };

    const es = new EventSource(
      `/api/lightning/live?hash=${encodeURIComponent(hash)}`,
    );
    const fromSse = (msg: MessageEvent) => emitFromRaw(msg.data, handle);
    es.addEventListener("invoice_paid", fromSse);
    es.addEventListener("settled", fromSse);
    es.onmessage = fromSse;

    const wsUrl = process.env.NEXT_PUBLIC_LIGHTNING_WS;
    let ws: WebSocket | null = null;
    if (wsUrl) {
      try {
        const url = new URL(wsUrl, window.location.origin);
        url.searchParams.set("hash", hash);
        ws = new WebSocket(url.toString());
        ws.onmessage = (msg) => emitFromRaw(msg.data, handle);
      } catch {
        ws = null;
      }
    }

    return () => {
      es.close();
      ws?.close();
    };
  }, [enabled, paymentHash]);
}
