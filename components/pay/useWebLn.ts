"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  isWebLnAvailable,
  payWithWebLn,
  weblnToastMessage,
  type WebLnPayResult,
} from "@/lib/webln";

const WEBLN_READY = "webln:ready";
const TOAST_MS = 2400;

function subscribeWebLn(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(WEBLN_READY, onChange);
  document.addEventListener(WEBLN_READY, onChange);
  const t0 = window.setTimeout(onChange, 0);
  const t1 = window.setTimeout(onChange, 250);
  return () => {
    window.removeEventListener(WEBLN_READY, onChange);
    document.removeEventListener(WEBLN_READY, onChange);
    window.clearTimeout(t0);
    window.clearTimeout(t1);
  };
}

function getWebLnSnapshot() {
  return isWebLnAvailable(window);
}

function getServerSnapshot() {
  return false;
}

export function useWebLn() {
  const available = useSyncExternalStore(
    subscribeWebLn,
    getWebLnSnapshot,
    getServerSnapshot,
  );
  const [phase, setPhase] = useState<"idle" | "prompt" | "confirming">(
    "idle",
  );
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef(0);
  const lock = useRef(false);

  const dismissToast = useCallback(() => {
    window.clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const showToast = useCallback((message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(toastTimer.current);
  }, []);

  const reset = useCallback(() => {
    lock.current = false;
    setPhase("idle");
  }, []);

  const pay = useCallback(
    async (invoice: string): Promise<WebLnPayResult> => {
      if (lock.current) {
        return {
          ok: false,
          reason: "failed",
          message: "Wallet could not send the zap",
        };
      }
      lock.current = true;
      setPhase("prompt");
      const result = await payWithWebLn({ host: window, invoice });
      if (!result.ok) {
        lock.current = false;
        setPhase("idle");
        const message = weblnToastMessage(result);
        if (message) showToast(message);
        return result;
      }
      setPhase("confirming");
      return result;
    },
    [showToast],
  );

  return {
    available,
    phase,
    paying: phase === "prompt",
    pay,
    reset,
    toast,
    dismissToast,
  };
}

export function useCheckNow() {
  const ref = useRef<() => void>(() => {});
  const bind = useCallback((fn: () => void | Promise<void>) => {
    ref.current = () => {
      void fn();
    };
  }, []);
  const kick = useCallback(() => {
    ref.current();
  }, []);
  return { bind, kick };
}
