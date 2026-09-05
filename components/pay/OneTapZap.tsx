"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useWebLn } from "@/components/pay/useWebLn";

export function OneTapZap({
  invoice,
  disabled = false,
  onPaid,
  tone = "arcade",
}: {
  invoice: string;
  disabled?: boolean;
  onPaid: () => void;
  tone?: "arcade" | "story" | "graf" | "bottle";
}) {
  const { available, phase, paying, pay, reset, toast } = useWebLn();
  const live = Boolean(invoice) && invoice.toLowerCase().startsWith("ln");

  useEffect(() => {
    reset();
  }, [invoice, reset]);

  if (!available) return null;

  const label =
    phase === "confirming"
      ? "Confirming…"
      : paying
        ? "Requesting…"
        : "⚡ One-Tap Zap";

  return (
    <>
      <button
        type="button"
        className="one-tap-zap"
        data-tone={tone}
        disabled={disabled || !live || paying || phase === "confirming"}
        aria-busy={paying || phase === "confirming"}
        onClick={() => {
          void (async () => {
            const result = await pay(invoice);
            if (result.ok) onPaid();
          })();
        }}
      >
        {label}
      </button>
      {toast ? <PayToast message={toast} /> : null}
    </>
  );
}

function PayToast({ message }: { message: string }) {
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
