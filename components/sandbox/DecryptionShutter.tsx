"use client";

import { Key, Lock, ShieldAlert, Unlock, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrutalistQRModal } from "@/components/pay/BrutalistQRModal";
import { useLightningLive } from "@/components/pay/useLightningLive";
import { useSurfSatsWebLN } from "@/components/pay/useSurfSatsWebLN";
import { BrutalistButton } from "@/components/ui/BrutalistButton";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { payFetch } from "@/lib/pay-fetch";
import {
  SANDBOX_DEFAULT_DOCUMENT_ID,
  SANDBOX_PRICE_SATS,
  SANDBOX_UNLOCKED_CONTENT,
  hexNoiseBlock,
  parseSandboxDocumentId,
  paywallStorageKey,
} from "@/lib/sandbox";
import { playMechanicalLatch } from "@/lib/sound";

type DecryptionShutterProps = {
  documentId?: string;
  priceSats?: number;
  unlockedContent?: string;
  className?: string;
};

type InvoiceState = {
  bolt11: string;
  hash: string;
};

export function DecryptionShutter({
  documentId = SANDBOX_DEFAULT_DOCUMENT_ID,
  priceSats = SANDBOX_PRICE_SATS,
  unlockedContent = SANDBOX_UNLOCKED_CONTENT,
  className,
}: DecryptionShutterProps) {
  const docId =
    parseSandboxDocumentId(documentId) ?? SANDBOX_DEFAULT_DOCUMENT_ID;
  const { isConnected, send21SatZap } = useSurfSatsWebLN();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [noise, setNoise] = useState<string[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const unlockedRef = useRef(false);

  const settle = useCallback(
    (preimage?: string) => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      setFlash(true);
      playMechanicalLatch();
      try {
        window.sessionStorage.setItem(paywallStorageKey(docId), preimage || "1");
      } catch {
        // ignore quota / private mode
      }
      window.setTimeout(() => setFlash(false), 80);
      window.setTimeout(() => {
        setIsUnlocked(true);
        setIsDecrypting(false);
        setModalOpen(false);
      }, 200);
    },
    [docId],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (window.sessionStorage.getItem(paywallStorageKey(docId))) {
          unlockedRef.current = true;
          setIsUnlocked(true);
        }
      } catch {
        // ignore
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [docId]);

  useEffect(() => {
    if (isUnlocked) return;
    const reduce =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function paint() {
      setNoise(hexNoiseBlock({ lines: 8, width: 48 }));
    }
    paint();
    if (reduce) return;
    const interval = window.setInterval(paint, 120);
    return () => window.clearInterval(interval);
  }, [isUnlocked]);

  useLightningLive({
    paymentHash: invoice?.hash ?? "",
    enabled: Boolean(invoice?.hash) && !isUnlocked,
    onEvent: (event) => {
      settle(event.preimage);
    },
  });

  useEffect(() => {
    const hash = invoice?.hash;
    if (!hash || isUnlocked) return;
    const id = window.setInterval(() => {
      void payFetch(`/api/sandbox/check?hash=${encodeURIComponent(hash)}`)
        .then((response) => response.json())
        .then((body: unknown) => {
          if (
            body &&
            typeof body === "object" &&
            "paid" in body &&
            body.paid === true
          ) {
            const preimage =
              "preimage" in body && typeof body.preimage === "string"
                ? body.preimage
                : "";
            settle(preimage);
          }
        })
        .catch(() => {
          // keep shutter locked
        });
    }, 2000);
    return () => window.clearInterval(id);
  }, [invoice?.hash, isUnlocked, settle]);

  async function handleUnlock() {
    setError(null);
    setIsDecrypting(true);
    try {
      const response = await payFetch("/api/sandbox/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId }),
      });
      const body: unknown = await response.json();
      if (!response.ok || !body || typeof body !== "object") {
        const message =
          body && typeof body === "object" && "error" in body
            ? String(body.error)
            : "could not mint invoice";
        throw new Error(message);
      }
      const bolt11 =
        "payment_request" in body ? String(body.payment_request ?? "") : "";
      const hash =
        "payment_hash" in body ? String(body.payment_hash ?? "") : "";
      if (!bolt11.toLowerCase().startsWith("ln") || !hash) {
        throw new Error("could not mint invoice");
      }
      setInvoice({ bolt11, hash });
      setModalOpen(true);
      if (isConnected) {
        try {
          await send21SatZap(bolt11, (preimage) => {
            settle(preimage);
          });
        } catch {
          // QR remains for any other Lightning wallet
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "could not mint invoice",
      );
      setIsDecrypting(false);
    }
  }

  return (
    <>
      <TerminalCard
        className={className}
        status={isUnlocked ? "live" : "warning"}
        tag={`${priceSats}_SATS`}
        title={`CLASSIFIED_PAYWALL // ${docId}`}
      >
        <div className="relative min-h-[220px] overflow-hidden border border-zinc-raw bg-void p-4 font-mono">
          {flash ? (
            <div className="pointer-events-none absolute inset-0 z-30 bg-salt opacity-90" />
          ) : null}

          {isUnlocked ? (
            <div className="space-y-3 text-salt">
              <div className="flex items-center justify-between border-b border-terminal-green/40 pb-2">
                <div className="flex items-center gap-2 text-xs text-terminal-green">
                  <Unlock className="h-4 w-4" />
                  <span>CRYPTOGRAPHICALLY_VERIFIED // PREIMAGE_MATCHED</span>
                </div>
                <span className="text-[10px] text-zinc-raw">L402_AUTH_OK</span>
              </div>
              <pre className="font-mono text-xs leading-relaxed tracking-telemetry whitespace-pre-line text-salt">
                {unlockedContent}
              </pre>
              <p className="flex items-center gap-2 text-[10px] tracking-telemetry text-zinc-raw">
                <Key className="h-3 w-3 text-violet" />
                {docId}
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between border-b border-zinc-raw pb-2">
                <div className="flex items-center gap-2 text-xs text-amber">
                  <Lock className="h-4 w-4" />
                  <span>SHUTTER_LOCKED // AES_CHACHA_SHROUD</span>
                </div>
                <span className="text-[10px] font-bold tracking-telemetry text-zinc-raw uppercase">
                  {priceSats} SATS TO REVEAL
                </span>
              </div>

              <div className="space-y-1 overflow-hidden font-mono text-[11px] text-violet/40 select-none">
                {noise.map((line, i) => (
                  <div key={i} className="truncate tracking-widest">
                    {line}
                  </div>
                ))}
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center bg-void/80 p-4 backdrop-blur-[1px]">
                <ShieldAlert className="mb-2 h-8 w-8 text-amber" />
                <p className="mb-3 text-center font-bold text-xs tracking-telemetry text-salt uppercase">
                  Subsea Relay Telemetry Encrypted
                </p>
                <BrutalistButton
                  className="flex items-center gap-2 shadow-none"
                  disabled={isDecrypting}
                  onClick={() => {
                    void handleUnlock();
                  }}
                  size="md"
                  variant="amber"
                >
                  <Zap className="h-4 w-4 fill-void" />
                  {isDecrypting
                    ? "VERIFYING_PREIMAGE..."
                    : `POP_PAYWALL [ ${priceSats} SATS ]`}
                </BrutalistButton>
                {error ? (
                  <p className="mt-3 text-center font-mono text-[10px] tracking-telemetry text-amber uppercase">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </TerminalCard>

      <BrutalistQRModal
        isOpen={modalOpen && Boolean(invoice)}
        onClose={() => {
          setModalOpen(false);
          if (!isUnlocked) setIsDecrypting(false);
        }}
        bolt11Invoice={invoice?.bolt11 ?? ""}
        amountSats={priceSats}
        onPreimageConfirmed={(preimage) => {
          settle(preimage);
        }}
      />
    </>
  );
}
