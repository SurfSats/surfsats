"use client";

import { useEffect, useState } from "react";
import { GraffitiTag } from "@/components/graffiti/GraffitiTag";
import { SettleRitual, useSettleHandoff } from "@/components/pay/SettleRitual";
import { useOfferZap } from "@/components/pay/useOfferZap";
import { useCheckNow } from "@/components/pay/useWebLn";
import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";
import { payFetch } from "@/lib/pay-fetch";
import { playMechanicalLatch } from "@/lib/sound";
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
  const { offer, modal } = useOfferZap({
    amountSats: GRAFFITI_PRICE_SATS,
    onPreimage: () => {
      kickCheck();
    },
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentHash, setPaymentHash] = useState("");
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
    if (!paymentHash) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [paymentHash]);

  useEffect(() => {
    if (!paymentHash || !expiresAt) return;
    if (Date.now() >= new Date(expiresAt).getTime()) {
      setExpired(true);
      setWaiting(false);
    }
  }, [paymentHash, expiresAt, nowTick]);

  useEffect(() => {
    if (!paymentHash || expired || settling) return;

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
          playMechanicalLatch();
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
  }, [beginSettle, bindCheck, expired, onPaid, paymentHash, settling]);

  async function requestInvoice() {
    const next = sanitizeGraffiti(text);
    if (!next.ok) {
      setError(next.reason);
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
      setPaymentHash(data.payment_hash);
      setExpiresAt(
        data.expires_at ||
          new Date(Date.now() + 50 * 60 * 1000).toISOString(),
      );
      setInvoiceError(null);
      setExpired(false);
      await offer(data.payment_request);
    } catch {
      setError("could not create invoice. try again");
    } finally {
      setPending(false);
    }
  }

  function reset() {
    onResetDraft();
    setError(null);
    setPending(false);
    setPaymentHash("");
    setWaiting(false);
    setInvoiceError(null);
    setExpiresAt(null);
    setExpired(false);
  }

  return (
    <section className="graffiti-form">
      {settling ? (
        <SettleRitual
          subtitle={`spray · ${GRAFFITI_PRICE_SATS} sats · ${GRAFFITI_TTL_HOURS}h`}
          onComplete={finishSettle}
        />
      ) : (
        <>
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
          {invoiceError ? (
            <p className="mt-4 text-xs uppercase text-red-400">{invoiceError}</p>
          ) : null}

          <button
            type="button"
            disabled={pending || !check.ok}
            onClick={() => void requestInvoice()}
            className="mt-5 min-h-12 w-full bg-amber-500 px-5 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-black disabled:opacity-40"
          >
            {pending || waiting ? COPY.validating : COPY.zapSats}
          </button>
        </>
      )}

      {modal}
    </section>
  );
}
