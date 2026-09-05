"use client";

import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";

export function InvoiceQr({
  src,
  invoice,
  copied = false,
  expired = false,
  waitLabel,
  compact = false,
  className,
  onCopy,
}: {
  src: string;
  invoice: string;
  copied?: boolean;
  expired?: boolean;
  waitLabel?: string;
  compact?: boolean;
  className?: string;
  onCopy: () => void;
}) {
  const ready = Boolean(src) && Boolean(invoice) && !expired;
  const px = compact ? 180 : 280;
  const well = (
    <span className={cn("invoice-qr-well bg-white", compact ? "p-1.5" : "p-5")}>
      {ready ? (
        // data: URL from the live BOLT11 — next/image cannot optimize it
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Lightning invoice QR"
          width={px}
          height={px}
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
    return (
      <div className={cn("invoice-qr", compact && "invoice-qr--compact", className)}>
        {well}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "invoice-qr invoice-qr-hit",
        compact && "invoice-qr--compact",
        className,
      )}
      onClick={onCopy}
      aria-label={compact ? "Lightning invoice QR" : COPY.tapQr}
    >
      {well}
      {compact ? null : (
        <span className="invoice-qr-tap">
          {copied ? COPY.qrCopied : COPY.tapQr}
        </span>
      )}
    </button>
  );
}
