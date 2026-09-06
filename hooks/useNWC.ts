"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { payInvoiceWithLiveNwc } from "@/lib/nwc-client";
import {
  clearNwcUri,
  isValidNwcUri,
  loadNwcUri,
  NWC_CHANGED_EVENT,
  nwcIsConnected,
  parseNwcUri,
  saveNwcUri,
} from "@/lib/nwc";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(NWC_CHANGED_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(NWC_CHANGED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot() {
  return loadNwcUri();
}

function getServerSnapshot() {
  return "";
}

export function useNWC() {
  const uri = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const connection = useMemo(() => parseNwcUri(uri), [uri]);
  const isConnected = Boolean(connection);

  const connect = useCallback((next: string) => {
    if (!isValidNwcUri(next)) {
      throw new Error("Invalid NWC pairing string");
    }
    saveNwcUri(next);
  }, []);

  const disconnect = useCallback(() => {
    clearNwcUri();
  }, []);

  const payInvoice = useCallback(async (invoice: string) => {
    if (!nwcIsConnected()) {
      throw new Error("NWC disconnected");
    }
    return payInvoiceWithLiveNwc(invoice);
  }, []);

  return {
    isConnected,
    uri,
    connection,
    connect,
    disconnect,
    payInvoice,
  };
}
