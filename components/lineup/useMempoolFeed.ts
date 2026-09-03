"use client";

import { useEffect, useRef, useState } from "react";
import {
  BLOCK_TILE_CAP,
  BLOCK_TX_PAGES,
  DETAIL_BUDGET,
  DETAIL_CONCURRENCY,
  LIVE_CAP,
  MEMPOOL_RECENT_PATH,
  MEMPOOL_REST,
  MEMPOOL_TX_PATH,
  MEMPOOL_WS,
  extractFeedBatch,
  parseLiveTx,
  parseLiveTxList,
  type BlockHint,
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
  const packedTx = useRef(new Set<string>());
  const sealed = useRef(new Set<string>());
  const liveRef = useRef<LiveTx[]>([]);
  const recentRef = useRef(snapshot.recent);
  recentRef.current = snapshot.recent;

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let pollId = 0;
    let pingId = 0;
    let retryMs = 1500;
    let detailsLeft = DETAIL_BUDGET;
    let detailsInFlight = 0;
    const detailQueue: string[] = [];
    const queued = new Set<string>();

    function setLiveCapped(next: LiveTx[]) {
      const trimmed = next.length > LIVE_CAP ? next.slice(-LIVE_CAP) : next;
      liveRef.current = trimmed;
      setLive(trimmed);
    }

    function ingest(txs: LiveTx[]) {
      if (cancelled || txs.length === 0) return;
      const extra: LiveTx[] = [];
      for (const tx of txs) {
        if (seen.current.has(tx.txid) || packedTx.current.has(tx.txid)) continue;
        seen.current.add(tx.txid);
        extra.push(tx);
      }
      if (extra.length === 0) return;
      if (extra.length > LIVE_CAP) {
        extra.sort((a, b) => b.value - a.value);
        setLiveCapped(extra.slice(0, LIVE_CAP));
      } else {
        setLiveCapped([...liveRef.current, ...extra]);
      }
      setStatus("live");
    }

    function dropMined(ids: string[]) {
      if (ids.length === 0) return;
      const gone = new Set(ids);
      for (const id of gone) {
        packedTx.current.add(id);
        seen.current.delete(id);
      }
      const next = liveRef.current.filter((tx) => !gone.has(tx.txid));
      if (next.length !== liveRef.current.length) setLiveCapped(next);
    }

    function queueDetails(ids: string[]) {
      for (const id of ids) {
        if (
          seen.current.has(id) ||
          packedTx.current.has(id) ||
          queued.has(id) ||
          detailsLeft <= 0
        ) {
          continue;
        }
        queued.add(id);
        detailQueue.push(id);
      }
      pumpDetails();
    }

    function pumpDetails() {
      while (
        !cancelled &&
        detailsInFlight < DETAIL_CONCURRENCY &&
        detailQueue.length > 0 &&
        detailsLeft > 0
      ) {
        const id = detailQueue.shift();
        if (!id) break;
        detailsLeft -= 1;
        detailsInFlight += 1;
        void fetchTxDetail(id).finally(() => {
          detailsInFlight -= 1;
          pumpDetails();
        });
      }
    }

    async function fetchTxDetail(txid: string) {
      try {
        const response = await fetch(`${MEMPOOL_TX_PATH}/${txid}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const body: unknown = await response.json();
        if (cancelled) return;
        const tx = parseLiveTx(body);
        if (tx) ingest([tx]);
      } catch {
        /* skip */
      }
    }

    async function pullRecent() {
      try {
        const response = await fetch(MEMPOOL_RECENT_PATH, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("recent");
        const body: unknown = await response.json();
        if (cancelled) return;
        ingest(parseLiveTxList(body));
        retryMs = 1500;
        if (liveRef.current.length === 0) setStatus("down");
      } catch {
        if (!cancelled && liveRef.current.length === 0) setStatus("down");
      }
    }

    async function loadSealed(hint: BlockHint, pages: number) {
      if (sealed.current.has(hint.hash)) return;
      sealed.current.add(hint.hash);
      const tiles = await fetchBlockTiles(hint.hash, pages);
      if (cancelled) return;
      dropMined(tiles.map((tx) => tx.txid));
      setBlocks((current) => {
        if (current.some((block) => block.hash === hint.hash)) return current;
        return [{ ...hint, tiles }, ...current].slice(0, 8);
      });
      if (pages >= BLOCK_TX_PAGES) void pullRecent();
    }

    function applyBatch(raw: unknown) {
      const batch = extractFeedBatch(raw);
      if (batch.unconfirmed !== null) setUnconfirmed(batch.unconfirmed);
      ingest(batch.txs);
      queueDetails(batch.pending);
      dropMined(batch.mined);
      if (batch.block) void loadSealed(batch.block, BLOCK_TX_PAGES);
      else {
        for (const hint of batch.blocks.slice(0, 4)) {
          void loadSealed(hint, 1);
        }
      }
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
        ws?.send(JSON.stringify({ "track-mempool-block": 0 }));
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
        applyBatch(raw);
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

    void (async () => {
      await pullRecent();
      if (cancelled) return;
      for (const block of recentRef.current.slice(0, 3)) {
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
    })();
    openWs();
    pollId = window.setInterval(() => {
      void pullRecent();
    }, 4000);

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
