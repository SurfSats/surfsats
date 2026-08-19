"use client";

import { useEffect, useState } from "react";
import { GraffitiTag } from "@/components/graffiti/GraffitiTag";
import { cn } from "@/lib/cn";
import {
  GRAFFITI_MAX_CHARS,
  GRAFFITI_PRICE_SATS,
  GRAFFITI_TTL_HOURS,
  type GraffitiColor,
  type GraffitiMark,
  type GraffitiStyle,
  graffitiColors,
  graffitiStyles,
  sanitizeGraffiti,
} from "@/lib/graffiti";

type Step = "compose" | "preview" | "invoice" | "done";

export function GraffitiForm({
  onPaid,
}: {
  onPaid: (mark: GraffitiMark) => void;
}) {
  const [text, setText] = useState("");
  const [style, setStyle] = useState<GraffitiStyle>("tag");
  const [color, setColor] = useState<GraffitiColor>("banana");
  const [step, setStep] = useState<Step>("compose");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState("");
  const [paymentHash, setPaymentHash] = useState("");
  const [qrSrc, setQrSrc] = useState("");
  const [copied, setCopied] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const check = sanitizeGraffiti(text);
  const previewText = check.ok ? check.text : text.trim() || "your mark";
  const styleLabel =
    graffitiStyles.find((item) => item.id === style)?.label ?? style;
  const colorLabel =
    graffitiColors.find((item) => item.id === color)?.label ?? color;

  useEffect(() => {
    if (!paymentRequest) {
      setQrSrc("");
      return;
    }
    let cancelled = false;
    void import("qrcode").then(async (QRCode) => {
      const src = await QRCode.toDataURL(paymentRequest, {
        width: 280,
        margin: 2,
        color: { dark: "#111111", light: "#efe6d4" },
        errorCorrectionLevel: "M",
      });
      if (!cancelled) setQrSrc(src);
    });
    return () => {
      cancelled = true;
    };
  }, [paymentRequest]);

  useEffect(() => {
    if (step !== "invoice" || !paymentHash) return;

    let cancelled = false;
    setWaiting(true);

    async function poll() {
      try {
        const response = await fetch(
          `/api/lightning/check?hash=${encodeURIComponent(paymentHash)}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          paid?: boolean;
          mark?: GraffitiMark | null;
        };
        if (cancelled) return;
        if (data.paid && data.mark) {
          setWaiting(false);
          onPaid(data.mark);
          setStep("done");
        }
      } catch {
        // keep waiting; next tick retries
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [step, paymentHash, onPaid]);

  function showPreview() {
    const next = sanitizeGraffiti(text);
    if (!next.ok) {
      setError(next.reason);
      return;
    }
    setError(null);
    setStep("preview");
  }

  async function requestInvoice() {
    const next = sanitizeGraffiti(text);
    if (!next.ok) {
      setError(next.reason);
      setStep("compose");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/lightning/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: next.text,
          style,
          color,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        payment_request?: string;
        payment_hash?: string;
      };
      if (!response.ok || !data.payment_request || !data.payment_hash) {
        setError(data.error || "could not create invoice. try again");
        return;
      }
      setPaymentRequest(data.payment_request);
      setPaymentHash(data.payment_hash);
      setCopied(false);
      setStep("invoice");
    } catch {
      setError("could not create invoice. try again");
    } finally {
      setPending(false);
    }
  }

  async function copyInvoice() {
    if (!paymentRequest) return;
    try {
      await navigator.clipboard.writeText(paymentRequest);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function reset() {
    setText("");
    setStep("compose");
    setError(null);
    setPending(false);
    setPaymentRequest("");
    setPaymentHash("");
    setQrSrc("");
    setCopied(false);
    setWaiting(false);
  }

  return (
    <section className="graffiti-form">
      <p className="text-[11px] uppercase tracking-[0.2em] text-amber-500/90">
        spray can · {GRAFFITI_PRICE_SATS} sats · {GRAFFITI_TTL_HOURS}h
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-[#efe6d4]">
        Leave a mark
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-300">
        {GRAFFITI_PRICE_SATS} sats. {GRAFFITI_TTL_HOURS} hours. Then it fades.
        Hope stays.
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
              className="w-full resize-none border border-stone-700 bg-black/70 px-3 py-2 text-[#efe6d4] outline-none focus:border-amber-500"
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

          <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-stone-400">
            live preview
          </p>
          <div className="graf-preview-wall graf-preview-wall--compact mt-2">
            <div className="graf-preview-tag">
              <GraffitiTag
                text={previewText}
                style={style}
                color={color}
                className="text-2xl sm:text-4xl"
              />
            </div>
          </div>

          {error ? (
            <p className="mt-4 text-xs uppercase text-red-400">{error}</p>
          ) : null}

          <button
            type="button"
            disabled={pending || !check.ok}
            onClick={showPreview}
            className="mt-6 w-full bg-amber-500 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-black disabled:opacity-40"
          >
            preview mark
          </button>
        </>
      ) : null}

      {step === "preview" ? (
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-amber-500">
            preview · how it hits the wall
          </p>
          <div className="graf-preview-wall mt-3">
            <div className="graf-preview-tag">
              <GraffitiTag
                text={previewText}
                style={style}
                color={color}
                className="text-3xl sm:text-5xl"
              />
            </div>
          </div>
          <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-stone-400">
            {styleLabel} · {colorLabel} · {GRAFFITI_PRICE_SATS} sats ·{" "}
            {GRAFFITI_TTL_HOURS} hours
          </p>
          {error ? (
            <p className="mt-4 text-xs uppercase text-red-400">{error}</p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={pending}
              onClick={() => void requestInvoice()}
              className="flex-1 bg-amber-500 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-black disabled:opacity-40"
            >
              {pending
                ? "building invoice…"
                : `looks good — ${GRAFFITI_PRICE_SATS} sats`}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep("compose");
              }}
              className="flex-1 border border-stone-500 px-4 py-3 text-xs uppercase tracking-[0.12em] text-stone-300"
            >
              edit
            </button>
          </div>
        </div>
      ) : null}

      {step === "invoice" ? (
        <div className="mt-5 border border-stone-600 bg-black/70 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-amber-500">
            invoice · {GRAFFITI_PRICE_SATS} sats · unpaid
          </p>
          {qrSrc ? (
            <img
              src={qrSrc}
              alt="Lightning invoice QR"
              className="graf-invoice-qr mx-auto mt-4"
            />
          ) : (
            <div className="graf-invoice-qr mx-auto mt-4 grid place-items-center bg-[#efe6d4] text-[11px] uppercase text-black">
              loading qr
            </div>
          )}
          <p className="mt-4 break-all font-mono text-[11px] leading-relaxed text-stone-400">
            {paymentRequest}
          </p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-amber-500/90">
            {waiting ? "waiting for payment…" : "scan or copy the invoice"}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void copyInvoice()}
              className="flex-1 bg-amber-500 px-4 py-2 text-xs font-bold uppercase text-black"
            >
              {copied ? "copied" : "copy invoice"}
            </button>
            <a
              href={`lightning:${paymentRequest}`}
              className="flex-1 border border-stone-500 px-4 py-2 text-center text-xs uppercase text-stone-300"
            >
              open wallet
            </a>
          </div>
          <button
            type="button"
            onClick={() => {
              setPaymentHash("");
              setPaymentRequest("");
              setQrSrc("");
              setWaiting(false);
              setStep("preview");
            }}
            className="mt-3 w-full text-[11px] uppercase tracking-[0.14em] text-stone-500 hover:text-stone-300"
          >
            back to preview
          </button>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="mt-5 border border-amber-700/50 bg-black/70 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-amber-500">
            paid · on the wall · {GRAFFITI_TTL_HOURS} hours
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
