"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArcadeInvoice } from "@/components/arcade/ArcadeInvoice";
import { PlebBoxCabinet } from "@/components/arcade/PlebBoxCabinet";
import { payFetch } from "@/lib/pay-fetch";
import { useSettleHandoff } from "@/components/pay/SettleRitual";
import { useCheckNow } from "@/components/pay/useWebLn";
import type { ArcadeScreenMode } from "@/components/arcade/ArcadeScreen";
import {
  ARCADE_CREDITS_PER_PAY,
  ARCADE_MACHINE_PLEB,
  ARCADE_PRICE_SATS,
  PLEB_BOX_LABEL,
  PLEB_BOX_STORAGE_KEY,
  isPlebBoxGameId,
  isPlayerId,
  plebInvoiceFromSubmit,
  sanitizeAlias,
  type PlebBoxGameId,
} from "@/lib/arcade";
import { parseCallsignEtch } from "@/lib/callsign";
import { useGlassAlias } from "@/lib/useGlass";
import { INVOICE_QR_OPTIONS } from "@/lib/invoice-qr";

type SessionCache = {
  playerId: string;
  alias: string;
  game?: string;
};

export function PlebBoxApp({
  front = true,
  onBringForward,
}: {
  front?: boolean;
  onBringForward?: () => void;
}) {
  const { settling, beginSettle, finishSettle } = useSettleHandoff();
  const { bind: bindCheck, kick: kickCheck } = useCheckNow();
  const { alias, setAlias, markEtched } = useGlassAlias();
  const [playerId, setPlayerId] = useState("");
  const [credits, setCredits] = useState(0);
  const [game, setGame] = useState<PlebBoxGameId>("noodle");
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
  const [playId, setPlayId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [length, setLength] = useState(3);
  const startLock = useRef(false);
  const playIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cached: SessionCache | null = null;
    try {
      const raw = window.localStorage.getItem(PLEB_BOX_STORAGE_KEY);
      if (raw) cached = JSON.parse(raw) as SessionCache;
    } catch {
      cached = null;
    }
    const id =
      cached && isPlayerId(cached.playerId)
        ? cached.playerId
        : window.crypto.randomUUID();
    setPlayerId(id);
    const query = new URLSearchParams(window.location.search).get("game");
    if (isPlebBoxGameId(query)) setGame(query);
    else if (cached?.game && isPlebBoxGameId(cached.game)) setGame(cached.game);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !playerId) return;
    try {
      window.localStorage.setItem(
        PLEB_BOX_STORAGE_KEY,
        JSON.stringify({
          playerId,
          alias,
          game,
        } satisfies SessionCache),
      );
    } catch {
      // ignore
    }
  }, [playerId, alias, game, ready]);

  const loadSession = useCallback(
    async (id: string) => {
      const response = await fetch(
        `/api/arcade/session?playerId=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        credits?: number;
        alias?: string;
      };
      if (typeof data.credits === "number") setCredits(data.credits);
      if (data.alias && !alias) setAlias(data.alias);
    },
    [alias, setAlias],
  );

  useEffect(() => {
    if (!playerId) return;
    void loadSession(playerId);
    const id = window.setInterval(() => {
      void loadSession(playerId);
    }, 12_000);
    return () => window.clearInterval(id);
  }, [playerId, loadSession]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!front || mode !== "invoice") return;
    document.body.dataset.arcadeFocus = "pleb";
    return () => {
      if (document.body.dataset.arcadeFocus === "pleb") {
        delete document.body.dataset.arcadeFocus;
      }
    };
  }, [front, mode]);

  useEffect(() => {
    if (!paymentRequest) {
      setQrSrc("");
      return;
    }
    let cancelled = false;
    void import("qrcode").then(async (QRCode) => {
      const src = await QRCode.toDataURL(paymentRequest, INVOICE_QR_OPTIONS);
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
        const response = await payFetch(
          `/api/arcade/check?hash=${encodeURIComponent(paymentHash)}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          paid?: boolean;
          ok?: boolean;
          credits?: number;
          etch?: unknown;
          error?: string;
        };
        if (cancelled) return;
        if (data.paid && data.ok) {
          const creditsNext = data.credits ?? 0;
          const etch = parseCallsignEtch(data.etch);
          if (etch) markEtched(etch);
          setInvoiceError(null);
          setWaiting(false);
          beginSettle(() => {
            setCredits(creditsNext);
            setMode(creditsNext > 0 && game === "noodle" ? "ready" : "attract");
            setPaymentHash("");
            setPaymentRequest("");
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

    bindCheck(poll);
    void poll();
    const id = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [beginSettle, bindCheck, expired, game, markEtched, mode, paymentHash, settling]);

  const remainMs = expiresAt ? new Date(expiresAt).getTime() - nowTick : 0;
  const remainLabel = mode === "invoice" ? formatRemain(remainMs) : "";

  const screenMode: ArcadeScreenMode = useMemo(() => {
    if (
      mode === "invoice" ||
      mode === "playing" ||
      mode === "result" ||
      mode === "ready"
    ) {
      return mode;
    }
    return "attract";
  }, [mode]);

  function selectGame(id: PlebBoxGameId) {
    if (mode === "invoice") return;
    if (id === game) return;
    if (mode === "playing" && game === "noodle" && id !== "noodle") {
      void submitScore(score);
    }
    setGame(id);
    setError(null);
    if (id === "noodle") {
      setMode(credits > 0 ? "ready" : "attract");
    } else {
      setMode("attract");
    }
  }

  async function requestInvoice() {
    const gate = plebInvoiceFromSubmit(alias, { explicit: true });
    if (!gate.open) {
      setError("SET CALLSIGN FIRST · 2–16 CHARS");
      return;
    }
    setAlias(gate.alias);
    setError(null);
    setPending(true);
    setPaymentHash("");
    setPaymentRequest("");
    setQrSrc("");
    setExpired(false);
    setInvoiceError(null);
    setMode("invoice");
    try {
      const response = await payFetch("/api/arcade/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          alias: gate.alias,
          machine: ARCADE_MACHINE_PLEB,
          game,
        }),
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
        setMode(credits > 0 && game === "noodle" ? "ready" : "attract");
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
      setMode(credits > 0 && game === "noodle" ? "ready" : "attract");
    } finally {
      setPending(false);
    }
  }

  const submitScore = useCallback(
    async (value: number) => {
      try {
        await fetch("/api/arcade/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId,
            playId: playIdRef.current ?? playId,
            score: value,
            game: "noodle",
          }),
        });
      } catch {
        // play is already recorded
      }
    },
    [playId, playerId],
  );

  const play = useCallback(async () => {
    if (game !== "noodle") return;
    if (mode === "invoice" || mode === "playing" || startLock.current) return;
    const next = sanitizeAlias(alias);
    if (!next.ok) {
      setError("SET CALLSIGN FIRST · 2–16 CHARS");
      return;
    }
    if (credits < 1) {
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
        body: JSON.stringify({ playerId, game: "noodle" }),
      });
      const data = (await response.json()) as {
        error?: string;
        credits?: number;
        playId?: string;
      };
      if (!response.ok) {
        setError(data.error || "cabinet jammed");
        return;
      }
      if (typeof data.credits === "number") setCredits(data.credits);
      playIdRef.current = data.playId ?? null;
      setPlayId(data.playId ?? null);
      setScore(0);
      setLength(3);
      setMode("playing");
    } catch {
      setError("cabinet jammed. try again");
    } finally {
      startLock.current = false;
    }
  }, [alias, credits, game, mode, playerId, setAlias]);

  const handleDie = useCallback(
    (value: number) => {
      setScore(value);
      setMode("result");
      void submitScore(value);
    },
    [submitScore],
  );

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
    setMode(credits > 0 && game === "noodle" ? "ready" : "attract");
    setPaymentHash("");
    setPaymentRequest("");
    setQrSrc("");
    setWaiting(false);
    setExpired(false);
    setInvoiceError(null);
    setPending(false);
  }

  const showInvoice = screenMode === "invoice" || pending || settling;

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

  const gameMemo = `${ARCADE_CREDITS_PER_PAY} credits · ${PLEB_BOX_LABEL} · ${game.toUpperCase()} · SurfSats Arcade`;

  return (
    <div className={`arcade-bay arcade-bay-pleb ${front ? "is-front" : "is-back"}`}>
      {!front ? (
        <button
          type="button"
          className="cab-bring"
          onClick={onBringForward}
          aria-label={`Bring ${PLEB_BOX_LABEL} to the front`}
        >
          {PLEB_BOX_LABEL}
        </button>
      ) : null}
      <PlebBoxCabinet
        alias={alias}
        credits={credits}
        mode={screenMode}
        pending={pending}
        error={error}
        game={game}
        score={score}
        length={length}
        armed={front}
        front={front}
        onInsert={() => void requestInvoice()}
        onPlay={() => void play()}
        onSelectGame={selectGame}
        onDie={handleDie}
        onHud={(nextScore, nextLength) => {
          setScore(nextScore);
          setLength(nextLength);
        }}
      />
      {showInvoice ? (
        <ArcadeInvoice
          qrSrc={qrSrc}
          paymentHash={paymentHash}
          paymentRequest={paymentRequest}
          waiting={waiting}
          pending={pending}
          expired={expired}
          remainLabel={remainLabel}
          copied={copied}
          invoiceError={invoiceError}
          memo={gameMemo}
          titleId="arcade-pay-title-pleb"
          settling={settling}
          onSettled={finishSettle}
          onCopy={() => void copyInvoice()}
          onRetry={() => void requestInvoice()}
          onCancel={cancelPay}
          onZapPaid={kickCheck}
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
