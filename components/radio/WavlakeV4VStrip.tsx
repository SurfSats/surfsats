"use client";

import { useState } from "react";
import { BrutalistButton } from "@/components/ui/BrutalistButton";
import { useOfferZap } from "@/components/pay/useOfferZap";
import { cn } from "@/lib/cn";
import { V4V_PRESETS, type V4vPreset } from "@/lib/v4v";

type WavlakeV4VStripProps = {
  lud16?: string | null;
  className?: string;
};

export function WavlakeV4VStrip({ lud16, className }: WavlakeV4VStripProps) {
  const [active, setActive] = useState<V4vPreset | null>(null);
  const [status, setStatus] = useState<"idle" | "minting" | "paid" | "error">("idle");
  const { offer, modal } = useOfferZap({
    amountSats: active ?? 21,
    onPreimage: () => {
      setStatus("paid");
      setActive(null);
    },
  });

  async function boost(amount: V4vPreset) {
    setActive(amount);
    setStatus("minting");
    try {
      const response = await fetch("/api/v4v/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountSats: amount, lud16: lud16 ?? undefined }),
      });
      const data = (await response.json()) as { bolt11?: string };
      if (!response.ok || !data.bolt11) {
        setStatus("error");
        return;
      }
      await offer(data.bolt11);
      setStatus((current) => (current === "paid" ? "paid" : "idle"));
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border border-zinc-raw bg-void p-3 font-mono sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {modal}
      <p className="text-[10px] tracking-telemetry text-zinc-raw uppercase">
        V4V_BOOST // WAVLAKE_MATRIX
        {status === "paid" ? (
          <span className="ml-2 text-terminal-green">PREIMAGE_OK</span>
        ) : null}
        {status === "error" ? (
          <span className="ml-2 text-amber">INVOICE_FAILED</span>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-2">
        {V4V_PRESETS.map((amount) => (
          <BrutalistButton
            key={amount}
            size="sm"
            variant={amount === 21 ? "amber" : "secondary"}
            disabled={status === "minting"}
            onClick={() => {
              void boost(amount);
            }}
          >
            [ {amount} SATS ]
          </BrutalistButton>
        ))}
      </div>
    </div>
  );
}
