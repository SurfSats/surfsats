"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Liquid } from "liquid-gooey";
import { cn } from "@/lib/cn";
import {
  type LineupSnapshot,
  type ProjectedBlock,
  formatBtcFromSats,
  formatSatVb,
  formatVmb,
} from "@/lib/lineup";
import { formatInteger } from "@/lib/timechain";

export function WellStack({ snapshot }: { snapshot: LineupSnapshot }) {
  const layers = snapshot.projected;
  const [open, setOpen] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const reduced = usePrefersReducedMotion();
  const heat = useMemo(() => heatRange(layers), [layers]);
  const maxNtx = Math.max(1, ...layers.map((layer) => layer.nTx));
  const maxFee = Math.max(1, ...layers.map((layer) => layer.totalFees));
  const maxVsize = Math.max(1, ...layers.map((layer) => layer.blockVSize));

  if (layers.length === 0) {
    return (
      <p className="well-empty">no projected blocks · readout missed</p>
    );
  }

  const items = layers.map((layer) => {
    const active = open === layer.index || hovered === layer.index;
    const dimmed =
      (open !== null || hovered !== null) &&
      open !== layer.index &&
      hovered !== layer.index;
    const t = heatT(layer.medianFee, heat);
    const weight = Math.max(
      layer.nTx / maxNtx,
      layer.totalFees / maxFee,
      layer.blockVSize / maxVsize,
    );
    const width = 42 + weight * 58;
    const height = active ? 64 : dimmed ? 48 : 54;
    const fill = heatFill(t);
    const ink = t > 0.58 ? "#140804" : "#e7fffc";

    const bar = (
      <button
        type="button"
        className={cn("well-bar", active && "is-hot")}
        style={
          {
            width: `${width}%`,
            height,
            background: fill,
            color: ink,
            "--bar-ink": ink,
          } as CSSProperties
        }
        aria-expanded={open === layer.index}
        onClick={() =>
          setOpen((current) => (current === layer.index ? null : layer.index))
        }
        onPointerEnter={() => setHovered(layer.index)}
        onPointerLeave={() => setHovered(null)}
        onFocus={() => setHovered(layer.index)}
        onBlur={() => setHovered(null)}
      >
        <span className="well-bar-idx">
          {layer.index === 0 ? "NEXT" : `+${layer.index}`}
        </span>
        <span className="well-bar-stats">
          {formatSatVb(layer.medianFee)} sat/vB · {formatInteger(layer.nTx)} tx ·{" "}
          {formatVmb(layer.blockVSize)} vMB
        </span>
        {open === layer.index ? (
          <span className="well-bar-extra">
            {formatSatVb(layer.feeMin)}–{formatSatVb(layer.feeMax)} sat/vB ·{" "}
            {formatBtcFromSats(layer.totalFees)} fees
          </span>
        ) : null}
      </button>
    );

    if (reduced) {
      return (
        <li key={layer.index} className="well-bar-slot">
          {bar}
        </li>
      );
    }

    return (
      <Liquid.Item
        key={layer.index}
        morph={{
          shape: true,
          contentBlur: 0,
          bounce: 0.3,
          speed: 1.5,
          advanced: {
            blobInset: active ? 0 : 2,
            bridgeGrow: active ? 10 : 0,
          },
        }}
        scale={active ? 1.03 : dimmed ? 0.97 : 1}
        radius={10}
      >
        {bar}
      </Liquid.Item>
    );
  });

  if (reduced) {
    return (
      <ol className="well-stack" aria-label="Projected mempool blocks">
        {items}
      </ol>
    );
  }

  return (
    <div aria-label="Projected mempool blocks">
      <Liquid
        blur={5}
        contrast={15}
        fill="rgba(255,122,24,0.7)"
        waviness={0}
        filterPadding={28}
        className="well-goo"
      >
        {items}
      </Liquid>
    </div>
  );
}

function heatRange(layers: ProjectedBlock[]) {
  const fees = layers.map((layer) => layer.medianFee);
  const min = Math.min(...fees);
  const max = Math.max(...fees);
  return { min, max };
}

function heatT(fee: number, range: { min: number; max: number }) {
  if (!Number.isFinite(fee)) return 0;
  const span = range.max - range.min;
  if (span <= 1e-9) return 0.5;
  return Math.max(0, Math.min(1, (fee - range.min) / span));
}

function heatFill(t: number) {
  const c = heatRgb(t);
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function heatRgb(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  if (x < 0.4) {
    const u = x / 0.4;
    return [
      lerp(22, 48, u),
      lerp(92, 205, u),
      lerp(98, 196, u),
    ];
  }
  const u = (x - 0.4) / 0.6;
  return [
    lerp(255, 255, u),
    lerp(92, 122, u),
    lerp(28, 24, u),
  ];
}

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}
