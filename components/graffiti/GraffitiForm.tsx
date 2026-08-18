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
  const [style, setStyle] = useState<GraffitiStyle>("drip");
  const [color, setColor] = useState<GraffitiColor>("sats");
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
    <section className="border border-sats/50 bg-sats/8 p-5 shadow-[4px_4px_0_var(--color-magenta)] sm:p-7">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sats">
        {"//"} leave_a_mark
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
        Leave a mark — {GRAFFITI_PRICE_SATS} sats
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        24 hours on the wall. Then it fades. Hope stays.
      </p>

      {step === "compose" ? (
        <>
          <label className="mt-5 block">
            <span className="mb-1.5 flex justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-cyan">
              <span>&gt; message</span>
              <span className="text-muted">
                {text.length}/{GRAFFITI_MAX_CHARS}
              </span>
            </span>
            <textarea
              value={text}
              maxLength={GRAFFITI_MAX_CHARS}
              onChange={(event) => setText(event.target.value)}
              rows={3}
              placeholder="say it once"
              className="input-terminal resize-none"
            />
          </label>

          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-cyan">
            style
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {graffitiStyles.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStyle(item.id)}
                className={cn(
                  "border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em]",
                  style === item.id
                    ? "border-sats bg-sats text-background"
                    : "border-cyan/30 text-cyan hover:border-cyan",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-cyan">
            color
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {graffitiColors.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setColor(item.id)}
                className={cn(
                  "size-8 border",
                  color === item.id ? "border-foreground" : "border-white/15",
                )}
                style={{ background: item.hex }}
                aria-label={item.label}
              />
            ))}
          </div>

          {error ? (
            <p className="mt-4 font-mono text-xs uppercase text-magenta">{error}</p>
          ) : null}

          <button
            type="button"
            disabled={pending || !check.ok}
            onClick={() => void requestInvoice()}
            className="btn btn-pulse mt-6 w-full px-5 py-4 text-sm disabled:opacity-40"
          >
            {pending ? "building invoice…" : `leave a mark — ${GRAFFITI_PRICE_SATS} sats`}
          </button>
        </>
      ) : null}

      {step === "invoice" ? (
        <div className="mt-5 border border-cyan/30 bg-black p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cyan">
            invoice · {GRAFFITI_PRICE_SATS} sats
          </p>
          <p className="mt-3 break-all font-mono text-[11px] text-muted">
            lnbc21n1pgraffitiplaceholderwaitforrealbolt11
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase text-sats">
            simulated · nothing charged yet
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
              onClick={() => setStep("compose")}
              className="btn btn-ghost flex-1"
            >
              cancel
            </button>
          </div>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="mt-5 border border-sats/40 bg-sats/10 px-4 py-3">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-sats">
            on the wall · 24 hours
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-cyan hover:text-sats"
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
