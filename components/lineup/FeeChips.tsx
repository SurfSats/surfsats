"use client";

import { cn } from "@/lib/cn";
import {
  type LineupSnapshot,
  feeChips,
  feeUsd,
  formatFeeUsd,
  formatSatVb,
} from "@/lib/lineup";

export function FeeChips({ snapshot }: { snapshot: LineupSnapshot }) {
  const chips = feeChips(snapshot);

  return (
    <ul className="well-chips" aria-label="Recommended fees">
      {chips.map((chip) => {
        const usd =
          chip.satVb !== null && snapshot.priceUsd !== null
            ? feeUsd(chip.satVb, snapshot.priceUsd)
            : null;
        return (
          <li key={chip.id}>
            <div className={cn("well-glass well-chip", `is-${chip.id}`)}>
              <span className="well-chip-label">{chip.label}</span>
              <strong className="well-chip-value">
                {chip.satVb !== null ? formatSatVb(chip.satVb) : "—"}
                <span>sat/vB</span>
              </strong>
              <span className="well-chip-usd">
                {usd !== null ? `${formatFeeUsd(usd)} / 140 vB` : "140 vB"}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
