"use client";

import { useEffect, useState } from "react";
import { CallsignField } from "@/components/glass/CallsignField";
import { InvoiceBurst } from "@/components/pay/InvoiceBurst";
import { InvoiceQr } from "@/components/pay/InvoiceQr";
import { OneTapZap } from "@/components/pay/OneTapZap";
import { SettleRitual, useSettleHandoff } from "@/components/pay/SettleRitual";
import { useCheckNow } from "@/components/pay/useWebLn";
import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";
import { parseCallsignEtch } from "@/lib/callsign";
import { INVOICE_QR_OPTIONS } from "@/lib/invoice-qr";
import { payFetch } from "@/lib/pay-fetch";
import {
  SLAB_MAX_PIXELS,
  coatPrice,
  invoiceSats,
  slabPalette,
  type SlabCell,
  type SlabCoat,
  type SlabColor,
  type SlabPixel,
  type SlabStain,
  type SlabStroke,
} from "@/lib/slab";
import { useGlass } from "@/lib/useGlass";
import { verbPressProps } from "@/lib/verb-press";

type Step = "compose" | "invoice";

export function SlabDeck({
  coat,
  color,
  selected,
  onCoat,
  onColor,
  onPaid,
  onClear,
  onHow,
  howOpen,
}: {
  coat: SlabCoat;
  color: SlabColor;
  selected: SlabPixel[];
  onCoat: (coat: SlabCoat) => void;
  onColor: (color: SlabColor) => void;
  onPaid: (input: {
    stroke: SlabStroke;
    cells: SlabCell[];
    stains: SlabStain[];
    painted: SlabCell[];
    height: number;
  }) => void;
  onClear: () => void;
  onHow: () => void;
  howOpen: boolean;
}) {
  const { settling, beginSettle, finishSettle } = useSettleHandoff();
  const { bind: bindCheck, kick: kickCheck } = useCheckNow();
  const { glass, markEtched } = useGlass();
  const callsignOk = Boolean(glass?.callsign);
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

  const pixelCount = selected.length;
  const amountSats = invoiceSats(coat, pixelCount);
  const canPay = pixelCount > 0 && callsignOk && !pending;

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
          `/api/slab/check?hash=${encodeURIComponent(paymentHash)}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          paid?: boolean;
          stroke?: SlabStroke | null;
          cells?: SlabCell[];
          stains?: SlabStain[];
          painted?: SlabCell[];
          height?: number;
          etch?: unknown;
          error?: string;
        };
        if (cancelled) return;
        if (data.paid && data.stroke) {
          const stroke = data.stroke;
          const etch = parseCallsignEtch(data.etch);
          if (etch) markEtched(etch);
          setInvoiceError(null);
          setWaiting(false);
          beginSettle(() => {
            onPaid({
              stroke,
              cells: Array.isArray(data.cells) ? data.cells : [],
              stains: Array.isArray(data.stains) ? data.stains : [],
              painted: Array.isArray(data.painted) ? data.painted : [],
              height: Number(data.height) || 0,
            });
            reset();
          });
          return;
        }
        if (data.paid && !data.stroke) {
          setInvoiceError("payment landed, but the slab did not take the stroke");
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
  }, [
    beginSettle,
    bindCheck,
    expired,
    markEtched,
    onPaid,
    paymentHash,
    settling,
    step,
  ]);

  async function requestInvoice() {
    if (!pixelCount) {
      setError("select 1–21 pixels");
      return;
    }
    if (!glass?.callsign) {
      setError("SET CALLSIGN FIRST · 2–16 CHARS");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const response = await payFetch("/api/slab/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coat,
          color,
          callsign: glass.callsign,
          pixels: selected,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        payment_request?: string;
        payment_hash?: string;
        expires_at?: string | null;
        amount?: number;
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

  function backToCompose() {
    setPaymentHash("");
    setPaymentRequest("");
    setQrSrc("");
    setWaiting(false);
    setExpired(false);
    setInvoiceError(null);
    setStep("compose");
  }

  function reset() {
    onClear();
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
    expired || Boolean(invoiceError && !invoiceError.includes("retrying"));

  return (
    <section className="slab-deck-form">
      {step === "compose" ? (
        <>
          <div className="slab-hotbar-row">
            <div className="slab-coats">
              <button
                type="button"
                className={cn(coat === "swell" && "is-on")}
                aria-pressed={coat === "swell"}
                onClick={() => onCoat("swell")}
              >
                SWELL
              </button>
              <button
                type="button"
                className={cn(coat === "reef" && "is-on")}
                aria-pressed={coat === "reef"}
                onClick={() => onCoat("reef")}
              >
                REEF
              </button>
            </div>
            <div className="slab-palette">
              {slabPalette.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onColor(item.id)}
                  className={cn(color === item.id && "is-on")}
                  style={{ background: item.hex }}
                  aria-label={item.label}
                />
              ))}
            </div>
            <CallsignField
              className="slab-callsign"
              label="CALLSIGN"
              disabled={pending}
            />
            <p className="slab-hud">
              {pixelCount} px · {amountSats} sats
            </p>
            <button
              type="button"
              className="slab-clear"
              onClick={onClear}
              disabled={!pixelCount}
            >
              clear
            </button>
            <button
              type="button"
              className="slab-zap"
              disabled={!canPay}
              onClick={() => void requestInvoice()}
            >
              {pending ? COPY.validating : COPY.zapSats}
            </button>
            <button
              type="button"
              className={cn("slab-how-btn", howOpen && "is-on")}
              aria-pressed={howOpen}
              onClick={onHow}
            >
              HOW
            </button>
          </div>
          <p className="slab-coat-meta">
            {coatPrice(coat)} sats per block · {SLAB_MAX_PIXELS} stroke cap
            {error ? ` · ${error}` : ""}
          </p>
        </>
      ) : null}

      {step === "invoice" ? (
        <div className="slab-invoice">
          {settling ? (
            <SettleRitual machine="slab" onComplete={finishSettle} />
          ) : (
            <>
              <p className="slab-kicker">
                invoice · {amountSats} sats · {expired ? "expired" : "unpaid"}
              </p>
              <InvoiceBurst
                paymentHash={paymentHash}
                enabled={!expired && Boolean(paymentRequest)}
                onPaid={kickCheck}
                status={
                  expired ? null : (
                    <p>
                      {waiting ? COPY.validating : "scan or copy"}
                      {remainLabel ? ` · ${remainLabel}` : ""}
                    </p>
                  )
                }
              >
                <InvoiceQr
                  compact
                  src={qrSrc}
                  invoice={paymentRequest}
                  copied={copied}
                  expired={expired}
                  onCopy={() => void copyInvoice()}
                />
              </InvoiceBurst>
              {expired ? (
                <p className="slab-error">
                  invoice expired. generate a new one to pay.
                </p>
              ) : null}
              {invoiceError ? <p className="slab-error">{invoiceError}</p> : null}
              <div className="slab-invoice-actions">
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
                  >
                    {pending ? COPY.validating : "new invoice"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void copyInvoice()}
                    {...verbPressProps}
                  >
                    {COPY.copyInvoice}
                  </button>
                )}
                {!expired && paymentRequest ? (
                  <>
                    <OneTapZap
                      invoice={paymentRequest}
                      disabled={pending}
                      onPaid={kickCheck}
                      hideWhenUnavailable={false}
                    />
                    <a href={`lightning:${paymentRequest}`} {...verbPressProps}>
                      {COPY.openWallet}
                    </a>
                  </>
                ) : (
                  <button type="button" onClick={backToCompose}>
                    edit stroke
                  </button>
                )}
              </div>
              {!expired ? (
                <button
                  type="button"
                  className="slab-invoice-edit"
                  onClick={backToCompose}
                >
                  edit stroke
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
