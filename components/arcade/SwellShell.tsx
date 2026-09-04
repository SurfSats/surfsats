"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArcadeInvoice } from "@/components/arcade/ArcadeInvoice";
import { useSettleHandoff } from "@/components/pay/SettleRitual";
import {
  ARCADE_ALIAS_MAX,
  ARCADE_CREDITS_PER_PAY,
  ARCADE_PRICE_SATS,
  ARCADE_STORAGE_KEY,
  SWELL_HOP_GAME_ID,
  formatCredits,
  isPlayerId,
  sanitizeAlias,
} from "@/lib/arcade";

const SwellHop = dynamic(
  () => import("@/components/arcade/SwellHop").then((mod) => mod.SwellHop),
  { ssr: false },
);

type SessionCache = {
  playerId: string;
  alias: string;
};

type Mode = "attract" | "invoice" | "ready" | "playing";

export function SwellShell() {
  const { settling, beginSettle, finishSettle } = useSettleHandoff();
  const [playerId, setPlayerId] = useState("");
  const [alias, setAlias] = useState("");
  const [credits, setCredits] = useState(0);
  const [mode, setMode] = useState<Mode>("attract");
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
  const startLock = useRef(false);
  const bootRef = useRef<(opts?: { creditCount?: number }) => Promise<void>>(
    async () => undefined,
  );

  const aliasOk = sanitizeAlias(alias).ok;
  const paying = mode === "invoice";
  const playing = mode === "playing";

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
    void loadSession(playerId);
    const id = window.setInterval(() => void loadSession(playerId), 12_000);
    return () => window.clearInterval(id);
  }, [playerId, loadSession]);

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
        width: 280,
        margin: 2,
        color: { dark: "#111111", light: "#efe6d4" },
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
    if (mode !== "invoice" || !paymentHash || expired || settling) return;
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
          const creditsNext = data.credits ?? 0;
          setInvoiceError(null);
          setWaiting(false);
          beginSettle(() => {
            setCredits(creditsNext);
            setPaymentHash("");
            setPaymentRequest("");
            setMode(creditsNext > 0 ? "ready" : "attract");
            if (creditsNext > 0) {
              void bootRef.current({ creditCount: creditsNext });
            }
          });
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
  }, [beginSettle, expired, mode, paymentHash, settling]);

  const remainMs = expiresAt ? new Date(expiresAt).getTime() - nowTick : 0;
  const remainLabel = mode === "invoice" ? formatRemain(remainMs) : "";

  async function requestInvoice() {
    const next = sanitizeAlias(alias);
    if (!next.ok) {
      setError("SET CALLSIGN FIRST · 2–16 CHARS");
      return;
    }
    setAlias(next.alias);
    setError(null);
    setPending(true);
    setPaymentHash("");
    setPaymentRequest("");
    setQrSrc("");
    setExpired(false);
    setInvoiceError(null);
    setMode("invoice");
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
        setMode(credits > 0 ? "ready" : "attract");
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
      setMode(credits > 0 ? "ready" : "attract");
    } finally {
      setPending(false);
    }
  }

  const boot = useCallback(async ({ creditCount = credits }: { creditCount?: number } = {}) => {
    if (mode === "playing" || startLock.current) return;
    const next = sanitizeAlias(alias);
    if (!next.ok) {
      setError("SET CALLSIGN FIRST · 2–16 CHARS");
      return;
    }
    if (creditCount < 1) {
      setError(
        `INSERT ${ARCADE_PRICE_SATS} SATS FOR ${ARCADE_CREDITS_PER_PAY} CREDITS`,
      );
      return;
    }
    setError(null);
    setAlias(next.alias);
    startLock.current = true;
    try {
      const response = await fetch("/api/arcade/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, game: SWELL_HOP_GAME_ID }),
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
    } catch {
      setError("cabinet jammed. try again");
    } finally {
      startLock.current = false;
    }
  }, [alias, credits, mode, playerId]);
  bootRef.current = boot;

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
    setPending(false);
  }

  function handleWipeout() {
    setMode(credits > 0 ? "ready" : "attract");
  }

  const showInvoice = mode === "invoice" || pending || settling;
  const canPlay = credits > 0 && mode !== "invoice" && mode !== "playing";

  useEffect(() => {
    if (!showInvoice) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !settling) cancelPay();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [settling, showInvoice]);

  const screenMode = useMemo(() => {
    if (mode === "invoice" || mode === "playing") return mode;
    return credits > 0 ? "ready" : "attract";
  }, [mode, credits]);

  return (
    <div className={`anarch-shell swell-shell${playing ? " is-playing" : ""}`}>
      {playing ? (
        <div className="anarch-run">
          <div className="anarch-run-bar">
            <p>
              SWELL HOP · {formatCredits(credits)} CR · no scores this pass
            </p>
            <Link className="anarch-exit" href="/arcade#floor">
              EXIT
            </Link>
          </div>
          <div className="anarch-playfield swell-playfield">
            <SwellHop onWipeout={handleWipeout} />
          </div>
        </div>
      ) : (
        <>
          <div className="anarch-stage">
            <p className="anarch-kicker">SWELL HOP</p>
            <p className="anarch-copy">
              {ARCADE_PRICE_SATS} sats · tap to hop
            </p>
            <p className="anarch-copy anarch-copy-pool">
              Shares the Wave Runner credit pool. {ARCADE_CREDITS_PER_PAY}{" "}
              credits per insert. No Swell Hop scores on HIGH SCORES.
            </p>
          </div>
          <div className="anarch-till">
            <label className="cab-alias">
              <span>CALLSIGN · REQUIRED</span>
              <input
                value={alias}
                maxLength={ARCADE_ALIAS_MAX}
                onChange={(event) => setAlias(event.target.value)}
                placeholder="YOUR ALIAS"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                disabled={paying || pending}
              />
            </label>
            {canPlay || screenMode === "ready" ? (
              <button
                type="button"
                className="cab-play"
                onClick={() => void boot()}
                disabled={!aliasOk || pending}
              >
                PLAY
                <span>1 CREDIT · {formatCredits(credits)} LEFT</span>
              </button>
            ) : (
              <button
                type="button"
                className="cab-insert cab-insert-primary"
                disabled={!aliasOk || pending || paying}
                onClick={() => void requestInvoice()}
              >
                {pending
                  ? "BUILDING INVOICE…"
                  : `INSERT ${ARCADE_PRICE_SATS} SATS`}
                <span>
                  {pending
                    ? "LIGHTNING"
                    : `GET INVOICE · ${ARCADE_CREDITS_PER_PAY} CREDITS`}
                </span>
              </button>
            )}
            <div className="cab-led">
              <p>CREDITS</p>
              <p className="cab-led-num">{formatCredits(credits)}</p>
            </div>
            {error ? <p className="cab-error">{error}</p> : null}
          </div>
        </>
      )}

      {showInvoice ? (
        <ArcadeInvoice
          qrSrc={qrSrc}
          paymentRequest={paymentRequest}
          waiting={waiting}
          pending={pending}
          expired={expired}
          remainLabel={remainLabel}
          copied={copied}
          invoiceError={invoiceError}
          memo={`${ARCADE_CREDITS_PER_PAY} credits · SWELL HOP · SurfSats Arcade`}
          titleId="arcade-pay-title-swell"
          settling={settling}
          onSettled={finishSettle}
          onCopy={() => void copyInvoice()}
          onRetry={() => void requestInvoice()}
          onCancel={cancelPay}
        />
      ) : null}
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
