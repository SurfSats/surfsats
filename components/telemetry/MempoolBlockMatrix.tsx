"use client";

import { TerminalCard } from "@/components/ui/TerminalCard";
import { useMempoolTelemetry } from "@/hooks/useMempoolTelemetry";
import { cn } from "@/lib/cn";
import { formatInteger } from "@/lib/timechain";
import { formatSatVb } from "@/lib/mempool-fees";

export function MempoolBlockMatrix({ className }: { className?: string }) {
  const { telemetry, pulse, status } = useMempoolTelemetry();

  return (
    <TerminalCard
      title="TIMECHAIN_TELEMETRY // MEMPOOL_SPACE"
      tag="MAINNET_CONSENSUS"
      status={status === "live" ? "live" : "idle"}
      className={cn(
        pulse ? "border-violet shadow-[0_0_24px_rgba(124,58,237,0.35)]" : "",
        className,
      )}
    >
      <div className="grid grid-cols-2 gap-3 font-mono md:grid-cols-4">
        <Cell
          label="TIP_HEIGHT"
          value={
            telemetry.tipHeight !== null
              ? formatInteger(telemetry.tipHeight)
              : "--"
          }
          tone="salt"
        />
        <Cell
          label="FASTEST_PRIORITY"
          value={formatSatVb(telemetry.fastestFee)}
          tone="amber"
        />
        <Cell
          label="HALF_HOUR"
          value={formatSatVb(telemetry.halfHourFee)}
          tone="violet"
        />
        <Cell
          label="MINIMUM_FEE"
          value={formatSatVb(telemetry.minimumFee)}
          tone="zinc"
        />
      </div>
    </TerminalCard>
  );
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "salt" | "amber" | "violet" | "zinc";
}) {
  return (
    <div className="border border-zinc-raw bg-void px-3 py-3">
      <p className="text-[10px] tracking-telemetry text-zinc-raw uppercase">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-bold tracking-wider",
          tone === "salt" && "text-salt",
          tone === "amber" && "text-amber",
          tone === "violet" && "text-violet",
          tone === "zinc" && "text-zinc-raw",
        )}
      >
        {value}
      </p>
    </div>
  );
}
