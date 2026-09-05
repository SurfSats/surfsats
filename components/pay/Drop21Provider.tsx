"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BrutalistQRModal } from "@/components/pay/BrutalistQRModal";
import { useLightningLive } from "@/components/pay/useLightningLive";
import { useSurfSatsWebLN } from "@/components/pay/useSurfSatsWebLN";
import {
  DROP_21_SATS,
  drop21DocumentId,
  drop21Presentation,
  parseDrop21Invoice,
  type Drop21Invoice,
} from "@/lib/drop-21";
import { payFetch } from "@/lib/pay-fetch";
import { playMechanicalLatch } from "@/lib/sound";

type Drop21ContextValue = {
  dropping: boolean;
  error: string | null;
  drop21: () => Promise<void>;
};

const Drop21Context = createContext<Drop21ContextValue | null>(null);

export function useDrop21() {
  const ctx = useContext(Drop21Context);
  if (!ctx) {
    throw new Error("useDrop21 must be used within Drop21Provider");
  }
  return ctx;
}

export function Drop21Provider({ children }: { children: ReactNode }) {
  const { isConnected, send21SatZap } = useSurfSatsWebLN();
  const [dropping, setDropping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Drop21Invoice | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const settledRef = useRef(false);
  const inFlightRef = useRef(false);
  const connectedRef = useRef(isConnected);
  const sendRef = useRef(send21SatZap);

  connectedRef.current = isConnected;
  sendRef.current = send21SatZap;

  const settle = useCallback((preimage?: string) => {
    if (settledRef.current) return;
    settledRef.current = true;
    playMechanicalLatch();
    setModalOpen(false);
    setDropping(false);
    inFlightRef.current = false;
    void preimage;
  }, []);

  useLightningLive({
    paymentHash: invoice?.hash ?? "",
    enabled: Boolean(invoice?.hash) && !settledRef.current,
    onEvent: (event) => {
      settle(event.preimage);
    },
  });

  useEffect(() => {
    const hash = invoice?.hash;
    if (!hash) return;
    const id = window.setInterval(() => {
      if (settledRef.current) return;
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
          // keep waiting
        });
    }, 2000);
    return () => window.clearInterval(id);
  }, [invoice?.hash, settle]);

  const drop21 = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setDropping(true);
    setError(null);
    settledRef.current = false;
    try {
      const response = await payFetch("/api/sandbox/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: drop21DocumentId() }),
      });
      const body: unknown = await response.json();
      const parsed = parseDrop21Invoice(body);
      if (!response.ok || !parsed) {
        const message =
          body && typeof body === "object" && "error" in body
            ? String(body.error)
            : "could not mint invoice";
        throw new Error(message);
      }
      setInvoice(parsed);
      if (drop21Presentation(connectedRef.current) === "zap") {
        try {
          await sendRef.current(parsed.bolt11, (preimage) => {
            settle(preimage);
          });
          return;
        } catch {
          setModalOpen(true);
        }
      } else {
        setModalOpen(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "could not mint invoice");
    } finally {
      inFlightRef.current = false;
      setDropping(false);
    }
  }, [settle]);

  const value = useMemo(
    () => ({ dropping, error, drop21 }),
    [dropping, error, drop21],
  );

  return (
    <Drop21Context.Provider value={value}>
      {children}
      <BrutalistQRModal
        isOpen={modalOpen && Boolean(invoice?.bolt11)}
        onClose={() => setModalOpen(false)}
        bolt11Invoice={invoice?.bolt11 ?? ""}
        amountSats={invoice?.amountSats ?? DROP_21_SATS}
        onPreimageConfirmed={settle}
      />
    </Drop21Context.Provider>
  );
}
