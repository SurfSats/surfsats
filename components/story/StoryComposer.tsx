"use client";

import { useEffect, useState } from "react";
import { SettleRitual, useSettleHandoff } from "@/components/pay/SettleRitual";
import {
  STORY_ALIAS_MAX,
  STORY_MAX_CHARS,
  STORY_PRICE_SATS,
  sanitizeStoryAlias,
  sanitizeStoryLine,
  type StoryLine,
} from "@/lib/story";

type Step = "compose" | "invoice" | "done";

export function StoryComposer({
  onPaid,
}: {
  onPaid: (line: StoryLine) => void;
}) {
  const { settling, beginSettle, finishSettle } = useSettleHandoff();
  const [text, setText] = useState("");
  const [alias, setAlias] = useState("");
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

  const lineCheck = sanitizeStoryLine(text);
  const aliasCheck = sanitizeStoryAlias(alias);
  const canPay = lineCheck.ok && aliasCheck.ok && !pending;
  const used = text.length;

  useEffect(() => {
    if (!paymentRequest) {
      setQrSrc("");
      return;
    }
    let cancelled = false;
    void import("qrcode").then(async (QRCode) => {
      const src = await QRCode.toDataURL(paymentRequest, {
        width: 320,
        margin: 2,
        color: { dark: "#1a1208", light: "#f3e6c4" },
        errorCorrectionLevel: "M",
      });
      if (!cancelled) setQrSrc(src);
    });
    return () => {
      cancelled = true;
    };
  }, [paymentRequest]);

  useEffect(() => {
    if (step !== "invoice") return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !settling) cancelPay();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(id);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [settling, step]);

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
        const response = await fetch(
          `/api/story/check?hash=${encodeURIComponent(paymentHash)}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          paid?: boolean;
          line?: StoryLine | null;
          error?: string;
        };
        if (cancelled) return;
        if (data.paid && data.line) {
          const line = data.line;
          setInvoiceError(null);
          setWaiting(false);
          beginSettle(() => {
            onPaid(line);
            setStep("done");
          });
          return;
        }
        if (data.paid && !data.line) {
          setInvoiceError("payment landed, but the line was not bound");
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

    void poll();
    const id = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [beginSettle, expired, onPaid, paymentHash, settling, step]);

  async function requestInvoice() {
    const nextLine = sanitizeStoryLine(text);
    const nextAlias = sanitizeStoryAlias(alias);
    if (!nextLine.ok) {
      setError(nextLine.reason);
      return;
    }
    if (!nextAlias.ok) {
      setError(nextAlias.reason);
      return;
    }
    setError(null);
    setPending(true);
    setPaymentHash("");
    setPaymentRequest("");
    setQrSrc("");
    setExpired(false);
    setInvoiceError(null);
    setStep("invoice");
    try {
      const response = await fetch("/api/story/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: nextLine.text,
          alias: nextAlias.alias,
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
        setStep("compose");
        return;
      }
      setPaymentRequest(data.payment_request);
      setPaymentHash(data.payment_hash);
      setExpiresAt(
        data.expires_at ||
          new Date(Date.now() + 50 * 60 * 1000).toISOString(),
      );
      setCopied(false);
    } catch {
      setError("could not create invoice. try again");
      setStep("compose");
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
    setInvoiceError(null);
    setExpiresAt(null);
    setExpired(false);
  }

  function cancelPay() {
    setStep("compose");
    setPaymentHash("");
    setPaymentRequest("");
    setQrSrc("");
    setWaiting(false);
    setExpired(false);
    setInvoiceError(null);
    setPending(false);
  }

  const remainMs = expiresAt ? new Date(expiresAt).getTime() - nowTick : 0;
  const remainLabel = formatRemain(remainMs);
  const live =
    Boolean(paymentRequest) && paymentRequest.toLowerCase().startsWith("ln");

  return (
    <section className="story-compose">
      <p className="story-compose-kicker">add a line · {STORY_PRICE_SATS} sats</p>
      <h2 className="story-compose-title">Inscribe</h2>

      {step === "compose" || step === "done" ? (
        <>
          <label className="story-field">
            <span className="story-field-row">
              <span>the next sentence</span>
              <em>
                {used}/{STORY_MAX_CHARS}
              </em>
            </span>
            <textarea
              value={text}
              maxLength={STORY_MAX_CHARS}
              rows={3}
              onChange={(event) => setText(event.target.value)}
              placeholder="Write what happens next…"
            />
          </label>
          <label className="story-field">
            <span>callsign · optional</span>
            <input
              value={alias}
              maxLength={STORY_ALIAS_MAX}
              onChange={(event) => setAlias(event.target.value)}
              placeholder="anon"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {error ? <p className="story-error">{error}</p> : null}
          {step === "done" ? (
            <p className="story-done">Your line is in the book.</p>
          ) : null}
          <button
            type="button"
            className="story-pay-btn"
            disabled={!canPay}
            onClick={() => void requestInvoice()}
          >
            {pending ? "Preparing the seal…" : `Inscribe · ${STORY_PRICE_SATS} sats`}
          </button>
        </>
      ) : null}

      {step === "invoice" ? (
        <div className="story-pay" role="dialog" aria-modal="true" aria-labelledby="story-pay-title">
          <button
            type="button"
            className="story-pay-scrim"
            onClick={settling ? undefined : cancelPay}
            aria-label="Close invoice"
          />
          <div className="story-pay-panel">
            {settling ? (
              <SettleRitual
                subtitle={`one sentence · ${STORY_PRICE_SATS} sats`}
                onComplete={finishSettle}
              />
            ) : (
            <>
            <p className="story-pay-kicker">lightning seal</p>
            <h3 id="story-pay-title" className="story-pay-title">
              Inscribe · {STORY_PRICE_SATS} sats
            </h3>
            <p className="story-pay-memo">One sentence bound into the chain</p>
            {qrSrc && live && !expired ? (
              // data: URL from the live BOLT11
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrSrc}
                alt="Lightning invoice QR"
                className="story-pay-qr"
                width={320}
                height={320}
              />
            ) : (
              <div className="story-pay-qr story-pay-qr-wait">
                {expired ? "seal expired" : "drawing the seal…"}
              </div>
            )}
            <p className="story-pay-status">
              {expired
                ? "invoice expired · generate a new one"
                : waiting
                  ? `waiting for ${STORY_PRICE_SATS} sats`
                  : pending
                    ? "preparing invoice…"
                    : "scan the qr or copy the invoice"}
            </p>
            {remainLabel && !expired ? (
              <p className="story-pay-remain">{remainLabel}</p>
            ) : null}
            {live ? <p className="story-pay-bolt">{paymentRequest}</p> : null}
            {invoiceError ? <p className="story-error">{invoiceError}</p> : null}
            <div className="story-pay-actions">
              {expired ? (
                <button
                  type="button"
                  className="story-pay-btn"
                  onClick={() => void requestInvoice()}
                  disabled={pending}
                >
                  {pending ? "Preparing…" : "New invoice"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="story-pay-btn"
                    onClick={() => void copyInvoice()}
                    disabled={!live}
                  >
                    {copied ? "Copied" : "Copy invoice"}
                  </button>
                  {live ? (
                    <a
                      className="story-pay-btn story-pay-link"
                      href={`lightning:${paymentRequest}`}
                    >
                      Open wallet
                    </a>
                  ) : null}
                </>
              )}
              <button
                type="button"
                className="story-pay-btn story-pay-ghost"
                onClick={cancelPay}
              >
                Back
              </button>
            </div>
            </>
            )}
          </div>
        </div>
      ) : null}

      {step === "done" ? (
        <button type="button" className="story-again" onClick={reset}>
          another line →
        </button>
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
