"use client";

import { MessageSquare, Radio, RefreshCw, Zap } from "lucide-react";
import { SimplePool } from "nostr-tools";
import { useEffect, useRef, useState } from "react";
import { BrutalistButton } from "@/components/ui/BrutalistButton";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { cn } from "@/lib/cn";
import {
  HUD_NOTE_TAGS,
  HYDROGRAPHIC_RELAYS,
  formatHudTime,
  nextHandshakeRelays,
  prependHudEvent,
  shouldPlayZapLatch,
  toHudEvent,
  truncatePubkey,
  type NostrHudEvent,
} from "@/lib/nostr-hud";
import { playMechanicalLatch } from "@/lib/sound";

type HydrographicRelayHudProps = {
  className?: string;
};

export function HydrographicRelayHud({ className }: HydrographicRelayHudProps) {
  const [events, setEvents] = useState<NostrHudEvent[]>([]);
  const [cumulativeSats, setCumulativeSats] = useState(0);
  const [connectedRelays, setConnectedRelays] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [flashIds, setFlashIds] = useState<string[]>([]);
  const poolRef = useRef<SimplePool | null>(null);
  const pausedRef = useRef(false);
  const liveRef = useRef(false);
  const trafficRef = useRef<string[]>([]);
  const flashTimers = useRef<number[]>([]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const pool = new SimplePool({
      enableReconnect: true,
      enablePing: true,
    });
    pool.idleTimeout = 0;
    pool.maxWaitForConnection = 8000;
    poolRef.current = pool;
    liveRef.current = false;
    trafficRef.current = [];

    const syncHandshake = () => {
      setConnectedRelays(
        nextHandshakeRelays(pool.listConnectionStatus(), trafficRef.current),
      );
    };

    const markTraffic = (url: string) => {
      if (!url) return;
      if (!trafficRef.current.includes(url)) {
        trafficRef.current = [...trafficRef.current, url];
      }
      syncHandshake();
    };

    pool.onRelayConnectionSuccess = (url) => {
      markTraffic(url);
    };
    pool.onRelayConnectionFailure = () => {
      syncHandshake();
    };

    const ingest = (raw: {
      id: string;
      pubkey: string;
      kind: number;
      created_at: number;
      content: string;
      tags: string[][];
    }) => {
      if (pausedRef.current) return;
      const mapped = toHudEvent(raw);
      const sats = mapped.sats;
      setEvents((prev) => prependHudEvent(prev, mapped));
      if (sats && sats > 0) {
        setCumulativeSats((prev) => prev + sats);
      }
      if (
        shouldPlayZapLatch({
          live: liveRef.current,
          paused: pausedRef.current,
          kind: mapped.kind,
          sats,
        })
      ) {
        playMechanicalLatch();
        setFlashIds((prev) =>
          prev.includes(mapped.id) ? prev : [...prev, mapped.id],
        );
        flashTimers.current.push(
          window.setTimeout(() => {
            setFlashIds((prev) => prev.filter((id) => id !== mapped.id));
          }, 400),
        );
      }
    };

    const receivedEvent = (relay: { url: string }) => {
      markTraffic(relay.url);
    };

    const zapSub = pool.subscribeMany(
      [...HYDROGRAPHIC_RELAYS],
      { kinds: [9735], limit: 15 },
      {
        onevent(event) {
          ingest(event);
        },
        receivedEvent,
        oneose() {
          liveRef.current = true;
        },
      },
    );

    const noteSub = pool.subscribeMany(
      [...HYDROGRAPHIC_RELAYS],
      {
        kinds: [1],
        "#t": [...HUD_NOTE_TAGS],
        limit: 10,
      },
      {
        onevent(event) {
          ingest(event);
        },
        receivedEvent,
      },
    );

    const liveTimer = window.setTimeout(() => {
      liveRef.current = true;
    }, 5000);

    const poll = window.setInterval(syncHandshake, 1500);
    syncHandshake();

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(liveTimer);
      for (const timer of flashTimers.current) window.clearTimeout(timer);
      flashTimers.current = [];
      zapSub.close();
      noteSub.close();
      pool.close([...HYDROGRAPHIC_RELAYS]);
      pool.destroy();
      poolRef.current = null;
    };
  }, []);

  const latestAt = events.reduce(
    (max, event) => (event.created_at > max ? event.created_at : max),
    0,
  );
  const handshake = connectedRelays.length;
  const streaming = !isPaused && handshake > 0;

  return (
    <TerminalCard
      className={className}
      status={streaming ? "live" : handshake ? "warning" : "idle"}
      tag={`${handshake}_RELAYS_ONLINE`}
      title="NOSTR_HYDROGRAPHIC_HUD // RELAY_POOL"
    >
      <div className="mb-4 grid grid-cols-2 gap-2 font-mono text-xs md:grid-cols-4">
        <div className="border border-zinc-raw bg-void p-2.5">
          <span className="block text-[10px] text-zinc-raw">CUMULATIVE_ZAPS</span>
          <span className="flex items-center gap-1 text-sm font-bold text-amber">
            <Zap className="inline h-3.5 w-3.5 fill-amber" />
            {cumulativeSats.toLocaleString()} SATS
          </span>
        </div>
        <div className="border border-zinc-raw bg-void p-2.5">
          <span className="block text-[10px] text-zinc-raw">ACTIVE_RELAYS</span>
          <span className="flex items-center gap-1 text-sm font-bold text-terminal-green">
            <Radio
              className={cn(
                "inline h-3.5 w-3.5",
                handshake > 0 && "animate-pulse",
              )}
            />
            {handshake} NODES
          </span>
        </div>
        <div className="border border-zinc-raw bg-void p-2.5">
          <span className="block text-[10px] text-zinc-raw">LAST_EVENT</span>
          <span className="text-sm font-bold text-salt">
            {latestAt ? formatHudTime(latestAt) : "--:--:--"}
          </span>
        </div>
        <div className="flex items-center justify-between border border-zinc-raw bg-void p-2.5">
          <div>
            <span className="block text-[10px] text-zinc-raw">FEED_STREAM</span>
            <span className="text-xs font-bold text-salt">
              {isPaused ? "PAUSED" : handshake ? "STREAMING" : "HANDSHAKE"}
            </span>
          </div>
          <BrutalistButton
            size="sm"
            variant="secondary"
            className="px-2 py-1 text-[10px]"
            onClick={() => setIsPaused((prev) => !prev)}
          >
            {isPaused ? (
              <>
                <RefreshCw className="h-3 w-3" />
                RESUME
              </>
            ) : (
              "PAUSE"
            )}
          </BrutalistButton>
        </div>
      </div>

      <p className="mb-2 font-mono text-[10px] tracking-telemetry text-zinc-raw">
        KIND_9735 ZAP + KIND_1 #SURFSATS/#BITCOIN · DAMUS / NOS.LOL / PRIMAL
      </p>

      <div className="overflow-hidden border border-zinc-raw bg-void">
        <div className="flex items-center justify-between border-b border-zinc-raw bg-zinc-raw/20 px-3 py-1.5 font-mono text-[10px] text-zinc-raw uppercase">
          <span>EVENT_SIGNATURE</span>
          <span>PROTOCOL_DATA</span>
        </div>

        <div className="max-h-[360px] divide-y divide-zinc-raw/40 overflow-y-auto">
          {events.length === 0 ? (
            <div className="p-8 text-center font-mono text-xs text-zinc-raw">
              <RefreshCw className="mx-auto mb-2 h-4 w-4 animate-spin text-violet" />
              CONNECTING TO NOSTR RELAYS (DAMUS, NOS.LOL, PRIMAL)...
            </div>
          ) : (
            events.map((evt) => (
              <div
                key={evt.id}
                className={cn(
                  "flex flex-col justify-between gap-2 p-2.5 font-mono text-xs transition-colors duration-200 md:flex-row md:items-center",
                  evt.kind === 9735
                    ? "border-l-2 border-violet bg-violet/10"
                    : "hover:bg-zinc-raw/10",
                  flashIds.includes(evt.id) && "hud-zap-in",
                )}
              >
                <div className="flex items-center gap-2">
                  {evt.kind === 9735 ? (
                    <Zap className="h-3.5 w-3.5 shrink-0 fill-amber text-amber" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-violet" />
                  )}
                  <span className="text-[10px] text-zinc-raw">
                    {formatHudTime(evt.created_at)}
                  </span>
                  <span className="text-[10px] font-bold text-salt/80">
                    {truncatePubkey(evt.pubkey)}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 text-right">
                  {evt.sats ? (
                    <span className="border border-amber/30 bg-amber/10 px-1.5 py-0.5 text-xs font-bold text-amber">
                      +{evt.sats} SATS
                    </span>
                  ) : (
                    <span className="max-w-[280px] truncate text-[11px] text-salt/70">
                      {evt.content || "[PAYLOAD]"}
                    </span>
                  )}
                  <span className="border border-zinc-raw px-1 text-[9px] text-zinc-raw uppercase">
                    KIND_{evt.kind}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </TerminalCard>
  );
}
