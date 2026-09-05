"use client";

import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";

export function InvoiceQr({
  src,
  invoice,
  copied = false,
  expired = false,
  waitLabel,
  className,
  onCopy,
}: {
  src: string;
  invoice: string;
  copied?: boolean;
  expired?: boolean;
  waitLabel?: string;
  className?: string;
  onCopy: () => void;
}) {
  const ready = Boolean(src) && Boolean(invoice) && !expired;
  const well = (
    <span className="invoice-qr-well bg-white p-5">
      {ready ? (
        // data: URL from the live BOLT11 — next/image cannot optimize it
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Lightning invoice QR"
          width={280}
          height={280}
          className="invoice-qr-img"
        />
      ) : (
        <span className="invoice-qr-wait">
          {expired ? "invoice expired" : waitLabel ?? COPY.loadingPeer}
        </span>
      )}
    </span>
  );

  if (!ready) {
    return <div className={cn("invoice-qr", className)}>{well}</div>;
  }

  return (
    <button
      type="button"
      className={cn("invoice-qr invoice-qr-hit", className)}
      onClick={onCopy}
      aria-label={COPY.tapQr}
    >
      {well}
      <span className="invoice-qr-tap">
        {copied ? COPY.qrCopied : COPY.tapQr}
      </span>
    </button>
  );
}
