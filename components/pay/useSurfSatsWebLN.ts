"use client";

import { useCallback, useEffect, useState } from "react";
import { WEBLN_READY_EVENT } from "@/lib/bitcoin-connect";
import { playMechanicalLatch } from "@/lib/sound";
import {
  parseWebLnBalance,
  parseWebLnPubkey,
  payWithWebLn,
  webLnIsEnabled,
} from "@/lib/webln";

export type SurfSatsWebLNState = {
  isConnected: boolean;
  isConnecting: boolean;
  nodePubkey: string | null;
  balanceSats: number | null;
  error: string | null;
};

const IDLE: SurfSatsWebLNState = {
  isConnected: false,
  isConnecting: false,
  nodePubkey: null,
  balanceSats: null,
  error: null,
};

export function useSurfSatsWebLN() {
  const [state, setState] = useState<SurfSatsWebLNState>(IDLE);

  const checkConnection = useCallback(async () => {
    if (typeof window === "undefined" || !window.webln) {
      setState((prev) => ({
        ...IDLE,
        error: prev.error,
      }));
      return;
    }

    try {
      const enabled = await webLnIsEnabled(window.webln);
      if (!enabled) return;

      const info = window.webln.getInfo
        ? await window.webln.getInfo()
        : null;
      let balance: number | null = null;
      if (window.webln.getBalance) {
        balance = parseWebLnBalance(await window.webln.getBalance());
      }

      setState({
        isConnected: true,
        isConnecting: false,
        nodePubkey: parseWebLnPubkey(info),
        balanceSats: balance,
        error: null,
      });
    } catch {
      // Wallet locked or uninitialized
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onReady = () => {
      void checkConnection();
    };
    window.addEventListener(WEBLN_READY_EVENT, onReady);
    const timer = window.setTimeout(onReady, 0);
    return () => {
      window.removeEventListener(WEBLN_READY_EVENT, onReady);
      window.clearTimeout(timer);
    };
  }, [checkConnection]);

  const connectWallet = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    try {
      if (typeof window === "undefined") {
        throw new Error("No WebLN provider detected. Connect via Bitcoin Connect.");
      }
      if (!window.webln) {
        const { launchModal } = await import("@getalby/bitcoin-connect-react");
        launchModal();
        setState((prev) => ({ ...prev, isConnecting: false }));
        return;
      }
      await window.webln.enable();
      await checkConnection();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No WebLN provider detected. Connect via Bitcoin Connect.";
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: message,
      }));
    }
  }, [checkConnection]);

  const send21SatZap = useCallback(
    async (invoice: string, onSettled?: (preimage: string) => void) => {
      if (typeof window === "undefined" || !window.webln) {
        throw new Error("WebLN not available");
      }
      const result = await payWithWebLn({ host: window, invoice });
      if (!result.ok) {
        throw new Error(result.message);
      }
      playMechanicalLatch();
      onSettled?.(result.preimage);
      return { preimage: result.preimage };
    },
    [],
  );

  return {
    ...state,
    connectWallet,
    send21SatZap,
    refreshState: checkConnection,
  };
}
