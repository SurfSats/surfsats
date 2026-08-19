"use client";

import { useMemo, useState } from "react";
import type { AssemblyPacket, LineupSnapshot } from "@/lib/lineup";
import {
  feeBandColor,
  feeColor,
  formatVmb,
  formatVsize,
  mempoolUrl,
  shortTxid,
} from "@/lib/lineup";
import { formatBlockAge } from "@/lib/timechain";
import { cn } from "@/lib/cn";

const ROWS = 3;

type LaidPacket = AssemblyPacket & {
  x: number;
  w: number;
  row: number;
};

export function LineupVisual({
  snapshot,
  selectedId,
  onSelect,
}: {
  snapshot: LineupSnapshot;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const capacity = snapshot.capacityVsize;
  const filled = snapshot.nextBlockVsize ?? 0;
  const fullness = Math.min(1, filled / capacity);

  const { template, queue } = useMemo(() => {
    const inBlock = snapshot.packets.filter((packet) => packet.inTemplate);
    const waiting = snapshot.packets.filter((packet) => !packet.inTemplate);
    return {
      template: layoutTemplate(inBlock, capacity),
      queue: waiting.slice(0, 18),
    };
  }, [snapshot.packets, capacity]);

  const inspect =
    snapshot.packets.find((packet) => packet.id === selectedId) ??
    snapshot.packets.find((packet) => packet.id === hoverId) ??
    null;

  return (
    <div className="lineup-rail-wrap">
      <div className="lineup-rail-head">
        <p>Next block template · 1.0–1.5 vMB</p>
        <p className="text-sats">
          {formatVmb(filled)} / {formatVmb(capacity)} vMB
          <span className="ml-2 text-muted">fullness</span>
        </p>
      </div>

      <div className="lineup-rail-row">
        <div className="lineup-gate">
          <span>Mined / confirmed gate</span>
          <i />
        </div>

        <div className="lineup-rail" role="img" aria-label="Next block assembly rail">
          <div className="lineup-rail-track">
            {template.map((packet) => (
              <button
                key={packet.id}
                type="button"
                className={cn(
                  "lineup-packet",
                  (hoverId === packet.id || selectedId === packet.id) &&
                    "lineup-packet-hot",
                )}
                style={{
                  left: `${packet.x * 100}%`,
                  width: `${Math.max(packet.w * 100, 0.9)}%`,
                  top: `${packet.row * (100 / ROWS)}%`,
                  height: `${100 / ROWS - 4}%`,
                  background: feeColor(packet.feeRate),
                  boxShadow: `0 0 10px ${feeColor(packet.feeRate)}66`,
                }}
                onMouseEnter={() => setHoverId(packet.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={() =>
                  onSelect(selectedId === packet.id ? null : packet.id)
                }
                title={`${packet.feeRate.toFixed(1)} sat/vB · ${formatVsize(packet.vsize)}`}
              />
            ))}
          </div>
          <div className="lineup-rail-scale">
            <span>0 vMB</span>
            <span>{formatVmb(capacity)} vMB</span>
          </div>
          <div className="lineup-rail-meter">
            <span style={{ width: `${fullness * 100}%` }} />
          </div>
        </div>

        <div className="lineup-inflow">
          <p>Mempool inflow</p>
          <p>sorted by fee density</p>
          <div className="lineup-queue">
            {queue.map((packet, index) => (
              <button
                key={packet.id}
                type="button"
                className="lineup-q-packet"
                style={{
                  background: feeColor(packet.feeRate),
                  opacity: 0.45 + (index % 4) * 0.1,
                  animationDelay: `${index * 90}ms`,
                }}
                onMouseEnter={() => setHoverId(packet.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={() =>
                  onSelect(selectedId === packet.id ? null : packet.id)
                }
              />
            ))}
          </div>
          <ul className="lineup-legend">
            <li>
              <i style={{ background: "#ff7a18" }} /> high-fee first in line
            </li>
            <li>
              <i style={{ background: "#7c3aed" }} /> low-fee waiting queue
            </li>
          </ul>
        </div>
      </div>

      {inspect ? (
        <div className="lineup-inspect">
          <p>
            {inspect.feeRate.toFixed(2)} sat/vB · {formatVsize(inspect.vsize)}
            {inspect.firstSeen
              ? ` · ${formatBlockAge(Date.now() / 1000 - inspect.firstSeen)}`
              : ""}
          </p>
          {inspect.txid ? (
            <a
              href={mempoolUrl(inspect.txid)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {shortTxid(inspect.txid)} →
            </a>
          ) : (
            <span>sampled packet · no txid</span>
          )}
        </div>
      ) : (
        <p className="lineup-inspect lineup-inspect-idle">
          hover / tap a packet · fee · vsize · age · txid
        </p>
      )}
    </div>
  );
}

export function FeeHistogram({ snapshot }: { snapshot: LineupSnapshot }) {
  const max = Math.max(1, ...snapshot.bands.map((band) => band.count));
  return (
    <div className="lineup-hist">
      <p className="lineup-hud-label">Fee histogram · sat/vB</p>
      <div className="lineup-hist-chart">
        {snapshot.bands.map((band) => (
          <div key={band.id} className="lineup-hist-col">
            <div
              className="lineup-hist-bar"
              style={{
                height: `${Math.max(8, (band.count / max) * 100)}%`,
                background: feeBandColor(band.min),
              }}
            />
            <span>{band.label}</span>
          </div>
        ))}
      </div>
      <ul className="lineup-hist-list">
        {snapshot.bands.map((band) => (
          <li key={band.id}>
            <i style={{ background: feeBandColor(band.min) }} />
            {band.label} sat/vB
            <b>{band.count.toLocaleString()}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function layoutTemplate(
  packets: AssemblyPacket[],
  capacity: number,
): LaidPacket[] {
  const fills = [0, 0, 0];
  const laid: LaidPacket[] = [];
  const denom = Math.max(capacity, 1);

  for (const packet of packets) {
    let row = 0;
    if (fills[1] < fills[row]) row = 1;
    if (fills[2] < fills[row]) row = 2;
    const x = fills[row] / denom;
    const w = packet.vsize / denom;
    fills[row] += packet.vsize;
    if (x >= 1) continue;
    laid.push({
      ...packet,
      row,
      x,
      w: Math.min(w, 1 - x),
    });
  }
  return laid;
}
