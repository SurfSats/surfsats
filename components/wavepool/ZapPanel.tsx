"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { WAVE_POOL_GOAL_SATS, WAVE_ZAP_PRESETS } from "@/lib/wavepool";

export function ZapPanel({
  complete,
  onZap,
}: {
  complete: boolean;
  onZap: (sats: number) => Promise<void> | void;
}) {
  const [amount, setAmount] = useState<number>(21);
  const [custom, setCustom] = useState("");
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const selected = custom ? Number(custom) : amount;
  const valid = Number.isFinite(selected) && selected >= 1 && selected <= WAVE_POOL_GOAL_SATS;

  async function feed() {
    if (!valid || complete || pending) return;
    setPending(true);
    setNote("building invoice…");

    // Lightning hook: swap this block for a real invoice.
    // 1) POST /api/ln/invoice { sats: selected }
    // 2) show bolt11 / QR
    // 3) wait for payment, then call onZap(selected)
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    await onZap(selected);

    setPending(false);
    setNote(`${selected} sats in the pool · invoice was simulated`);
  }

  return (
    <section className="border border-sats/50 bg-sats/8 p-5 shadow-[4px_4px_0_var(--color-magenta)] sm:p-7">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sats">
        {"//"} feed_the_wave
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
        Add energy
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Zap sats into the shared pool. {WAVE_POOL_GOAL_SATS} unlocks the set.
        Lightning invoices plug in here — nothing is charged yet.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {WAVE_ZAP_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={complete}
            onClick={() => {
              setAmount(preset);
              setCustom("");
            }}
            className={cn(
              "border px-3 py-2 font-mono text-xs uppercase tracking-[0.14em]",
              !custom && amount === preset
                ? "border-sats bg-sats text-background"
                : "border-cyan/30 text-cyan hover:border-cyan",
            )}
          >
            {preset} sats
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.16em] text-cyan">
          &gt; custom_sats
        </span>
        <input
          inputMode="numeric"
          disabled={complete}
          value={custom}
          onChange={(event) => setCustom(event.target.value.replace(/[^\d]/g, ""))}
          placeholder="e.g. 77"
          className="input-terminal"
        />
      </label>

      <button
        type="button"
        disabled={complete || pending || !valid}
        onClick={() => void feed()}
        className="btn btn-pulse mt-6 w-full px-5 py-4 text-sm disabled:opacity-40"
      >
        {complete ? "pool locked" : pending ? "invoicing…" : "feed the wave"}
      </button>

      {note ? (
        <p className="mt-4 border border-cyan/30 bg-cyan/8 px-4 py-3 font-mono text-xs text-cyan">
          {note}
        </p>
      ) : null}
    </section>
  );
}
