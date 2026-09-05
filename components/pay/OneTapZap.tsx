"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useWebLn } from "@/components/pay/useWebLn";
import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";
import { playMechanicalLatch } from "@/lib/sound";

export function OneTapZap({
  invoice,
  disabled = false,
  onPaid,
  tone = "arcade",
  className,
  hideWhenUnavailable = true,
}: {
  invoice: string;
  disabled?: boolean;
  onPaid: () => void;
  tone?: "arcade" | "story" | "graf" | "bottle";
  className?: string;
  hideWhenUnavailable?: boolean;
}) {
  const { available, phase, paying, pay, reset, toast } = useWebLn();
  const live = Boolean(invoice) && invoice.toLowerCase().startsWith("ln");

  useEffect(() => {
    reset();
  }, [invoice, reset]);

  if (!available && hideWhenUnavailable) return null;

  const label =
    phase === "confirming" || paying ? COPY.validating : COPY.zapSats;

  return (
    <>
      <button
        type="button"
        className={cn("one-tap-zap", className)}
        data-tone={tone}
        disabled={disabled || !live || paying || phase === "confirming"}
        aria-busy={paying || phase === "confirming"}
        onClick={() => {
          void (async () => {
            const result = await pay(invoice);
            if (result.ok) {
              playMechanicalLatch();
              onPaid();
            }
          })();
        }}
      >
        {label}
      </button>
      {toast ? <PayToast message={toast} /> : null}
    </>
  );
}

export function PayToast({ message }: { message: string }) {
  const [node, setNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setNode(document.body);
  }, []);

  if (!node) return null;

  return createPortal(
    <p className="pay-toast" role="status" aria-live="polite">
      {message}
    </p>,
    node,
  );
}
