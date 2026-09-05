"use client";

import { InvoiceBurst } from "@/components/pay/InvoiceBurst";
import { InvoiceHint } from "@/components/pay/InvoiceHint";
import { InvoiceQr } from "@/components/pay/InvoiceQr";
import { OneTapZap } from "@/components/pay/OneTapZap";
import { SettleRitual } from "@/components/pay/SettleRitual";
import { ARCADE_CREDITS_PER_PAY, ARCADE_PRICE_SATS } from "@/lib/arcade";
import { COPY } from "@/lib/copy";

export function ArcadeInvoice({
  qrSrc,
  paymentHash = "",
  paymentRequest,
  waiting,
  pending,
  expired,
  remainLabel,
  copied,
  invoiceError,
  memo = `${ARCADE_CREDITS_PER_PAY} credits · WAVE RUNNER · SurfSats Arcade`,
  titleId = "arcade-pay-title",
  settling = false,
  onSettled,
  onCopy,
  onRetry,
  onCancel,
  onZapPaid,
}: {
  qrSrc: string;
  paymentHash?: string;
  paymentRequest: string;
  waiting: boolean;
  pending: boolean;
  expired: boolean;
  remainLabel: string;
  copied: boolean;
  invoiceError: string | null;
  memo?: string;
  titleId?: string;
  settling?: boolean;
  onSettled?: () => void;
  onCopy: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onZapPaid?: () => void;
}) {
  const live =
    Boolean(paymentRequest) && paymentRequest.toLowerCase().startsWith("ln");

  return (
    <div className="arcade-pay" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        className="arcade-pay-scrim"
        onClick={settling ? undefined : onCancel}
        aria-label="Close invoice"
      />
      <div className="arcade-pay-panel">
        {settling && onSettled ? (
          <SettleRitual subtitle={memo} titleId={titleId} onComplete={onSettled} />
        ) : (
          <>
        <h2 id={titleId} className="arcade-pay-title">
          INSERT {ARCADE_PRICE_SATS} SATS
        </h2>

        {live && !expired ? (
          <OneTapZap
            invoice={paymentRequest}
            disabled={pending}
            onPaid={() => onZapPaid?.()}
            tone="arcade"
          />
        ) : null}

        <InvoiceBurst
          paymentHash={paymentHash}
          enabled={live && !expired && !settling}
          onPaid={() => onZapPaid?.()}
          status={
            <p className="arcade-pay-status">
              {expired
                ? "invoice expired · generate a new one"
                : waiting
                  ? COPY.validating
                  : pending
                    ? COPY.loadingPeer
                    : "scan the qr or copy the invoice"}
            </p>
          }
        >
          <InvoiceQr
            src={qrSrc}
            invoice={paymentRequest}
            copied={copied}
            expired={expired}
            onCopy={onCopy}
          />
        </InvoiceBurst>

        <div className="arcade-pay-actions">
          {expired || (!live && !pending) ? (
            <button type="button" className="arcade-pay-btn" onClick={onRetry} disabled={pending}>
              {pending ? COPY.validating : "NEW INVOICE"}
            </button>
          ) : (
            <>
              {live ? (
                <a className="arcade-pay-btn arcade-pay-link" href={`lightning:${paymentRequest}`}>
                  {COPY.zapSats}
                </a>
              ) : null}
              <button
                type="button"
                className="arcade-pay-btn"
                onClick={onCopy}
                disabled={!live}
              >
                {copied ? "COPIED" : "COPY INVOICE"}
              </button>
            </>
          )}
          <button type="button" className="arcade-pay-btn arcade-pay-ghost" onClick={onCancel}>
            BACK
          </button>
        </div>

        <p className="arcade-pay-kicker">lightning invoice</p>
        <InvoiceHint />
        <p className="arcade-pay-memo">{memo}</p>
        {remainLabel && !expired ? (
          <p className="arcade-pay-remain">{remainLabel}</p>
        ) : null}

        {live ? (
          <p className="arcade-pay-bolt">{paymentRequest}</p>
        ) : null}

        {invoiceError ? <p className="arcade-pay-error">{invoiceError}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
