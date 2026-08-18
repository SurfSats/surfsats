"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { WAVE_POOL_GOAL_SATS, WAVE_ZAP_PRESETS } from "@/lib/wavepool";

type Step = "pick" | "invoice" | "paid";

export function ZapPanel({
  complete,
  remaining,
  onZap,
}: {
  complete: boolean;
  remaining: number;
  onZap: (sats: number) => Promise<void> | void;
}) {
  const [amount, setAmount] = useState<number>(21);
  const [custom, setCustom] = useState("");
  const [step, setStep] = useState<Step>("pick");
  const [pending, setPending] = useState(false);

  const selected = custom ? Number(custom) : amount;
  const valid =
    Number.isFinite(selected) && selected >= 1 && selected <= WAVE_POOL_GOAL_SATS;

  async function requestInvoice() {
    if (!valid || complete || pending) return;
    setPending(true);

    // Lightning hook:
    // 1) POST /api/ln/invoice { sats: selected }
    // 2) render bolt11 + QR from the response
    // 3) wait for payment / webhook, then onZap(selected)
    await wait(450);
    setStep("invoice");
    setPending(false);
  }

  async function simulatePay() {
    if (pending) return;
    setPending(true);
    await wait(700);
    await onZap(selected);
    setStep("paid");
    setPending(false);
  }

  function resetFlow() {
    setStep("pick");
    setPending(false);
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
        {complete
          ? "Pool is locked. The set already broke."
          : `${remaining} sats left to ${WAVE_POOL_GOAL_SATS}. Lightning invoices plug in here — nothing is charged yet.`}
      </p>

      {step === "pick" || complete ? (
        <>
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
              onChange={(event) =>
                setCustom(event.target.value.replace(/[^\d]/g, ""))
              }
              placeholder="e.g. 77"
              className="input-terminal"
            />
          </label>

          <button
            type="button"
            disabled={complete || pending || !valid}
            onClick={() => void requestInvoice()}
            className="btn btn-pulse mt-6 w-full px-5 py-4 text-sm disabled:opacity-40"
          >
            {complete ? "pool locked" : pending ? "building invoice…" : "feed the wave"}
          </button>
        </>
      ) : null}

      {step === "invoice" && !complete ? (
        <div className="mt-5 border border-cyan/30 bg-black p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cyan">
            invoice · {selected} sats
          </p>
          <p className="mt-3 break-all font-mono text-[11px] leading-relaxed text-muted">
            lnbc{selected}n1psurfsatsplaceholder
            {String(selected).padStart(4, "0")}waitforrealbolt11
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase text-sats">
            simulated · no sats move yet
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={pending}
              onClick={() => void simulatePay()}
              className="btn flex-1"
            >
              {pending ? "listening…" : "simulate payment"}
            </button>
            <button
              type="button"
              onClick={resetFlow}
              className="btn btn-ghost flex-1"
            >
              cancel
            </button>
          </div>
        </div>
      ) : null}

      {step === "paid" && !complete ? (
        <div className="mt-5 border border-sats/40 bg-sats/10 px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-sats">
            +{selected} sats in the pool
          </p>
          <button
            type="button"
            onClick={resetFlow}
            className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-cyan hover:text-sats"
          >
            zap again -&gt;
          </button>
        </div>
      ) : null}
    </section>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
