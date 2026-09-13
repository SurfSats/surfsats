"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ARCADE_STORAGE_KEY,
  RETRO_STORAGE_KEY,
  TAB_STORAGE_KEY,
} from "@/lib/arcade";
import { TAB_STORAGE_KEY as HARBOR_TAB_STORAGE_KEY } from "@/lib/tab";
import {
  CALLSIGN_STORAGE_KEY,
  migrateGlassFromArcade,
  nextGlassFromEtch,
  nextGlassFromTyping,
  parseGlassCache,
  type CallsignEtch,
  type GlassCache,
} from "@/lib/callsign";

type GlassContextValue = {
  glass: GlassCache | null;
  ready: boolean;
  setCallsign: (raw: string) => void;
  markEtched: (
    etch: Pick<CallsignEtch, "callsign" | "firstPaymentHash" | "createdAt">,
  ) => void;
  wipeGlass: () => void;
};

const GlassContext = createContext<GlassContextValue | null>(null);

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function writeGlass(value: GlassCache | null) {
  try {
    if (!value?.callsign) {
      window.localStorage.removeItem(CALLSIGN_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(CALLSIGN_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // quota / private mode
  }
}

function loadGlass(): GlassCache | null {
  const stored = parseGlassCache(readJson(CALLSIGN_STORAGE_KEY));
  if (stored) return stored;
  const sessions = [
    ARCADE_STORAGE_KEY,
    RETRO_STORAGE_KEY,
    TAB_STORAGE_KEY,
    HARBOR_TAB_STORAGE_KEY,
  ];
  for (const key of sessions) {
    const migrated = migrateGlassFromArcade(null, readJson(key));
    if (migrated) {
      writeGlass(migrated);
      return migrated;
    }
  }
  return null;
}

export function GlassProvider({ children }: { children: ReactNode }) {
  const [glass, setGlass] = useState<GlassCache | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setGlass(loadGlass());
    setReady(true);
  }, []);

  const persist = useCallback((next: GlassCache | null) => {
    writeGlass(next);
    setGlass(next);
  }, []);

  const setCallsign = useCallback(
    (raw: string) => {
      persist(nextGlassFromTyping(glass, raw));
    },
    [glass, persist],
  );

  const markEtched = useCallback(
    (
      etch: Pick<CallsignEtch, "callsign" | "firstPaymentHash" | "createdAt">,
    ) => {
      persist(nextGlassFromEtch(glass, etch));
    },
    [glass, persist],
  );

  const wipeGlass = useCallback(() => {
    persist(null);
  }, [persist]);

  const value = useMemo(
    () => ({ glass, ready, setCallsign, markEtched, wipeGlass }),
    [glass, ready, setCallsign, markEtched, wipeGlass],
  );

  return (
    <GlassContext.Provider value={value}>{children}</GlassContext.Provider>
  );
}

export function useGlass() {
  const value = useContext(GlassContext);
  if (!value) {
    throw new Error("useGlass must be used within GlassProvider");
  }
  return value;
}

export function useOptionalGlass() {
  return useContext(GlassContext);
}

export function useGlassAlias() {
  const { glass, setCallsign, markEtched } = useGlass();
  return {
    alias: glass?.callsign ?? "",
    setAlias: setCallsign,
    markEtched,
    callsignOk: Boolean(glass?.callsign),
  };
}
