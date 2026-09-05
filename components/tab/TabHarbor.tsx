"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArcadeInvoice } from "@/components/arcade/ArcadeInvoice";
import { payFetch } from "@/lib/pay-fetch";
import { useSettleHandoff } from "@/components/pay/SettleRitual";
import { useCheckNow } from "@/components/pay/useWebLn";
import { ConsoleShell } from "@/components/layout/ConsoleShell";
import { TabTalk } from "@/components/tab/TabTalk";
import {
  loadBarTree,
  type BarNode,
  type BarTree,
} from "@/lib/bar-tree";
import { formatTimeAgo } from "@/lib/arcade";
import {
  TAB_CREDITS_PER_PAY,
  TAB_PRICE_SATS,
  TAB_STORAGE_KEY,
  formatTabCredits,
  isPlayerId,
  sanitizeAlias,
  type TabHighScore,
  type TabRecent,
} from "@/lib/tab";

type SessionCache = { playerId: string; alias: string };
type Mode = "idle" | "invoice" | "sitting";
type DeckTab = "sit" | "ledger" | "how";

const FACE_SRC: Record<NonNullable<BarNode["face"]>, string> = {
  idle: "/tab/art/barkeep-idle.jpg",
  squint: "/tab/art/barkeep-squint.jpg",
  grin: "/tab/art/barkeep-grin.jpg",
};

export function TabHarbor({ initialTree }: { initialTree: BarTree | null }) {
  const { settling, beginSettle, finishSettle } = useSettleHandoff();
  const { bind: bindCheck, kick: kickCheck } = useCheckNow();
  const [playerId, setPlayerId] = useState("");
  const [alias, setAlias] = useState("");
  const [credits, setCredits] = useState(0);
  const [tree, setTree] = useState<BarTree | null>(initialTree);
  const [treeError, setTreeError] = useState(!initialTree);
  const [node, setNode] = useState<BarNode | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [flags, setFlags] = useState<string[]>([]);
  const [highScores, setHighScores] = useState<TabHighScore[]>([]);
  const [lastPlayers, setLastPlayers] = useState<TabRecent[]>([]);
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
  const [tab, setTab] = useState<DeckTab>("sit");
  const playIdRef = useRef<string | null>(null);
  const startLock = useRef(false);

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
      if (next) {
        setTree(next);
        setTreeError(false);
        return;
      }
      if (!initialTree) setTreeError(true);
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
  }, [alias, playerId, ready]);

  const loadBoards = useCallback(async () => {
    const response = await fetch("/api/tab", { cache: "no-store" });
    const data = (await response.json()) as {
      highScores?: TabHighScore[];
      lastPlayers?: TabRecent[];
    };
    if (Array.isArray(data.highScores)) setHighScores(data.highScores);
    if (Array.isArray(data.lastPlayers)) setLastPlayers(data.lastPlayers);
  }, []);

  const loadSession = useCallback(async (id: string) => {
    const response = await fetch(
      `/api/tab/session?playerId=${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
    const data = (await response.json()) as {
      credits?: number;
      alias?: string;
    };
    if (typeof data.credits === "number") setCredits(data.credits);
    if (data.alias) setAlias((current) => current || data.alias || "");
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
  }, [loadBoards, loadSession, playerId]);

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
  }, [expiresAt, mode, nowTick]);

  useEffect(() => {
    if (mode !== "invoice" || !paymentHash || expired || settling) return;
    let cancelled = false;
    setWaiting(true);

    async function poll() {
      try {
        const response = await payFetch(
          `/api/tab/check?hash=${encodeURIComponent(paymentHash)}`,
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
            setMode("idle");
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
  const aliasOk = sanitizeAlias(alias).ok;
  const face = node?.face ?? "idle";
  const portrait = FACE_SRC[face] ?? FACE_SRC.idle;
  const actClosed = mode === "sitting" && node?.ending === "sent";

  async function requestInvoice() {
    if (treeError || !tree) {
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
      const response = await payFetch("/api/tab/invoice", {
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
        setMode("idle");
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
      setMode("idle");
    } finally {
      setPending(false);
    }
  }

  const sit = useCallback(async () => {
    if (mode === "invoice" || startLock.current) return;
    if (mode === "sitting" && node && node.ending !== "sent") return;
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
        `INSERT ${TAB_PRICE_SATS} SATS FOR ${TAB_CREDITS_PER_PAY} CREDITS`,
      );
      return;
    }
    setError(null);
    setAlias(next.alias);
    startLock.current = true;
    try {
      const response = await fetch("/api/tab/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const data = (await response.json()) as {
        error?: string;
        credits?: number;
        playId?: string;
      };
      if (!response.ok) {
        setError(data.error || "stool jammed");
        return;
      }
      if (typeof data.credits === "number") setCredits(data.credits);
      playIdRef.current = data.playId ?? null;
      setFlags(start.setFlags ?? []);
      setNode(start);
      setMode("sitting");
    } catch {
      setError("stool jammed. try again");
    } finally {
      startLock.current = false;
    }
  }, [alias, credits, mode, node, playerId, tree]);

  const choose = useCallback(
    (nextId: string) => {
      if (!tree || mode !== "sitting") return;
      const next = tree.nodes[nextId];
      if (!next) return;
      if (next.setFlags.length) {
        setFlags((current) => {
          const merged = new Set(current);
          for (const flag of next.setFlags) merged.add(flag);
          return [...merged];
        });
      }
      setNode(next);
    },
    [mode, tree],
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
    setMode("idle");
    setPaymentHash("");
    setPaymentRequest("");
    setQrSrc("");
    setWaiting(false);
    setExpired(false);
    setInvoiceError(null);
    setPending(false);
  }

  const showInvoice = mode === "invoice" || pending || settling;

  return (
    <div className="tab-page">
      <ConsoleShell
        name="tab"
        className="tab-console"
        deckLabel="Tab"
        strip={
          <p>
            the tab · {TAB_PRICE_SATS} sats · one sitting
          </p>
        }
        stage={
          <>
            <div className="tab-stage-night" aria-hidden="true">
              <Image
                src="/tab/art/tab-night.jpg"
                alt=""
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 65vw"
                className="tab-night-img"
              />
              <div className="tab-vignette" />
            </div>
            <figure className={`tab-keep is-${face}`}>
              <Image
                src={portrait}
                alt=""
                width={784}
                height={1168}
                className="tab-keep-img"
                priority
              />
            </figure>
          </>
        }
        tabs={[
          { id: "sit", label: "SIT" },
          { id: "ledger", label: "LEDGER" },
          { id: "how", label: "HOW" },
        ]}
        tab={tab}
        onTab={(id) => setTab(id as DeckTab)}
      >
        {tab === "sit" ? (
          <section
            className="tab-glass"
            aria-label="THE TAB"
            data-flags={flags.join(" ")}
          >
            {treeError ? (
              <p className="tab-tree-error">TREE MISSING · CANNOT SIT</p>
            ) : !tree ? (
              <p className="tab-tree-error">sounding the harbor…</p>
            ) : (
              <>
                <header className="tab-glass-head">
                  <p className="tab-kicker">harbor · international waters</p>
                  <h1>{tree.title}</h1>
                  <p className="tab-sub">{tree.subtitle}</p>
                </header>

                {mode === "sitting" && node ? (
                  <TabTalk
                    key={node.id}
                    node={node}
                    tree={tree}
                    onChoose={choose}
                  />
                ) : (
                  <p className="tab-invite">One credit. One stool.</p>
                )}

                <div className="tab-coin">
                  <label className="tab-alias">
                    <span>CALLSIGN · 2–16</span>
                    <input
                      value={alias}
                      maxLength={16}
                      onChange={(event) => setAlias(event.target.value)}
                      placeholder="YOUR ALIAS"
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      disabled={
                        (mode === "sitting" && !actClosed) || mode === "invoice"
                      }
                    />
                  </label>
                  <div className="tab-coin-row">
                    {credits > 0 && aliasOk && (mode !== "sitting" || actClosed) ? (
                      <button
                        type="button"
                        className="tab-sit"
                        onClick={() => void sit()}
                      >
                        {actClosed ? "SIT AGAIN" : "SIT"}
                        <span>1 CREDIT</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="tab-insert"
                        disabled={
                          !aliasOk ||
                          pending ||
                          (mode === "sitting" && !actClosed) ||
                          treeError
                        }
                        onClick={() => void requestInvoice()}
                      >
                        {pending
                          ? "BUILDING INVOICE…"
                          : `INSERT ${TAB_PRICE_SATS} SATS`}
                        <span>
                          {TAB_CREDITS_PER_PAY} CREDITS · ISOLATED POOL
                        </span>
                      </button>
                    )}
                    <div className="tab-led">
                      <p>CREDITS</p>
                      <p>{formatTabCredits(credits)}</p>
                    </div>
                  </div>
                  {error ? <p className="tab-error">{error}</p> : null}
                </div>
              </>
            )}
          </section>
        ) : null}

        {tab === "ledger" ? (
          <div className="tab-boards">
            <section>
              <h2>TAB LEGENDS</h2>
              <ol>
                {highScores.length ? (
                  highScores.map((row) => (
                    <li key={`${row.alias}-${row.createdAt}-${row.rank}`}>
                      <span>{row.alias}</span>
                      <span>
                        {tree?.endings[row.game?.replace(/^tab-/, "") ?? ""]
                          ?.title ?? row.game}
                      </span>
                      <b>{row.score}</b>
                    </li>
                  ))
                ) : (
                  <li className="is-empty">NO LEGENDS YET</li>
                )}
              </ol>
            </section>
            <section>
              <h2>LAST 10</h2>
              <ol>
                {lastPlayers.length ? (
                  lastPlayers.map((row, index) => (
                    <li key={`${row.alias}-${row.createdAt}-${index}`}>
                      <span>{row.alias}</span>
                      <span>{row.sats} SATS</span>
                      <b>{formatTimeAgo(row.createdAt, nowTick)}</b>
                    </li>
                  ))
                ) : (
                  <li className="is-empty">NO COINS YET</li>
                )}
              </ol>
            </section>
          </div>
        ) : null}

        {tab === "how" ? (
          <div className="tab-how">
            <p>One credit. One stool. Isolated pool. No KYC.</p>
            <p>
              INSERT {TAB_PRICE_SATS} sats for {TAB_CREDITS_PER_PAY} credits.
              SIT spends one.
            </p>
            <p>We don&apos;t HODL. Talk until the ash falls.</p>
          </div>
        ) : null}
      </ConsoleShell>

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
          memo={`${TAB_CREDITS_PER_PAY} credits · isolated pool · THE TAB`}
          titleId="tab-pay-title"
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
  if (ms <= 0) return "expired";
  const total = Math.ceil(ms / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")} left`;
}
