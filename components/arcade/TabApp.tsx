"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArcadeBoards } from "@/components/arcade/ArcadeBoards";
import { ArcadeInvoice } from "@/components/arcade/ArcadeInvoice";
import { useSettleHandoff } from "@/components/pay/SettleRitual";
import { TabCabinet } from "@/components/arcade/TabCabinet";
import type { ArcadeScreenMode } from "@/components/arcade/ArcadeScreen";
import {
  ARCADE_CREDITS_PER_PAY,
  ARCADE_MACHINE_TAB,
  ARCADE_PRICE_SATS,
  TAB_GAME_ID,
  TAB_STORAGE_KEY,
  isPlayerId,
  sanitizeAlias,
  tabEndingGame,
  tabEndingLabel,
  type ArcadeHighScore,
  type ArcadeRecentPlay,
} from "@/lib/arcade";
import {
  loadBarTree,
  nodeEnding,
  type BarEnding,
  type BarNode,
  type BarTree,
} from "@/lib/bar-tree";

type SessionCache = {
  playerId: string;
  alias: string;
};

export function TabApp({
  front = true,
  onBringForward,
}: {
  front?: boolean;
  onBringForward?: () => void;
}) {
  const { settling, beginSettle, finishSettle } = useSettleHandoff();
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
  const [playId, setPlayId] = useState<string | null>(null);
  const [tree, setTree] = useState<BarTree | null>(null);
  const [node, setNode] = useState<BarNode | null>(null);
  const [lastEnding, setLastEnding] = useState<BarEnding | null>(null);
  const startLock = useRef(false);
  const playIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cached: SessionCache | null = null;
    try {
      const raw = window.localStorage.getItem(TAB_STORAGE_KEY);
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
    let cancelled = false;
    void loadBarTree().then((next) => {
      if (cancelled) return;
      setTree(next);
      if (!next) setError("TREE MISSING · CANNOT SIT");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !playerId) return;
    try {
      window.localStorage.setItem(
        TAB_STORAGE_KEY,
        JSON.stringify({ playerId, alias } satisfies SessionCache),
      );
    } catch {
      // ignore
    }
  }, [playerId, alias, ready]);

  const loadBoards = useCallback(async () => {
    const response = await fetch("/api/arcade?machine=tab", {
      cache: "no-store",
    });
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
    if (!front || (mode !== "playing" && mode !== "invoice")) return;
    document.body.dataset.arcadeFocus = "tab";
    return () => {
      if (document.body.dataset.arcadeFocus === "tab") {
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

    void poll();
    const id = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [beginSettle, expired, loadBoards, mode, paymentHash, settling]);

  const remainMs = expiresAt ? new Date(expiresAt).getTime() - nowTick : 0;
  const remainLabel = mode === "invoice" ? formatRemain(remainMs) : "";

  const screenMode: ArcadeScreenMode = useMemo(() => {
    if (mode === "invoice" || mode === "playing" || mode === "result") return mode;
    return credits > 0 ? "ready" : "attract";
  }, [mode, credits]);

  async function requestInvoice() {
    if (!tree) {
      setError("TREE MISSING · CANNOT SIT");
      return;
    }
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
        body: JSON.stringify({
          playerId,
          alias: next.alias,
          machine: ARCADE_MACHINE_TAB,
          game: TAB_GAME_ID,
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

  const sit = useCallback(async () => {
    if (mode === "invoice" || mode === "playing" || startLock.current) return;
    if (!tree) {
      setError("TREE MISSING · CANNOT SIT");
      return;
    }
    const start = tree.nodes[tree.start];
    if (!start) {
      setError("TREE MISSING · CANNOT SIT");
      return;
    }
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
        body: JSON.stringify({ playerId, game: TAB_GAME_ID }),
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
      setLastEnding(null);
      setNode(start);
      setMode("playing");
    } catch {
      setError("cabinet jammed. try again");
    } finally {
      startLock.current = false;
    }
  }, [alias, credits, mode, playerId, tree]);

  const choose = useCallback(
    async (nextId: string) => {
      if (!tree || mode !== "playing") return;
      const next = tree.nodes[nextId];
      if (!next) return;
      setNode(next);
      const ending = nodeEnding(tree, next);
      if (!ending) return;
      setLastEnding(ending);
      setMode("result");
      const game = tabEndingGame(ending.id);
      if (!game) return;
      try {
        await fetch("/api/arcade/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId,
            playId: playIdRef.current ?? playId,
            score: ending.score,
            game,
          }),
        });
        await loadBoards();
      } catch {
        // sitting already spent the credit
      }
    },
    [loadBoards, mode, playId, playerId, tree],
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

  const scoreRank = useMemo(() => {
    if (!lastEnding) return null;
    const parsed = sanitizeAlias(alias);
    const tag = parsed.ok ? parsed.alias : alias.trim().toUpperCase();
    const game = tabEndingGame(lastEnding.id);
    const hit = highScores.find(
      (row) =>
        row.alias === tag &&
        row.score === lastEnding.score &&
        (!row.game || !game || row.game === game),
    );
    if (hit) return hit.rank;
    const tenth = highScores[9]?.score ?? 0;
    if (highScores.length < 10 || lastEnding.score >= tenth) {
      return highScores.filter((row) => row.score > lastEnding.score).length + 1;
    }
    return null;
  }, [alias, highScores, lastEnding]);

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
    <div className={`arcade-bay arcade-bay-tab ${front ? "is-front" : "is-back"}`}>
      {!front ? (
        <button
          type="button"
          className="cab-bring"
          onClick={onBringForward}
          aria-label="Bring THE TAB to the front"
        >
          THE TAB
        </button>
      ) : null}
      <TabCabinet
        alias={alias}
        credits={credits}
        mode={screenMode}
        pending={pending}
        error={error}
        tree={tree}
        node={node}
        lastEnding={lastEnding}
        scoreRank={scoreRank}
        onAlias={setAlias}
        onInsert={() => void requestInvoice()}
        onSit={() => void sit()}
        onChoose={(next) => void choose(next)}
      />
      {front ? (
        <ArcadeBoards
          highScores={highScores}
          lastPlayers={lastPlayers}
          now={nowTick}
          title="TAB LEGENDS"
          recentTitle="LAST 10 TAB"
          showGame
          gameName={(id) => {
            const key = id?.replace(/^tab-/, "") ?? "";
            return tree?.endings[key]?.title ?? tabEndingLabel(id);
          }}
        />
      ) : null}
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
          memo={`${ARCADE_CREDITS_PER_PAY} credits · THE TAB · SurfSats Arcade`}
          titleId="arcade-pay-title-tab"
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
  if (ms <= 0) return "expired";
  const total = Math.ceil(ms / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")} left`;
}
