"use client";

import { useEffect, type ReactNode } from "react";
import {
  applyBitcoinConnectProvider,
  bitcoinConnectInit,
} from "@/lib/bitcoin-connect";

export function BitcoinConnectRoot({ children }: { children?: ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    let unsubConnected = () => {};
    let unsubDisconnected = () => {};

    void import("@getalby/bitcoin-connect-react").then((mod) => {
      if (cancelled) return;

      mod.init({ ...bitcoinConnectInit });

      unsubConnected = mod.onConnected((provider) => {
        applyBitcoinConnectProvider({
          host: window,
          provider,
          announce: window,
        });
      });

      unsubDisconnected = mod.onDisconnected(() => {
        applyBitcoinConnectProvider({
          host: window,
          provider: null,
          announce: window,
        });
      });
    });

    return () => {
      cancelled = true;
      unsubConnected();
      unsubDisconnected();
    };
  }, []);

  return children ?? null;
}
