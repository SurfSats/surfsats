"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import {
  formatTapeLine,
  mergeTapeWithFallback,
  parseTapePayload,
  TAPE_LIMIT,
  TAPE_SEED,
  TAPE_STORAGE_KEY,
  type TapeEvent,
} from "@/lib/settlement-tape";

function readStoredTape(): TapeEvent[] {
  try {
    const raw = window.localStorage.getItem(TAPE_STORAGE_KEY);
    if (!raw) return [];
    return parseTapePayload(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function writeStoredTape(events: TapeEvent[]) {
  try {
    window.localStorage.setItem(
      TAPE_STORAGE_KEY,
      JSON.stringify(events.slice(0, TAPE_LIMIT)),
    );
  } catch {
    // quota / private mode
  }
}

function ingestPayload(raw: unknown): TapeEvent[] {
  if (typeof raw === "string") {
    try {
      return parseTapePayload(JSON.parse(raw) as unknown);
    } catch {
      return [];
    }
  }
  return parseTapePayload(raw);
}

export function LiveSettlementTape() {
  const [events, setEvents] = useState<TapeEvent[]>(TAPE_SEED);
  const [now, setNow] = useState(() => Date.now());
  const [freshId, setFreshId] = useState<string | null>(null);
  const eventsRef = useRef(events);
  const freshTimer = useRef<number | null>(null);
  eventsRef.current = events;

  useEffect(() => {
    const stored = readStoredTape();
    if (stored.length) {
      setEvents((current) => mergeTapeWithFallback(current, stored));
    }
  }, []);

  useEffect(() => {
    writeStoredTape(events);
  }, [events]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 4000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const mergeIncoming = (incoming: TapeEvent[], live = false) => {
      if (!incoming.length || cancelled) return;
      const current = eventsRef.current;
      const next = mergeTapeWithFallback(current, incoming);
      eventsRef.current = next;
      setEvents(next);
      const newest = incoming[0];
      if (
        live &&
        newest &&
        !current.some((item) => item.id === newest.id)
      ) {
        setFreshId(newest.id);
        if (freshTimer.current) window.clearTimeout(freshTimer.current);
        freshTimer.current = window.setTimeout(() => {
          setFreshId(null);
        }, 2400);
      }
    };

    async function loadHistory() {
      try {
        const res = await fetch("/api/lightning/tape", { cache: "no-store" });
        if (!res.ok) return;
        const incoming = ingestPayload(await res.json());
        mergeIncoming(incoming);
      } catch {
        // keep seed / local cache
      }
    }

    void loadHistory();
    const poll = window.setInterval(loadHistory, 20000);

    const es = new EventSource("/api/lightning/tape/live");
    const fromSse = (msg: MessageEvent, live = false) => {
      mergeIncoming(ingestPayload(msg.data), live);
    };
    es.addEventListener("snapshot", (msg) => fromSse(msg as MessageEvent));
    es.addEventListener("tape", (msg) => fromSse(msg as MessageEvent, true));
    es.onmessage = (msg) => fromSse(msg, true);

    const wsUrl = process.env.NEXT_PUBLIC_LIGHTNING_WS;
    let ws: WebSocket | null = null;
    if (wsUrl) {
      try {
        const url = new URL(wsUrl, window.location.origin);
        url.searchParams.set("channel", "tape");
        ws = new WebSocket(url.toString());
        ws.onmessage = (msg) => mergeIncoming(ingestPayload(msg.data), true);
      } catch {
        ws = null;
      }
    }

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      if (freshTimer.current) window.clearTimeout(freshTimer.current);
      es.close();
      ws?.close();
    };
  }, []);

  const feed = events.length ? events : TAPE_SEED;
  const run = useMemo(() => [...feed, ...feed], [feed]);
  const latest = feed[0];
  const duration = Math.max(32, feed.length * 9);

  return (
    <div className="settle-tape" aria-label="Live settlement tape">
      <Container className="flex items-center gap-2 py-1 sm:gap-3">
        <p className="settle-tape-label shrink-0">
          {"//"} tape
          <span className="settle-tape-live" aria-hidden="true">
            live
          </span>
        </p>
        <p className="sr-only" aria-live="polite">
          {latest ? formatTapeLine(latest, now) : "settlement tape idle"}
        </p>
        <div className="settle-tape-track">
          <div
            className="settle-tape-run"
            style={{ animationDuration: `${duration}s` }}
          >
            {run.map((event, index) => (
              <Link
                key={`${event.id}-${index}`}
                href={event.href}
                className="settle-tape-item"
                data-machine={event.machine}
                data-fresh={event.id === freshId ? "" : undefined}
              >
                {formatTapeLine(event, now)}
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
