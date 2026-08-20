"use client";

import { Press_Start_2P } from "next/font/google";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArcadeBoards } from "@/components/arcade/ArcadeBoards";
import { ArcadeCabinet } from "@/components/arcade/ArcadeCabinet";
import type { ArcadeScreenMode } from "@/components/arcade/ArcadeScreen";
import {
  ARCADE_PRICE_SATS,
  ARCADE_STORAGE_KEY,
  isPlayerId,
  sanitizeAlias,
  type ArcadeHighScore,
  type ArcadeRecentPlay,
} from "@/lib/arcade";

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-arcade-pixel",
});

type SessionCache = {
  playerId: string;
  alias: string;
};

export function ArcadeApp() {
  const [playerId, setPlayerId] = useState("");
  const [alias, setAlias] = useState("");
  const [credits, setCredits] = useState(0);
  const [highScores, setHighScores] = useState<ArcadeHighScore[]>([]);
  const [lastPlayers, setLastPlayers] = useState<ArcadeRecentPlay[]>([]);
  const [mode, setMode] = useState<ArcadeScreenMode>("attract");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState("");
  const [paymentHash, setPaymentHash] = useState("");
  const [qrSrc, setQrSrc] = useState("");
  const [copied, setCopied] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [expired, setExpired] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cached: SessionCache | null = null;
    try {
      const raw = window.localStorage.getItem(ARCADE_STORAGE_KEY);
      if (raw) cached = JSON.parse(raw) as SessionCache;
    } catch {
      cached = null;
    }
    const id =
      cached && isPlayerId(cached.playerId)
        ? cached.playerId
        : window.crypto.randomUUID();
    setPlayerId(id);
    if (cached?.alias) setAlias(cached.alias);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !playerId) return;
    try {
      window.localStorage.setItem(
        ARCADE_STORAGE_KEY,
        JSON.stringify({ playerId, alias } satisfies SessionCache),
      );
    } catch {
      // ignore
    }
  }, [playerId, alias, ready]);

  const loadBoards = useCallback(async () => {
    const response = await fetch("/api/arcade", { cache: "no-store" });
    const data = (await response.json()) as {
      highScores?: ArcadeHighScore[];
      lastPlayers?: ArcadeRecentPlay[];
    };
    if (Array.isArray(data.highScores)) setHighScores(data.highScores);
    if (Array.isArray(data.lastPlayers)) setLastPlayers(data.lastPlayers);
  }, []);

  const loadSession = useCallback(async (id: string) => {
    const response = await fetch(
      `/api/arcade/session?playerId=${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
    const data = (await response.json()) as {
      credits?: number;
      alias?: string;
    };
    if (typeof data.credits === "number") setCredits(data.credits);
    if (data.alias) {
      setAlias((current) => current || data.alias || "");
    }
  }, []);

  useEffect(() => {
    if (!playerId) return;
    void loadBoards();
    void loadSession(playerId);
    const id = window.setInterval(() => {
      void loadBoards();
      void loadSession(playerId);
    }, 12_000);
    return () => window.clearInterval(id);
  }, [playerId, loadBoards, loadSession]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!paymentRequest) {
      setQrSrc("");
      return;
    }
    let cancelled = false;
    void import("qrcode").then(async (QRCode) => {
      const src = await QRCode.toDataURL(paymentRequest, {
        width: 220,
        margin: 1,
        color: { dark: "#041018", light: "#d7f4ff" },
        errorCorrectionLevel: "M",
      });
      if (!cancelled) setQrSrc(src);
    });
    return () => {
      cancelled = true;
    };
  }, [paymentRequest]);

  useEffect(() => {
    if (mode !== "invoice" || !expiresAt) return;
    if (Date.now() >= new Date(expiresAt).getTime()) {
      setExpired(true);
      setWaiting(false);
    }
  }, [mode, expiresAt, nowTick]);

  useEffect(() => {
    if (mode !== "invoice" || !paymentHash || expired) return;
    let cancelled = false;
    setWaiting(true);

    async function poll() {
      try {
        const response = await fetch(
          `/api/arcade/check?hash=${encodeURIComponent(paymentHash)}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          paid?: boolean;
          ok?: boolean;
          credits?: number;
          error?: string;
        };
        if (cancelled) return;
        if (data.paid && data.ok) {
          setCredits(data.credits ?? 0);
          setInvoiceError(null);
          setWaiting(false);
          setMode((data.credits ?? 0) > 0 ? "ready" : "attract");
          setPaymentHash("");
          setPaymentRequest("");
          void loadBoards();
          return;
        }
        if (data.paid && !data.ok) {
          setInvoiceError("payment landed, credits did not");
          setWaiting(false);
          return;
        }
        if (!response.ok) {
          setInvoiceError(data.error || "could not check payment. retrying…");
        }
      } catch {
        if (!cancelled) setInvoiceError("could not check payment. retrying…");
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [mode, paymentHash, expired, loadBoards]);

  const remainMs = expiresAt ? new Date(expiresAt).getTime() - nowTick : 0;
  const remainLabel = mode === "invoice" ? formatRemain(remainMs) : "";

  const screenMode: ArcadeScreenMode = useMemo(() => {
    if (mode === "invoice" || mode === "playing") return mode;
    return credits > 0 ? "ready" : "attract";
  }, [mode, credits]);

  async function requestInvoice() {
    const next = sanitizeAlias(alias);
    if (!next.ok) {
      setError(next.reason);
      return;
    }
    setAlias(next.alias);
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/arcade/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, alias: next.alias }),
      });
      const data = (await response.json()) as {
        error?: string;
        payment_request?: string;
        payment_hash?: string;
        expires_at?: string | null;
      };
      if (
        !response.ok ||
        !data.payment_request ||
        !data.payment_hash ||
        !data.payment_request.toLowerCase().startsWith("ln")
      ) {
        setError(data.error || "could not create invoice. try again");
        return;
      }
      setPaymentRequest(data.payment_request);
      setPaymentHash(data.payment_hash);
      setExpiresAt(
        data.expires_at || new Date(Date.now() + 50 * 60 * 1000).toISOString(),
      );
      setCopied(false);
      setInvoiceError(null);
      setExpired(false);
      setMode("invoice");
    } catch {
      setError("could not create invoice. try again");
    } finally {
      setPending(false);
    }
  }

  async function play() {
    if (mode === "invoice" || mode === "playing") return;
    const next = sanitizeAlias(alias);
    if (!next.ok) {
      setError(next.reason);
      return;
    }
    if (credits < 1) {
      setError("insert sats for credits");
      return;
    }
    setError(null);
    setAlias(next.alias);
    try {
      const response = await fetch("/api/arcade/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = (await response.json()) as {
        error?: string;
        credits?: number;
      };
      if (!response.ok) {
        setError(data.error || "cabinet jammed");
        return;
      }
      if (typeof data.credits === "number") setCredits(data.credits);
      setMode("playing");
      void loadBoards();
      window.setTimeout(() => {
        setMode("attract");
      }, 4200);
    } catch {
      setError("cabinet jammed. try again");
    }
  }

  async function copyInvoice() {
    if (!paymentRequest) return;
    try {
      await navigator.clipboard.writeText(paymentRequest);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function cancelPay() {
    setMode(credits > 0 ? "ready" : "attract");
    setPaymentHash("");
    setPaymentRequest("");
    setQrSrc("");
    setWaiting(false);
    setExpired(false);
    setInvoiceError(null);
  }

  return (
    <div className={`${pixel.variable} arcade-page`}>
      <div className="arcade-haze" aria-hidden="true" />
      <h1 className="sr-only">SurfSats Lightning Arcade</h1>
      <div className="arcade-stage">
        <ArcadeCabinet
          alias={alias}
          credits={credits}
          mode={screenMode}
          pending={pending}
          qrSrc={qrSrc}
          paymentRequest={paymentRequest}
          waiting={waiting}
          invoiceError={invoiceError}
          expired={expired}
          remainLabel={remainLabel}
          copied={copied}
          error={error}
          onAlias={setAlias}
          onInsert={() => void requestInvoice()}
          onPlay={() => void play()}
          onCopy={() => void copyInvoice()}
          onCancel={cancelPay}
        />
        <ArcadeBoards
          highScores={highScores}
          lastPlayers={lastPlayers}
          now={nowTick}
        />
      </div>
      <div className="arcade-rail">
        <p>REAL SATS. REAL FAST. REAL ARCADE.</p>
        <button type="button" onClick={() => void requestInvoice()}>
          ⚡ PLAY NOW {ARCADE_PRICE_SATS} SATS
        </button>
        <p>WE DON&apos;T HODL. DEMO PLAY.</p>
      </div>
    </div>
  );
}

function formatRemain(ms: number) {
  if (ms <= 0) return "";
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")} LEFT`;
}
