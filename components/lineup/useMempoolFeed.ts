"use client";

import { useEffect, useRef, useState } from "react";
import {
  BLOCK_TILE_CAP,
  BLOCK_TX_PAGES,
  LIVE_CAP,
  MEMPOOL_REST,
  MEMPOOL_WS,
  finiteNumber,
  isRecord,
  parseBlockHint,
  parseLiveTxList,
  type LiveTx,
  type SealedBlock,
} from "@/lib/lineup-field";
import type { LineupSnapshot } from "@/lib/lineup";

export type FeedStatus = "live" | "loading" | "down";

export function useMempoolFeed(snapshot: LineupSnapshot) {
  const [live, setLive] = useState<LiveTx[]>([]);
  const [blocks, setBlocks] = useState<SealedBlock[]>([]);
  const [unconfirmed, setUnconfirmed] = useState<number | null>(
    snapshot.mempoolCount,
  );
  const [status, setStatus] = useState<FeedStatus>("loading");
  const seen = useRef(new Set<string>());
  const packed = useRef(new Set<string>());
  const liveRef = useRef<LiveTx[]>([]);
  const recentRef = useRef(snapshot.recent);
  recentRef.current = snapshot.recent;

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let pollId = 0;
    let pingId = 0;
    let retryMs = 1500;

    function setLiveCapped(next: LiveTx[]) {
      const trimmed = next.slice(-LIVE_CAP);
      liveRef.current = trimmed;
      setLive(trimmed);
    }

    function ingest(txs: LiveTx[]) {
      if (cancelled || txs.length === 0) return;
      const extra: LiveTx[] = [];
      for (const tx of txs) {
        if (seen.current.has(tx.txid) || packed.current.has(tx.txid)) continue;
        seen.current.add(tx.txid);
        extra.push(tx);
      }
      if (extra.length === 0) return;
      setLiveCapped([...liveRef.current, ...extra]);
      setStatus("live");
    }

    async function pullRecent() {
      try {
        const response = await fetch(`${MEMPOOL_REST}/mempool/recent`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("recent");
        const body: unknown = await response.json();
        if (cancelled) return;
        ingest(parseLiveTxList(body));
        retryMs = 1500;
      } catch {
        if (!cancelled && liveRef.current.length === 0) setStatus("down");
      }
    }

    async function loadSealed(
      hint: {
        hash: string;
        height: number;
        timestamp: number;
        txCount: number;
      },
      pages: number,
    ) {
      if (packed.current.has(hint.hash)) return;
      packed.current.add(hint.hash);
      const tiles = await fetchBlockTiles(hint.hash, pages);
      if (cancelled) return;
      const gone = new Set(tiles.map((tx) => tx.txid));
      for (const txid of gone) seen.current.delete(txid);
      setLiveCapped(liveRef.current.filter((tx) => !gone.has(tx.txid)));
      setBlocks((current) => {
        if (current.some((block) => block.hash === hint.hash)) return current;
        return [
          { ...hint, tiles },
          ...current.filter((block) => block.hash !== hint.hash),
        ].slice(0, 8);
      });
    }

    function openWs() {
      try {
        ws = new WebSocket(MEMPOOL_WS);
      } catch {
        setStatus((current) =>
          liveRef.current.length > 0 ? current : "down",
        );
        return;
      }

      ws.addEventListener("open", () => {
        retryMs = 1500;
        ws?.send(
          JSON.stringify({ action: "want", data: ["blocks", "stats"] }),
        );
        ws?.send(JSON.stringify({ "track-mempool": true }));
        pingId = window.setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: "ping" }));
          }
        }, 25_000);
      });

      ws.addEventListener("message", (event) => {
        let raw: unknown;
        try {
          raw = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (!isRecord(raw)) return;

        const count = mempoolSize(raw);
        if (count !== null) setUnconfirmed(count);

        if (Array.isArray(raw.transactions)) {
          ingest(parseLiveTxList(raw.transactions));
        }
        if (isRecord(raw["mempool-transactions"])) {
          ingest(parseLiveTxList(raw["mempool-transactions"].added));
        }

        if (Array.isArray(raw.blocks) && !raw.block) {
          for (const item of raw.blocks.slice(0, 6)) {
            const hint = parseBlockHint(item);
            if (hint) void loadSealed(hint, 1);
          }
        }
        if (raw.block) {
          const hint = parseBlockHint(raw.block);
          if (hint) void loadSealed(hint, BLOCK_TX_PAGES);
        }
      });

      ws.addEventListener("close", () => {
        window.clearInterval(pingId);
        if (cancelled) return;
        window.setTimeout(openWs, retryMs);
        retryMs = Math.min(12_000, retryMs * 1.6);
      });

      ws.addEventListener("error", () => {
        ws?.close();
      });
    }

    void pullRecent();
    openWs();
    pollId = window.setInterval(() => {
      void pullRecent();
    }, 3000);

    for (const block of recentRef.current.slice(0, 6)) {
      void loadSealed(
        {
          hash: block.hash,
          height: block.height,
          timestamp: block.timestamp,
          txCount: block.txCount,
        },
        1,
      );
    }

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.clearInterval(pingId);
      ws?.close();
    };
  }, []);

  useEffect(() => {
    if (snapshot.mempoolCount !== null && unconfirmed === null) {
      setUnconfirmed(snapshot.mempoolCount);
    }
  }, [snapshot.mempoolCount, unconfirmed]);

  return { live, blocks, unconfirmed, status };
}

function mempoolSize(raw: Record<string, unknown>) {
  const info = isRecord(raw.mempoolInfo)
    ? raw.mempoolInfo
    : isRecord(raw.mempool)
      ? raw.mempool
      : null;
  if (!info) return null;
  return finiteNumber(info.size) ?? finiteNumber(info.count);
}

async function fetchBlockTiles(
  hash: string,
  pages: number,
): Promise<LiveTx[]> {
  const tiles: LiveTx[] = [];
  const seen = new Set<string>();
  const limit = Math.max(1, Math.min(pages, BLOCK_TX_PAGES));
  for (let page = 0; page < limit; page += 1) {
    const start = page * 25;
    const url =
      start === 0
        ? `${MEMPOOL_REST}/block/${hash}/txs`
        : `${MEMPOOL_REST}/block/${hash}/txs/${start}`;
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) break;
      const body: unknown = await response.json();
      const batch = parseLiveTxList(body);
      if (batch.length === 0) break;
      for (const tx of batch) {
        if (seen.has(tx.txid)) continue;
        seen.add(tx.txid);
        tiles.push(tx);
      }
      if (batch.length < 25) break;
    } catch {
      break;
    }
  }
  tiles.sort((a, b) => b.value - a.value);
  return tiles.slice(0, BLOCK_TILE_CAP);
}
