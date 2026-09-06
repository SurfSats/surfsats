"use client";

import Link from "next/link";
import { useMempoolTelemetry } from "@/hooks/useMempoolTelemetry";
import { cn } from "@/lib/cn";

export function MempoolFeeChip({ className }: { className?: string }) {
  const { telemetry } = useMempoolTelemetry();
  const fastest = telemetry.fastestFee;
  const half = telemetry.halfHourFee;
  const min = telemetry.minimumFee;

  return (
    <Link
      href="/chain"
      className={cn(
        "hidden shrink-0 items-center gap-1.5 border border-zinc-raw bg-void px-2 py-1 font-mono text-[10px] tracking-telemetry uppercase xl:flex",
        className,
      )}
      title="Mempool.space fee telemetry"
    >
      <span className="text-zinc-raw">FEE</span>
      <span className="font-bold text-amber">{fastest ?? "--"}</span>
      <span className="text-zinc-raw">/</span>
      <span className="text-violet">{half ?? "--"}</span>
      <span className="text-zinc-raw">/</span>
      <span className="text-zinc-raw">{min ?? "--"}</span>
      <span className="text-zinc-raw">SAT/VB</span>
    </Link>
  );
}
