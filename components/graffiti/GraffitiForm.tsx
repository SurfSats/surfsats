"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  GRAFFITI_MAX_CHARS,
  GRAFFITI_PRICE_SATS,
  type GraffitiColor,
  type GraffitiStyle,
  graffitiColors,
  graffitiStyles,
  sanitizeGraffiti,
} from "@/lib/graffiti";

type Step = "compose" | "invoice" | "done";

export function GraffitiForm({
  onPaid,
}: {
  onPaid: (text: string, style: GraffitiStyle, color: GraffitiColor) => void;
}) {
  const [text, setText] = useState("");
  const [style, setStyle] = useState<GraffitiStyle>("tag");
  const [color, setColor] = useState<GraffitiColor>("banana");
  const [step, setStep] = useState<Step>("compose");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = sanitizeGraffiti(text);

  async function requestInvoice() {
    const next = sanitizeGraffiti(text);
    if (!next.ok) {
      setError(next.reason);
      return;
    }
    setError(null);
    setPending(true);
    // Lightning hook:
    // 1) POST /api/ln/invoice { sats: 21, memo: next.text }
    // 2) show bolt11 / QR
    // 3) wait for payment, then onPaid(...)
    await wait(400);
    setStep("invoice");
    setPending(false);
  }

  async function simulatePay() {
    const next = sanitizeGraffiti(text);
    if (!next.ok || pending) return;
    setPending(true);
    await wait(650);
    onPaid(next.text, style, color);
    setStep("done");
    setPending(false);
  }

  function reset() {
    setText("");
    setStep("compose");
    setError(null);
    setPending(false);
  }

  return (
    <section className="graffiti-form">
      <p className="text-[11px] uppercase tracking-[0.2em] text-amber-500/90">
        spray can · {GRAFFITI_PRICE_SATS} sats · 24h
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-[#efe6d4]">
        Leave a mark
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-400">
        24 hours on the wall. Then it fades. Hope stays.
      </p>

      {step === "compose" ? (
        <>
          <label className="mt-5 block">
            <span className="mb-1.5 flex justify-between text-[11px] uppercase tracking-[0.16em] text-stone-400">
              <span>message</span>
              <span>
                {text.length}/{GRAFFITI_MAX_CHARS}
              </span>
            </span>
            <textarea
              value={text}
              maxLength={GRAFFITI_MAX_CHARS}
              onChange={(event) => setText(event.target.value)}
              rows={3}
              placeholder="say it once"
              className="w-full resize-none border border-stone-700 bg-black/60 px-3 py-2 text-[#efe6d4] outline-none focus:border-amber-500"
            />
          </label>

          <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-stone-400">
            style
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {graffitiStyles.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStyle(item.id)}
                className={cn(
                  "border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em]",
                  style === item.id
                    ? "border-amber-500 bg-amber-500 text-black"
                    : "border-stone-600 text-stone-300 hover:border-stone-400",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-stone-400">
            color
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {graffitiColors.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setColor(item.id)}
                className={cn(
                  "size-8 border-2",
                  color === item.id ? "border-white" : "border-black/40",
                )}
                style={{ background: item.hex }}
                aria-label={item.label}
              />
            ))}
          </div>

          {error ? (
            <p className="mt-4 text-xs uppercase text-red-400">{error}</p>
          ) : null}

          <button
            type="button"
            disabled={pending || !check.ok}
            onClick={() => void requestInvoice()}
            className="mt-6 w-full bg-amber-500 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-black disabled:opacity-40"
          >
            {pending
              ? "shaking the can…"
              : `leave a mark — ${GRAFFITI_PRICE_SATS} sats`}
          </button>
        </>
      ) : null}

      {step === "invoice" ? (
        <div className="mt-5 border border-stone-600 bg-black/70 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-amber-500">
            invoice · {GRAFFITI_PRICE_SATS} sats
          </p>
          <p className="mt-3 break-all font-mono text-[11px] text-stone-500">
            lnbc21n1pgraffitiplaceholderwaitforrealbolt11
          </p>
          <p className="mt-3 text-[11px] uppercase text-stone-400">
            simulated · nothing charged yet
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={pending}
              onClick={() => void simulatePay()}
              className="flex-1 bg-amber-500 px-4 py-2 text-xs font-bold uppercase text-black"
            >
              {pending ? "listening…" : "simulate payment"}
            </button>
            <button
              type="button"
              onClick={() => setStep("compose")}
              className="flex-1 border border-stone-500 px-4 py-2 text-xs uppercase text-stone-300"
            >
              cancel
            </button>
          </div>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="mt-5 border border-amber-700/50 bg-black/60 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-amber-500">
            on the wall · 24 hours
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 text-[11px] uppercase tracking-[0.14em] text-stone-300 hover:text-amber-400"
          >
            another mark -&gt;
          </button>
        </div>
      ) : null}
    </section>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
