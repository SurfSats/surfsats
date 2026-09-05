"use client";

import { useEffect, useState } from "react";
import { GraffitiTag } from "@/components/graffiti/GraffitiTag";
import { InvoiceBurst } from "@/components/pay/InvoiceBurst";
import { InvoiceHint } from "@/components/pay/InvoiceHint";
import { InvoiceQr } from "@/components/pay/InvoiceQr";
import { OneTapZap } from "@/components/pay/OneTapZap";
import { SettleRitual, useSettleHandoff } from "@/components/pay/SettleRitual";
import { useCheckNow } from "@/components/pay/useWebLn";
import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";
import { INVOICE_QR_OPTIONS } from "@/lib/invoice-qr";
import { payFetch } from "@/lib/pay-fetch";
import {
  GRAFFITI_MAX_CHARS,
  GRAFFITI_PRICE_SATS,
  GRAFFITI_TTL_HOURS,
  type GraffitiColor,
  type GraffitiMark,
  type GraffitiPlacement,
  type GraffitiStyle,
  graffitiColors,
  graffitiStyles,
  sanitizeGraffiti,
} from "@/lib/graffiti";

type Step = "compose" | "invoice";

const STYLE_SAMPLES: Record<GraffitiStyle, string> = {
  tag: "Aa",
  throwup: "UP",
  blockbuster: "BIG",
  stencil: "STN",
  drip: "DRP",
  wildstyle: "WLD",
  fatcap: "FAT",
  chrome: "CRM",
};

export function GraffitiForm({
  text,
  style,
  color,
  placed,
  placement,
  onText,
  onStyle,
  onColor,
  onPaid,
  onResetDraft,
}: {
  text: string;
  style: GraffitiStyle;
  color: GraffitiColor;
  placed: boolean;
  placement: GraffitiPlacement | null;
  onText: (value: string) => void;
  onStyle: (value: GraffitiStyle) => void;
  onColor: (value: GraffitiColor) => void;
  onPaid: (mark: GraffitiMark) => void;
  onResetDraft: () => void;
}) {
  const { settling, beginSettle, finishSettle } = useSettleHandoff();
  const { bind: bindCheck, kick: kickCheck } = useCheckNow();
  const [step, setStep] = useState<Step>("compose");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState("");
  const [paymentHash, setPaymentHash] = useState("");
  const [qrSrc, setQrSrc] = useState("");
  const [copied, setCopied] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [expired, setExpired] = useState(false);

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
      const src = await QRCode.toDataURL(paymentRequest, INVOICE_QR_OPTIONS);
      if (!cancelled) setQrSrc(src);
    });
    return () => {
      cancelled = true;
    };
  }, [paymentRequest]);

  useEffect(() => {
    if (step !== "invoice") return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    window.requestAnimationFrame(() => {
      document.getElementById("graf-invoice")?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
    return () => window.clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step !== "invoice" || !expiresAt) return;
    if (Date.now() >= new Date(expiresAt).getTime()) {
      setExpired(true);
      setWaiting(false);
    }
  }, [step, expiresAt, nowTick]);

  useEffect(() => {
    if (step !== "invoice" || !paymentHash || expired || settling) return;

    let cancelled = false;
    setWaiting(true);

    async function poll() {
      try {
        const response = await payFetch(
          `/api/lightning/check?hash=${encodeURIComponent(paymentHash)}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          paid?: boolean;
          mark?: GraffitiMark | null;
          error?: string;
        };
        if (cancelled) return;
        if (data.paid && data.mark) {
          const mark = data.mark;
          setInvoiceError(null);
          setWaiting(false);
          beginSettle(() => {
            onPaid(mark);
            reset();
          });
          return;
        }
        if (data.paid && !data.mark) {
          setInvoiceError("payment landed, but the tag could not be placed");
          setWaiting(false);
          return;
        }
        if (!response.ok) {
          setInvoiceError(data.error || "could not check payment. retrying…");
        }
      } catch {
        if (!cancelled) {
          setInvoiceError("could not check payment. retrying…");
        }
      }
    }

    bindCheck(poll);
    void poll();
    const id = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [beginSettle, bindCheck, expired, onPaid, paymentHash, settling, step]);

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
      const response = await payFetch("/api/lightning/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: next.text,
          style,
          color,
          ...(placement
            ? {
                top: placement.top,
                left: placement.left,
                rotate: placement.rotate,
                scale: placement.scale,
              }
            : {}),
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        payment_request?: string;
        payment_hash?: string;
        expires_at?: string | null;
      };
      if (
        !response.ok ||
        !data.payment_request ||
        !data.payment_hash ||
        !data.payment_request.toLowerCase().startsWith("ln")
      ) {
        setError(data.error || "could not create invoice. try again");
        return;
      }
      setPaymentRequest(data.payment_request);
      setPaymentHash(data.payment_hash);
      setExpiresAt(
        data.expires_at ||
          new Date(Date.now() + 50 * 60 * 1000).toISOString(),
      );
      setCopied(false);
      setInvoiceError(null);
      setExpired(false);
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
    onResetDraft();
    setStep("compose");
    setError(null);
    setPending(false);
    setPaymentRequest("");
    setPaymentHash("");
    setQrSrc("");
    setCopied(false);
    setWaiting(false);
    setInvoiceError(null);
    setExpiresAt(null);
    setExpired(false);
  }

  const remainMs = expiresAt ? new Date(expiresAt).getTime() - nowTick : 0;
  const remainLabel = formatRemain(remainMs);
  const hardFail =
    expired ||
    Boolean(invoiceError && !invoiceError.includes("retrying"));

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
              onChange={(event) => onText(event.target.value)}
              rows={3}
              placeholder="say it once"
              className="w-full resize-none border border-stone-700 bg-black/70 px-3 py-3 text-base text-[#efe6d4] outline-none focus:border-amber-500 sm:text-sm"
            />
          </label>

          <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-stone-400">
            can tip · style
          </p>
          <div className="graf-style-grid mt-2">
            {graffitiStyles.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onStyle(item.id)}
                className={cn(
                  "graf-style-tip",
                  style === item.id && "graf-style-tip-active",
                )}
                data-style={item.id}
                aria-pressed={style === item.id}
              >
                <span className="graf-style-glyph">
                  <GraffitiTag
                    text={STYLE_SAMPLES[item.id]}
                    style={item.id}
                    color={color}
                    className="text-xl leading-none sm:text-2xl"
                  />
                </span>
                <span className="graf-style-name">{item.label}</span>
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
                onClick={() => onColor(item.id)}
                className={cn(
                  "size-10 border-2 sm:size-8",
                  color === item.id ? "border-white" : "border-black/40",
                )}
                style={{ background: item.hex }}
                aria-label={item.label}
              />
            ))}
          </div>

          <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-stone-400">
            live preview
          </p>
          <div className="graf-preview-wall graf-preview-wall--compact mt-2">
            <div className="graf-preview-tag">
              <GraffitiTag
                text={previewText}
                style={style}
                color={color}
                className="text-2xl sm:text-3xl"
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-stone-400">
            {previewText === "your mark" ? "your mark" : `“${previewText}”`} ·{" "}
            {styleLabel} · {colorLabel}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-amber-500/80">
            {placed
              ? "placed on the wall · tap again to move"
              : "tap the wall to place · or zap and we’ll pick a spot"}
          </p>

          {error ? (
            <p className="mt-4 text-xs uppercase text-red-400">{error}</p>
          ) : null}

          <button
            type="button"
            disabled={pending || !check.ok}
            onClick={() => void requestInvoice()}
            className="mt-5 min-h-12 w-full bg-amber-500 px-5 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-black disabled:opacity-40"
          >
            {pending ? COPY.validating : COPY.zapSats}
          </button>
        </>
      ) : null}

      {step === "invoice" ? (
        <div id="graf-invoice" className="graf-invoice-pane mt-5 border border-stone-600 bg-black/70 p-4">
          {settling ? (
            <SettleRitual
              subtitle={`spray · ${GRAFFITI_PRICE_SATS} sats · ${GRAFFITI_TTL_HOURS}h`}
              onComplete={finishSettle}
            />
          ) : (
          <>
          <p className="text-[11px] uppercase tracking-[0.16em] text-amber-500">
            invoice · {GRAFFITI_PRICE_SATS} sats ·{" "}
            {expired ? "expired" : "unpaid"}
          </p>
          <InvoiceHint className="mt-2 text-stone-400" />
          {paymentRequest && !expired ? (
            <OneTapZap
              invoice={paymentRequest}
              disabled={pending}
              onPaid={kickCheck}
              tone="graf"
            />
          ) : null}
          <InvoiceBurst
            paymentHash={paymentHash}
            enabled={!expired && Boolean(paymentRequest)}
            onPaid={kickCheck}
            status={
              expired ? null : (
                <div className="graf-wait">
                  <span className="graf-wait-dot" aria-hidden="true" />
                  <p className="text-[11px] uppercase tracking-[0.16em] text-amber-500">
                    {waiting ? COPY.validating : "scan or copy the invoice"}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-stone-400">
                    pay from any lightning wallet
                    {remainLabel ? ` · ${remainLabel}` : ""}
                  </p>
                </div>
              )
            }
          >
            <InvoiceQr
              className="mt-4"
              src={qrSrc}
              invoice={paymentRequest}
              copied={copied}
              expired={expired}
              onCopy={() => void copyInvoice()}
            />
          </InvoiceBurst>
          <p className="mt-4 break-all font-mono text-[11px] leading-relaxed text-stone-400">
            {paymentRequest}
          </p>
          {expired ? (
            <p className="mt-3 text-center text-xs uppercase tracking-[0.14em] text-red-400">
              invoice expired. generate a new one to pay.
            </p>
          ) : null}
          {invoiceError ? (
            <p className="mt-2 text-center text-xs uppercase text-red-400">
              {invoiceError}
            </p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {hardFail ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setPaymentHash("");
                  setPaymentRequest("");
                  setQrSrc("");
                  setWaiting(false);
                  setExpired(false);
                  setInvoiceError(null);
                  void requestInvoice();
                }}
                className="min-h-11 flex-1 bg-amber-500 px-4 py-2 text-xs font-bold uppercase text-black disabled:opacity-40"
              >
                {pending ? COPY.validating : "new invoice"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void copyInvoice()}
                className="min-h-11 flex-1 bg-amber-500 px-4 py-2 text-xs font-bold uppercase text-black"
              >
                {copied ? "copied" : "copy invoice"}
              </button>
            )}
            {!expired ? (
              <a
                href={`lightning:${paymentRequest}`}
                className="min-h-11 flex-1 border border-stone-500 px-4 py-2 text-center text-xs uppercase leading-[1.9] text-stone-300"
              >
                {COPY.zapSats}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPaymentHash("");
                  setPaymentRequest("");
                  setQrSrc("");
                  setWaiting(false);
                  setExpired(false);
                  setInvoiceError(null);
                  setStep("compose");
                }}
                className="min-h-11 flex-1 border border-stone-500 px-4 py-2 text-xs uppercase text-stone-300"
              >
                edit mark
              </button>
            )}
          </div>
          {!expired ? (
            <button
              type="button"
              onClick={() => {
                setPaymentHash("");
                setPaymentRequest("");
                setQrSrc("");
                setWaiting(false);
                setExpired(false);
                setInvoiceError(null);
                setStep("compose");
              }}
              className="mt-3 w-full text-[11px] uppercase tracking-[0.14em] text-stone-500 hover:text-stone-300"
            >
              edit mark
            </button>
          ) : null}
          </>
          )}
        </div>
      ) : null}

    </section>
  );
}

function formatRemain(ms: number) {
  if (ms <= 0) return "";
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")} left`;
}
