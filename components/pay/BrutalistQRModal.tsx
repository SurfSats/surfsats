"use client";

import { Check, Copy, X, Zap } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { BrutalistButton } from "@/components/ui/BrutalistButton";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { useSurfSatsWebLN } from "@/components/pay/useSurfSatsWebLN";
import { useNWC } from "@/hooks/useNWC";
import { INVOICE_QR_OPTIONS } from "@/lib/invoice-qr";

type BrutalistQRModalProps = {
  isOpen: boolean;
  onClose: () => void;
  bolt11Invoice: string;
  amountSats?: number;
  onPreimageConfirmed?: (preimage: string) => void;
};

export function BrutalistQRModal({
  isOpen,
  onClose,
  bolt11Invoice,
  amountSats = 21,
  onPreimageConfirmed,
}: BrutalistQRModalProps) {
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(false);
  const [qr, setQr] = useState<{ invoice: string; src: string } | null>(null);
  const [zapping, setZapping] = useState(false);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const { isConnected, isConnecting, connectWallet, send21SatZap, error } =
    useSurfSatsWebLN();
  const nwc = useNWC();
  const [nwcDraft, setNwcDraft] = useState("");
  const [nwcError, setNwcError] = useState<string | null>(null);
  const [nwcOpen, setNwcOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !bolt11Invoice) return;
    let cancelled = false;
    void import("qrcode").then(async (QRCode) => {
      const src = await QRCode.toDataURL(bolt11Invoice, {
        ...INVOICE_QR_OPTIONS,
        width: 192,
      });
      if (!cancelled) setQr({ invoice: bolt11Invoice, src });
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, bolt11Invoice]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isClient || !isOpen) return null;
  const qrSrc = qr?.invoice === bolt11Invoice ? qr.src : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bolt11Invoice);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function settle(preimage: string) {
    setFlash(true);
    onPreimageConfirmed?.(preimage);
    window.setTimeout(() => {
      setFlash(false);
      setZapping(false);
      onClose();
    }, 400);
  }

  async function handleZap() {
    setZapping(true);
    try {
      if (nwc.isConnected) {
        const paid = await nwc.payInvoice(bolt11Invoice);
        await settle(paid.preimage);
        return;
      }
      if (!isConnected) {
        setZapping(false);
        await connectWallet();
        return;
      }
      await send21SatZap(bolt11Invoice, (preimage) => {
        void settle(preimage);
      });
    } catch {
      setZapping(false);
      setFlash(false);
    }
  }

  function handleNwcPair() {
    setNwcError(null);
    try {
      nwc.connect(nwcDraft);
      setNwcDraft("");
      setNwcOpen(false);
    } catch (err) {
      setNwcError(err instanceof Error ? err.message : "NWC_PAIR_FAILED");
    }
  }

  const preview = bolt11Invoice.slice(0, 36);
  const zapLabel = nwc.isConnected
    ? `NWC ${amountSats} SAT DROP`
    : isConnected
      ? `ONE-TAP ${amountSats} SAT DROP`
      : isConnecting
        ? "CONNECTING…"
        : "CONNECT WALLET";

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-void/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="brutalist-invoice-title"
      onClick={onClose}
    >
      {flash ? (
        <div className="pointer-events-none absolute inset-0 z-[10001] bg-salt opacity-100 transition-opacity duration-75" />
      ) : null}

      <div
        className="w-full max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <TerminalCard
          title="LIGHTNING_INVOICE"
          tag="L402_CHANNEL"
          status="live"
          className="w-full border-violet shadow-[0_0_25px_rgba(124,58,237,0.2)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <span
              id="brutalist-invoice-title"
              className="font-mono text-[10px] tracking-telemetry text-amber uppercase"
            >
              Awaiting Preimage Verification · {amountSats} SATS
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-raw hover:text-salt"
              aria-label="Close invoice"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative my-2 flex flex-col items-center justify-center border border-zinc-raw bg-void p-6">
            <span className="absolute -top-[6px] -left-[6px] select-none font-mono text-xs text-violet">
              +
            </span>
            <span className="absolute -top-[6px] -right-[6px] select-none font-mono text-xs text-violet">
              +
            </span>
            <span className="absolute -bottom-[6px] -left-[6px] select-none font-mono text-xs text-violet">
              +
            </span>
            <span className="absolute -bottom-[6px] -right-[6px] select-none font-mono text-xs text-violet">
              +
            </span>

            <div className="flex h-48 w-48 flex-col items-center justify-center border border-dashed border-zinc-raw bg-white p-2 text-center">
              {qrSrc ? (
                // data: URL from the live BOLT11 — next/image cannot optimize it
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrSrc}
                  alt="Lightning invoice QR"
                  width={192}
                  height={192}
                  className="h-full w-full bg-white"
                />
              ) : (
                <>
                  <Zap className="mb-2 h-10 w-10 animate-bounce text-amber" />
                  <p className="break-all px-2 font-mono text-[10px] text-void/70">
                    {preview}
                    {bolt11Invoice.length > 36 ? "..." : ""}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <input
              type="text"
              readOnly
              value={bolt11Invoice}
              className="w-full border border-zinc-raw bg-void px-3 py-2 font-mono text-xs text-salt focus:border-violet focus:outline-none"
            />
            <BrutalistButton
              onClick={() => {
                void handleCopy();
              }}
              size="sm"
              variant="secondary"
              aria-label={copied ? "Invoice copied" : "Copy invoice"}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-terminal-green" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-salt" />
              )}
            </BrutalistButton>
          </div>

          {error ? (
            <p className="mt-2 font-mono text-[10px] tracking-telemetry text-amber uppercase">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex gap-2 border-t border-zinc-raw pt-3">
            <BrutalistButton
              className="flex w-full items-center justify-center gap-2"
              onClick={() => {
                void handleZap();
              }}
              size="md"
              variant="amber"
              disabled={zapping || isConnecting || !bolt11Invoice}
            >
              <Zap className="h-4 w-4 fill-void" />
              {zapLabel}
            </BrutalistButton>
          </div>

          <div className="mt-3 border-t border-zinc-raw pt-3">
            {nwc.isConnected ? (
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] tracking-telemetry text-terminal-green uppercase">
                  NWC_PAIRED
                </p>
                <BrutalistButton
                  size="sm"
                  variant="ghost"
                  onClick={() => nwc.disconnect()}
                >
                  DISCONNECT
                </BrutalistButton>
              </div>
            ) : (
              <>
                <BrutalistButton
                  size="sm"
                  variant="secondary"
                  onClick={() => setNwcOpen((open) => !open)}
                >
                  {nwcOpen ? "HIDE_NWC" : "PAIR_NWC"}
                </BrutalistButton>
                {nwcOpen ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <input
                      value={nwcDraft}
                      onChange={(event) => setNwcDraft(event.target.value)}
                      placeholder="nostr+walletconnect://..."
                      className="w-full border border-zinc-raw bg-void px-3 py-2 font-mono text-[10px] text-salt focus:border-violet focus:outline-none"
                    />
                    <BrutalistButton
                      size="sm"
                      variant="primary"
                      onClick={handleNwcPair}
                    >
                      SAVE_PAIRING
                    </BrutalistButton>
                    {nwcError ? (
                      <p className="font-mono text-[10px] tracking-telemetry text-amber uppercase">
                        {nwcError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </TerminalCard>
      </div>
    </div>,
    document.body,
  );
}
