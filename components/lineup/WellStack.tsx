"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import {
  BLOCK_VSIZE,
  type LineupSnapshot,
  type ProjectedBlock,
  formatBtcFromSats,
  formatSatVb,
  formatVmb,
} from "@/lib/lineup";
import { formatInteger } from "@/lib/timechain";

export function WellStack({ snapshot }: { snapshot: LineupSnapshot }) {
  const layers = snapshot.projected;
  const [open, setOpen] = useState<number | null>(0);
  const heat = useMemo(() => heatRange(layers), [layers]);

  if (layers.length === 0) {
    return (
      <div className="well-glass well-empty">
        <p>no projected blocks · mempool quiet or readout missed</p>
      </div>
    );
  }

  return (
    <div className="well-stack-wrap">
      <ol className="well-stack" aria-label="Projected mempool blocks">
        {layers.map((layer) => {
          const selected = open === layer.index;
          const last = layer.index === layers.length - 1;
          return (
            <li key={layer.index}>
              <button
                type="button"
                className={cn(
                  "well-glass well-layer",
                  selected && "is-open",
                  last && "is-floor",
                )}
                style={layerStyle(layer, heat)}
                aria-expanded={selected}
                onClick={() =>
                  setOpen((current) =>
                    current === layer.index ? null : layer.index,
                  )
                }
              >
                <span className="well-layer-index">
                  {layer.index === 0 ? "NEXT" : `+${layer.index}`}
                </span>
                <span className="well-layer-fee">
                  {formatSatVb(layer.medianFee)}
                  <em>sat/vB</em>
                </span>
                <span className="well-layer-meta">
                  {formatInteger(layer.nTx)} tx · {formatVmb(layer.blockVSize)}{" "}
                  vMB
                </span>
              </button>
              {selected ? (
                <p className="well-layer-detail">
                  range {formatSatVb(layer.feeMin)}–{formatSatVb(layer.feeMax)}{" "}
                  sat/vB · {formatBtcFromSats(layer.totalFees)} fees ·{" "}
                  {formatInteger(layer.nTx)} tx · {formatVmb(layer.blockVSize)}{" "}
                  vMB
                  {layer.blockVSize > BLOCK_VSIZE
                    ? " · leftover below the cut"
                    : ""}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="well-stack-hint">
        Tap a layer for range, size, and fees.
      </p>
    </div>
  );
}

function heatRange(layers: ProjectedBlock[]) {
  const fees = layers.map((layer) => layer.medianFee);
  const min = Math.min(...fees, 0.1);
  const max = Math.max(...fees, min + 0.01);
  return { min, max };
}

function layerStyle(
  layer: ProjectedBlock,
  heat: { min: number; max: number },
) {
  const t = (layer.medianFee - heat.min) / (heat.max - heat.min);
  const hot = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  const fill = `color-mix(in srgb, var(--sats) ${Math.round(hot * 42 + 6)}%, rgba(61,255,243,${0.08 + (1 - hot) * 0.1}))`;
  const vs = Math.min(layer.blockVSize, BLOCK_VSIZE * 1.6);
  const height = 2.45 + (vs / (BLOCK_VSIZE * 1.6)) * 2.1;
  return {
    "--layer-fill": fill,
    minHeight: `${height}rem`,
  } as CSSProperties;
}
