"use client";

import Link from "next/link";
import { glassChipLabel } from "@/lib/callsign";
import { useGlass } from "@/lib/useGlass";
import { cn } from "@/lib/cn";

export function GlassChip({ className }: { className?: string }) {
  const { glass, ready } = useGlass();
  const callsign = glass?.callsign ?? "";
  const href = callsign ? `/glass/${encodeURIComponent(callsign)}` : "/glass";
  const label = ready ? glassChipLabel(glass) : "CALLSIGN —";

  return (
    <Link
      href={href}
      className={cn("glass-chip", glass?.etched && "is-etched", className)}
      title="Wall of Glass"
    >
      {label}
    </Link>
  );
}
