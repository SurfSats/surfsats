"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LineupCanvas, hoverCopy } from "@/components/lineup/LineupCanvas";
import { useLineupSnapshot } from "@/components/lineup/useLineupSnapshot";
import { useMempoolFeed } from "@/components/lineup/useMempoolFeed";
import {
  MEMPOOL_SITE,
  asTxid,
  blockUrl,
  tileRgb,
  tileSide,
  txUrl,
  type LiveTx,
  type SealedBlock,
} from "@/lib/lineup-field";
import type { LineupSnapshot } from "@/lib/lineup";
import { formatBlockAge, formatInteger } from "@/lib/timechain";

export function FieldApp({ initial }: { initial: LineupSnapshot }) {
  const { snapshot } = useLineupSnapshot(initial);
  const { live, blocks, unconfirmed, status } = useMempoolFeed(snapshot);
  const [now, setNow] = useState<number | null>(null);
  const [hover, setHover] = useState<{
    tx: LiveTx;
    x: number;
    y: number;
  } | null>(null);
  const [packing, setPacking] = useState<LiveTx[] | null>(null);
  const [query, setQuery] = useState("");
  const [reduced, setReduced] = useState(false);
  const prevHash = useRef<string | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const newest = blocks[0];
    if (!newest) return;
    if (prevHash.current && prevHash.current !== newest.hash) {
      setPacking(newest.tiles);
      const id = window.setTimeout(() => setPacking(null), 1100);
      prevHash.current = newest.hash;
      return () => window.clearTimeout(id);
    }
    prevHash.current = newest.hash;
  }, [blocks]);

  const rail = useMemo(() => {
    const packed = new Map(blocks.map((block) => [block.hash, block]));
    const ordered: SealedBlock[] = [];
    const seen = new Set<string>();
    for (const block of [...blocks, ...snapshot.recent]) {
      if (seen.has(block.hash)) continue;
      seen.add(block.hash);
      const loaded = packed.get(block.hash);
      ordered.push(
        loaded ?? {
          hash: block.hash,
          height: block.height,
          timestamp: block.timestamp,
          txCount: block.txCount,
          tiles: "tiles" in block ? block.tiles : [],
        },
      );
      if (ordered.length >= 8) break;
    }
    return ordered;
  }, [blocks, snapshot.recent]);

  const last = rail[0] ?? null;
  const ago =
    last !== null && now !== null
      ? formatBlockAge(Math.max(0, now / 1000 - last.timestamp))
      : "—";
  const count = unconfirmed ?? snapshot.mempoolCount;
  const showing = live.length;
  const down = status === "down" && showing === 0;

  return (
    <div className="lineup-field">
      <header className="lineup-hud">
        <h1 className="lineup-kicker">LINEUP · value on the wire</h1>
        <p className="lineup-hud-line">
          <span>
            {count !== null ? formatInteger(count) : "—"} unconfirmed
          </span>
          <span>showing {formatInteger(showing)}</span>
          <span>
            {last ? formatInteger(last.height) : "—"} · {ago}
          </span>
        </p>
        <form
          className="lineup-seek"
          onSubmit={(event) => {
            event.preventDefault();
            const id = asTxid(query.trim());
            const href = id
              ? txUrl(id)
              : `${MEMPOOL_SITE}/${encodeURIComponent(query.trim())}`;
            if (query.trim()) window.open(href, "_blank", "noopener,noreferrer");
          }}
        >
          <label className="sr-only" htmlFor="lineup-txid">
            Transaction id
          </label>
          <input
            id="lineup-txid"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="txid"
            spellCheck={false}
            autoComplete="off"
          />
        </form>
      </header>

      <div className="lineup-stage">
        <LineupCanvas
          txs={live}
          packing={packing}
          reduced={reduced}
          onHover={(tx, point) => {
            if (!tx || !point) {
              setHover(null);
              return;
            }
            setHover({ tx, x: point.x, y: point.y });
          }}
        />
        {down ? (
          <p className="lineup-miss">
            readout via mempool.space — live feed down.{" "}
            <a href={MEMPOOL_SITE} target="_blank" rel="noreferrer">
              mempool.space
            </a>
          </p>
        ) : null}
        {hover ? (
          <p
            className="lineup-tip"
            style={{ left: hover.x + 12, top: hover.y + 14 }}
          >
            {hoverCopy(hover.tx)}
          </p>
        ) : null}
      </div>

      <nav className="lineup-rail" aria-label="Recent blocks">
        {rail.map((block) => (
          <SealedSeal key={block.hash} block={block} />
        ))}
      </nav>
    </div>
  );
}

function SealedSeal({ block }: { block: SealedBlock }) {
  const packed = useMemo(() => {
    const boxW = 132;
    const boxH = 64;
    let x = 0;
    let y = 0;
    let rowH = 0;
    return block.tiles.map((tx) => {
      const size = tileSide(tx.value, 4, 16);
      if (x > 0 && x + size > boxW) {
        x = 0;
        y += rowH;
        rowH = 0;
      }
      const cell = { tx, size, x, y, rgb: tileRgb(tx.value) };
      x += size;
      rowH = Math.max(rowH, size);
      if (y + size > boxH) {
        return { ...cell, skip: true };
      }
      return { ...cell, skip: false };
    });
  }, [block.tiles]);

  return (
    <a
      className="lineup-seal"
      href={blockUrl(block.hash)}
      target="_blank"
      rel="noreferrer"
    >
      <span className="lineup-seal-art" aria-hidden="true">
        {packed.map((cell) =>
          cell.skip ? null : (
            <i
              key={cell.tx.txid}
              style={{
                left: cell.x,
                top: cell.y,
                width: Math.max(2, cell.size - 1),
                height: Math.max(2, cell.size - 1),
                background: `rgb(${cell.rgb[0]},${cell.rgb[1]},${cell.rgb[2]})`,
              }}
            />
          ),
        )}
      </span>
      <span className="lineup-seal-h">{formatInteger(block.height)}</span>
    </a>
  );
}
