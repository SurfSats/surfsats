"use client";

import { cn } from "@/lib/cn";
import {
  type LineupSnapshot,
  feeChips,
  formatSatVb,
} from "@/lib/lineup";

export function FeeChips({ snapshot }: { snapshot: LineupSnapshot }) {
  const chips = feeChips(snapshot);

  return (
    <ul className="well-chips" aria-label="Recommended fees">
      {chips.map((chip) => (
        <li key={chip.id}>
          <div className={cn("well-chip", `is-${chip.id}`)}>
            <span className="well-chip-label">{chip.label}</span>
            <strong className="well-chip-value">
              {chip.satVb !== null ? formatSatVb(chip.satVb) : "—"}
            </strong>
            <span className="well-chip-unit">sat/vB</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
