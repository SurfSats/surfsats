"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArcadeCabinet } from "@/components/arcade/ArcadeCabinet";
import { ArcadeInvoice } from "@/components/arcade/ArcadeInvoice";
import { payFetch } from "@/lib/pay-fetch";
import { useSettleHandoff } from "@/components/pay/SettleRitual";
import { useCheckNow } from "@/components/pay/useWebLn";
import type { ArcadeScreenMode } from "@/components/arcade/ArcadeScreen";
import type { WaveRunnerHandle } from "@/components/arcade/WaveRunner";
import {
  ARCADE_CREDITS_PER_PAY,
  ARCADE_GAME_ID,
  ARCADE_PRICE_SATS,
  ARCADE_STORAGE_KEY,
  arcadeScoreSnippet,
  isPlayerId,
  sanitizeAlias,
  type ArcadeHighScore,
} from "@/lib/arcade";
import { INVOICE_QR_OPTIONS } from "@/lib/invoice-qr";

type SessionCache = {
  playerId: string;
  alias: string;
};

export function ArcadeApp({
  front = true,
  onBringForward,
}: {
  front?: boolean;
  onBringForward?: () => void;
}) {
  const { settling, beginSettle, finishSettle } = useSettleHandoff();
  const { bind: bindCheck, kick: kickCheck } = useCheckNow();
  const [playerId, setPlayerId] = useState("");
  const [alias, setAlias] = useState("");
  const [credits, setCredits] = useState(0);
  const [highScores, setHighScores] = useState<ArcadeHighScore[]>([]);
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
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [scoreCopied, setScoreCopied] = useState(false);
  const gameRef = useRef<WaveRunnerHandle | null>(null);
  const startLock = useRef(false);
  const playIdRef = useRef<string | null>(null);

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
    };
    if (Array.isArray(data.highScores)) setHighScores(data.highScores);
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
          error?: string;
        };
        if (cancelled) return;
        if (data.paid && data.ok) {
          const creditsNext = data.credits ?? 0;
          setInvoiceError(null);
          setWaiting(false);
          beginSettle(() => {
            setCredits(creditsNext);
            setMode(creditsNext > 0 ? "ready" : "attract");
            setPaymentHash("");
            setPaymentRequest("");
            void loadBoards();
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
  }, [beginSettle, bindCheck, expired, loadBoards, mode, paymentHash, settling]);

  const remainMs = expiresAt ? new Date(expiresAt).getTime() - nowTick : 0;
  const remainLabel = mode === "invoice" ? formatRemain(remainMs) : "";

  const screenMode: ArcadeScreenMode = useMemo(() => {
    if (mode === "invoice" || mode === "playing" || mode === "result") return mode;
    return credits > 0 ? "ready" : "attract";
  }, [mode, credits]);

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
      const response = await payFetch("/api/arcade/invoice", {
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

  const play = useCallback(async () => {
    if (mode === "invoice" || mode === "playing" || startLock.current) return;
    const next = sanitizeAlias(alias);
    if (!next.ok) {
      setError("SET CALLSIGN FIRST · 2–16 CHARS");
      return;
    }
    if (credits < 1) {
      setError(`INSERT ${ARCADE_PRICE_SATS} SATS FOR ${ARCADE_CREDITS_PER_PAY} CREDITS`);
      return;
    }
    setError(null);
    setAlias(next.alias);
    startLock.current = true;
    try {
      const response = await fetch("/api/arcade/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, game: ARCADE_GAME_ID }),
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
      setLastScore(null);
      setMode("playing");
      void loadBoards();
    } catch {
      setError("cabinet jammed. try again");
    } finally {
      startLock.current = false;
    }
  }, [alias, credits, loadBoards, mode, playerId]);

  const handleWipeout = useCallback(
    async (score: number) => {
      setLastScore(score);
      setScoreCopied(false);
      setMode("result");
      try {
        await fetch("/api/arcade/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId,
            playId: playIdRef.current ?? playId,
            score,
            game: ARCADE_GAME_ID,
          }),
        });
        await loadBoards();
      } catch {
        // play is already on LAST 10; score retry is not worth blocking the cabinet
      }
    },
    [loadBoards, playId, playerId],
  );

  function hop() {
    gameRef.current?.hop();
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!front) return;
      if (event.code !== "Space" && event.code !== "ArrowUp") return;
      if (mode === "playing" || mode === "invoice") return;
      if (event.target instanceof HTMLInputElement) return;
      if (document.body.dataset.arcadeFocus === "retro") return;
      event.preventDefault();
      if (credits > 0) void play();
      else void requestInvoice();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [credits, front, mode, play]);

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

  const scoreRank = useMemo(() => {
    if (lastScore == null) return null;
    const parsed = sanitizeAlias(alias);
    const tag = parsed.ok ? parsed.alias : alias.trim().toUpperCase();
    const hit = highScores.find(
      (row) => row.alias === tag && row.score === lastScore,
    );
    if (hit) return hit.rank;
    const tenth = highScores[9]?.score ?? 0;
    if (highScores.length < 10 || lastScore >= tenth) {
      return highScores.filter((row) => row.score > lastScore).length + 1;
    }
    return null;
  }, [alias, highScores, lastScore]);

  async function copyScore() {
    if (lastScore == null) return;
    const parsed = sanitizeAlias(alias);
    const tag = parsed.ok ? parsed.alias : alias.trim().toUpperCase() || "PLAYER";
    const text = arcadeScoreSnippet(tag, lastScore);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ text });
        setScoreCopied(true);
        window.setTimeout(() => setScoreCopied(false), 1800);
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setScoreCopied(true);
      window.setTimeout(() => setScoreCopied(false), 1800);
    } catch {
      setScoreCopied(false);
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

  useEffect(() => {
    if (screenMode !== "playing" || !front) return;
    document.documentElement.dataset.arcadePlay = "wave";
    return () => {
      if (document.documentElement.dataset.arcadePlay === "wave") {
        delete document.documentElement.dataset.arcadePlay;
      }
    };
  }, [front, screenMode]);

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

  return (
    <div
      className={`arcade-bay arcade-bay-wave ${front ? "is-front" : "is-back"} ${screenMode === "playing" ? "is-playing" : ""}`}
    >
      {!front ? (
        <button
          type="button"
          className="cab-bring"
          onClick={onBringForward}
          aria-label="Bring WAVE RUNNER to the front"
        >
          WAVE RUNNER
        </button>
      ) : null}
      <ArcadeCabinet
        alias={alias}
        credits={credits}
        mode={screenMode}
        pending={pending}
        error={error}
        lastScore={lastScore}
        scoreRank={scoreRank}
        scoreCopied={scoreCopied}
        gameRef={gameRef}
        onAlias={setAlias}
        onInsert={() => void requestInvoice()}
        onPlay={() => void play()}
        onHop={hop}
        onWipeout={(score) => void handleWipeout(score)}
        onCopyScore={() => void copyScore()}
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
