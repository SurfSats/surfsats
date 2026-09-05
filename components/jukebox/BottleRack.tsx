"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { InvoiceBurst } from "@/components/pay/InvoiceBurst";
import { InvoiceQr } from "@/components/pay/InvoiceQr";
import { OneTapZap } from "@/components/pay/OneTapZap";
import { payFetch } from "@/lib/pay-fetch";
import { useCheckNow } from "@/components/pay/useWebLn";
import { BOTTLE_PRICE_SATS, type BottlePull } from "@/lib/bottle";
import { COPY } from "@/lib/copy";
import { INVOICE_QR_OPTIONS } from "@/lib/invoice-qr";

const BOTTLE_EVENT = "surfsats-bottle-pull";
const CRACK_MS = 400;

type Face = "idle" | "crack" | "message";

export function BottleStage() {
  const { bind: bindCheck, kick: kickCheck } = useCheckNow();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState("");
  const [paymentHash, setPaymentHash] = useState("");
  const [qrSrc, setQrSrc] = useState("");
  const [copied, setCopied] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [reveal, setReveal] = useState<string | null>(null);
  const [face, setFace] = useState<Face>("idle");

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
    if (!paymentHash) return;
    let cancelled = false;
    setWaiting(true);

    async function poll() {
      try {
        const response = await payFetch(
          `/api/jukebox/bottle/check?hash=${encodeURIComponent(paymentHash)}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          paid?: boolean;
          pull?: BottlePull | null;
          error?: string;
        };
        if (cancelled) return;
        if (data.paid && data.pull) {
          const line = data.pull.line;
          setWaiting(false);
          setPaymentHash("");
          setPaymentRequest("");
          setQrSrc("");
          setFace("crack");
          window.setTimeout(() => {
            setReveal(line);
            setFace("message");
          }, CRACK_MS);
          window.dispatchEvent(new Event(BOTTLE_EVENT));
          return;
        }
        if (!response.ok) {
          setError(data.error || "could not check payment. retrying…");
        }
      } catch {
        if (!cancelled) setError("could not check payment. retrying…");
      }
    }

    bindCheck(poll);
    void poll();
    const id = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [bindCheck, paymentHash]);

  async function pullBottle() {
    if (pending || paymentHash) return;
    setError(null);
    setReveal(null);
    setFace("idle");
    setPending(true);
    try {
      const response = await payFetch("/api/jukebox/bottle/invoice", {
        method: "POST",
      });
      const data = (await response.json()) as {
        error?: string;
        payment_request?: string;
        payment_hash?: string;
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
      setCopied(false);
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

  const src =
    face === "crack"
      ? "/bottle-crack.png"
      : face === "message"
        ? "/bottle-message.png"
        : "/bottle-idle.png";
  const paying = Boolean(paymentRequest);

  return (
    <div className={face === "message" ? "bottle-stage is-message" : "bottle-stage"}>
      <button
        type="button"
        className={face === "message" ? "bottle-hit is-message" : "bottle-hit"}
        disabled={pending || paying || face === "crack"}
        onClick={() => void pullBottle()}
        aria-label={`Pull a bottle, ${BOTTLE_PRICE_SATS} sats`}
      >
        <span className="bottle-cutout">
          <Image
            src={src}
            alt=""
            width={face === "message" ? 1168 : 640}
            height={face === "message" ? 784 : 860}
            unoptimized
            className="bottle-cutout-img"
            sizes={
              face === "message"
                ? "(max-width: 640px) 92vw, 26rem"
                : "(max-width: 640px) 11rem, 15rem"
            }
            priority
          />
        </span>
        {face === "message" && reveal ? (
          <span
            className={
              reveal.length > 72 ? "bottle-parchment is-long" : "bottle-parchment"
            }
          >
            {reveal}
          </span>
        ) : null}
      </button>
      <div className="hidden" aria-hidden="true">
        <Image src="/bottle-crack.png" alt="" width={640} height={860} unoptimized />
        <Image src="/bottle-message.png" alt="" width={1168} height={784} unoptimized />
      </div>
      <p className="bottle-caption">
        {pending
          ? COPY.validating
          : paying
            ? `SCAN · ${BOTTLE_PRICE_SATS} SATS`
            : `PULL A BOTTLE · ${BOTTLE_PRICE_SATS} SATS`}
      </p>
      <p className="bottle-hodl">we don&apos;t HODL</p>

      {paying ? (
        <div className="bottle-pay">
          {paymentRequest ? (
            <OneTapZap
              invoice={paymentRequest}
              disabled={pending}
              onPaid={kickCheck}
              tone="bottle"
            />
          ) : null}
          <InvoiceBurst
            paymentHash={paymentHash}
            enabled={Boolean(paymentRequest)}
            onPaid={kickCheck}
            status={
              <p className="bottle-pay-status">
                {waiting
                  ? COPY.validating
                  : `scan · ${BOTTLE_PRICE_SATS} sats`}
              </p>
            }
          >
            <InvoiceQr
              src={qrSrc}
              invoice={paymentRequest}
              copied={copied}
              onCopy={() => void copyInvoice()}
            />
          </InvoiceBurst>
          <div className="bottle-pay-actions">
            <button type="button" onClick={() => void copyInvoice()}>
              {copied ? "COPIED" : "COPY INVOICE"}
            </button>
            <a href={`lightning:${paymentRequest}`}>{COPY.zapSats}</a>
            <button
              type="button"
              onClick={() => {
                setPaymentHash("");
                setPaymentRequest("");
                setQrSrc("");
                setWaiting(false);
              }}
            >
              BACK
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="bottle-error">{error}</p> : null}
    </div>
  );
}

export function BottleWash() {
  const [pulls, setPulls] = useState<BottlePull[]>([]);

  const loadPulls = useCallback(async () => {
    try {
      const response = await fetch("/api/jukebox/bottle", { cache: "no-store" });
      const data = (await response.json()) as { pulls?: BottlePull[] };
      if (Array.isArray(data.pulls)) setPulls(data.pulls);
    } catch {
      // keep last list
    }
  }, []);

  useEffect(() => {
    void loadPulls();
    const id = window.setInterval(() => void loadPulls(), 12_000);
    function onPull() {
      void loadPulls();
    }
    window.addEventListener(BOTTLE_EVENT, onPull);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(BOTTLE_EVENT, onPull);
    };
  }, [loadPulls]);

  if (!pulls.length) return null;

  return (
    <section className="bottle-wash-wrap mt-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
        {"//"} washed_up
      </p>
      <ol className="bottle-wash mt-3">
        {pulls.map((pull, index) => (
          <li
            key={pull.id}
            className="bottle-wash-item"
            style={{ ["--tilt" as string]: `${((index % 5) - 2) * 1.6}deg` }}
          >
            <span className="bottle-wash-neck" aria-hidden="true" />
            <p>{pull.line}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
