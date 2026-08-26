"use client";

import { useCallback, useEffect, useState } from "react";
import { BOTTLE_PRICE_SATS, type BottlePull } from "@/lib/bottle";

export function BottleRack() {
  const [pulls, setPulls] = useState<BottlePull[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState("");
  const [paymentHash, setPaymentHash] = useState("");
  const [qrSrc, setQrSrc] = useState("");
  const [copied, setCopied] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [reveal, setReveal] = useState<string | null>(null);

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
    return () => window.clearInterval(id);
  }, [loadPulls]);

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
    if (!paymentHash) return;
    let cancelled = false;
    setWaiting(true);

    async function poll() {
      try {
        const response = await fetch(
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
          setWaiting(false);
          setReveal(data.pull.line);
          setPaymentHash("");
          setPaymentRequest("");
          setQrSrc("");
          void loadPulls();
          return;
        }
        if (!response.ok) {
          setError(data.error || "could not check payment. retrying…");
        }
      } catch {
        if (!cancelled) setError("could not check payment. retrying…");
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [paymentHash, loadPulls]);

  async function pullBottle() {
    setError(null);
    setReveal(null);
    setPending(true);
    try {
      const response = await fetch("/api/jukebox/bottle/invoice", {
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

  return (
    <section className="bottle-rack mt-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
            {"//"} bottle_rack
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight">
            Message in a bottle
          </h2>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          we don&apos;t HODL
        </p>
      </div>

      <div className="panel mt-4 p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-muted">
          {BOTTLE_PRICE_SATS} sats. A cork. A line from the hold. Sats in, sats
          out — we don&apos;t HODL.
        </p>

        {reveal ? (
          <div className="bottle-reveal mt-4" key={reveal}>
            <span className="bottle-cork" aria-hidden="true" />
            <p className="bottle-reveal-line">{reveal}</p>
          </div>
        ) : null}

        {paymentRequest ? (
          <div className="mt-4">
            {qrSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrSrc}
                alt="Lightning invoice QR"
                className="bottle-qr"
                width={256}
                height={256}
              />
            ) : (
              <div className="bottle-qr bottle-qr-wait">building qr</div>
            )}
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-sats">
              {waiting
                ? `waiting for ${BOTTLE_PRICE_SATS} sats`
                : `scan · ${BOTTLE_PRICE_SATS} sats`}
            </p>
            <p className="mt-2 max-h-16 overflow-auto break-all font-mono text-[11px] text-muted">
              {paymentRequest}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn px-4 py-2 text-xs"
                onClick={() => void copyInvoice()}
              >
                {copied ? "COPIED" : "COPY INVOICE"}
              </button>
              <a
                className="btn btn-ghost px-4 py-2 text-xs"
                href={`lightning:${paymentRequest}`}
              >
                OPEN WALLET
              </a>
              <button
                type="button"
                className="btn btn-ghost px-4 py-2 text-xs"
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
        ) : (
          <button
            type="button"
            className="btn btn-pulse mt-4 w-full px-5 py-3 sm:w-auto"
            disabled={pending}
            onClick={() => void pullBottle()}
          >
            {pending
              ? "BUILDING INVOICE…"
              : `PULL A BOTTLE · ${BOTTLE_PRICE_SATS} SATS`}
          </button>
        )}

        {error ? (
          <p className="mt-3 font-mono text-xs uppercase text-red-400">{error}</p>
        ) : null}
      </div>

      {pulls.length ? (
        <ol className="bottle-wash mt-4">
          {pulls.map((pull, index) => (
            <li
              key={pull.id}
              className="bottle-wash-item"
              style={{ ["--tilt" as string]: `${((index % 5) - 2) * 2.4}deg` }}
            >
              <span className="bottle-wash-neck" aria-hidden="true" />
              <p>{pull.line}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          no bottles on the sand yet
        </p>
      )}
    </section>
  );
}
