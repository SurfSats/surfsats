"use client";

import { SimplePool } from "nostr-tools";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrutalistButton } from "@/components/ui/BrutalistButton";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { useOfferZap } from "@/components/pay/useOfferZap";
import { cn } from "@/lib/cn";
import { HYDROGRAPHIC_RELAYS, truncatePubkey } from "@/lib/nostr-hud";
import {
  createEphemeralSecret,
  loadEphemeralSecret,
  pubkeyFromSecret,
  signKind1,
} from "@/lib/nostr-signer";
import {
  ZAP_THREADS_ZAP_SATS,
  applyZapToNotes,
  noteMatchesAnchor,
  parseProfileLud16,
  prependThreadNote,
  toThreadNote,
  type ZapThreadNote,
  type ZapThreadSource,
} from "@/lib/zap-threads";

type ZapThreadsFeedProps = {
  anchorTag: string;
  className?: string;
};

export function ZapThreadsFeed({ anchorTag, className }: ZapThreadsFeedProps) {
  const [notes, setNotes] = useState<ZapThreadNote[]>([]);
  const [draft, setDraft] = useState("");
  const [identity, setIdentity] = useState<"nip07" | "ephemeral" | "none">("none");
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lud16Ref = useRef(new Map<string, string | null>());
  const poolRef = useRef<SimplePool | null>(null);
  const zapTargetRef = useRef<string | null>(null);

  const { offer, modal } = useOfferZap({
    amountSats: ZAP_THREADS_ZAP_SATS,
    onPreimage: () => {
      zapTargetRef.current = null;
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.nostr?.getPublicKey) {
      void window.nostr.getPublicKey().then((key) => {
        setIdentity("nip07");
        setPubkey(key);
      }).catch(() => {
        const secret = loadEphemeralSecret();
        if (secret) {
          setIdentity("ephemeral");
          setPubkey(pubkeyFromSecret(secret));
        }
      });
      return;
    }
    const secret = loadEphemeralSecret();
    if (secret) {
      setIdentity("ephemeral");
      setPubkey(pubkeyFromSecret(secret));
    }
  }, []);

  useEffect(() => {
    const pool = new SimplePool({ enableReconnect: true, enablePing: true });
    pool.idleTimeout = 0;
    pool.maxWaitForConnection = 8000;
    poolRef.current = pool;
    const relays = [...HYDROGRAPHIC_RELAYS];

    const ingest = (raw: ZapThreadSource) => {
      if (raw.kind === 1 && noteMatchesAnchor(raw.tags, anchorTag)) {
        const mapped = toThreadNote(raw);
        if (mapped) {
          setNotes((prev) => prependThreadNote(prev, mapped));
        }
      }
      if (raw.kind === 9735) {
        setNotes((prev) => applyZapToNotes(prev, raw));
      }
    };

    const noteT = pool.subscribeMany(
      relays,
      { kinds: [1], "#t": [anchorTag], limit: 40 },
      { onevent: (event) => ingest(event as ZapThreadSource) },
    );
    const noteR = pool.subscribeMany(
      relays,
      { kinds: [1], "#r": [anchorTag], limit: 40 },
      { onevent: (event) => ingest(event as ZapThreadSource) },
    );
    const zaps = pool.subscribeMany(
      relays,
      { kinds: [9735], limit: 40 },
      { onevent: (event) => ingest(event as ZapThreadSource) },
    );

    return () => {
      noteT.close();
      noteR.close();
      zaps.close();
      pool.destroy();
      poolRef.current = null;
    };
  }, [anchorTag]);

  const connectIdentity = useCallback(() => {
    const secret = createEphemeralSecret();
    setIdentity("ephemeral");
    setPubkey(pubkeyFromSecret(secret));
  }, []);

  const publish = useCallback(async () => {
    const content = draft.trim();
    if (!content) return;
    setBusy(true);
    setError(null);
    try {
      const signed = await signKind1({
        content,
        tags: [
          ["t", anchorTag],
          ["r", anchorTag],
        ],
      });
      const pool = poolRef.current;
      if (!pool) throw new Error("Relay pool offline");
      await Promise.any(pool.publish([...HYDROGRAPHIC_RELAYS], signed));
      setNotes((prev) =>
        prependThreadNote(prev, {
          id: signed.id,
          pubkey: signed.pubkey,
          created_at: signed.created_at,
          content: signed.content,
          sats: 0,
        }),
      );
      setDraft("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "PUBLISH_FAILED";
      setError(message === "NO_IDENTITY" ? "CONNECT_IDENTITY" : message);
    } finally {
      setBusy(false);
    }
  }, [anchorTag, draft]);

  const zapNote = useCallback(
    async (note: ZapThreadNote) => {
      setError(null);
      zapTargetRef.current = note.id;
      try {
        let lud16 = lud16Ref.current.get(note.pubkey);
        if (lud16 === undefined) {
          const profile = await poolRef.current?.get([...HYDROGRAPHIC_RELAYS], {
            kinds: [0],
            authors: [note.pubkey],
            limit: 1,
          });
          lud16 = profile ? parseProfileLud16(profile.content) : null;
          lud16Ref.current.set(note.pubkey, lud16);
        }
        if (!lud16) {
          setError("NO_LNURL");
          return;
        }
        const response = await fetch("/api/v4v/invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountSats: ZAP_THREADS_ZAP_SATS, lud16 }),
        });
        const data = (await response.json()) as { bolt11?: string };
        if (!response.ok || !data.bolt11) {
          setError("INVOICE_FAILED");
          return;
        }
        await offer(data.bolt11);
      } catch {
        setError("ZAP_FAILED");
      }
    },
    [offer],
  );

  return (
    <TerminalCard
      title="ZAPTHREADS // RELAY_DISCUSSION"
      tag={`#${anchorTag}`}
      status="live"
      className={className}
    >
      {modal}
      <ol className="divide-y divide-zinc-raw/40 border border-zinc-raw">
        {notes.length === 0 ? (
          <li className="px-3 py-3 font-mono text-xs tracking-telemetry text-zinc-raw uppercase">
            NO_NOTES // WAITING_ON_RELAYS
          </li>
        ) : (
          notes.map((note) => (
            <li
              key={note.id}
              className="flex flex-col gap-2 px-3 py-2.5 font-mono md:flex-row md:items-start md:justify-between"
            >
              <div className="min-w-0">
                <p className="text-[10px] tracking-telemetry text-zinc-raw uppercase">
                  {truncatePubkey(note.pubkey)}
                  {note.sats > 0 ? (
                    <span className="ml-2 text-amber">{note.sats} SATS</span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-salt">{note.content}</p>
              </div>
              <BrutalistButton
                size="sm"
                variant="amber"
                className="shrink-0"
                onClick={() => {
                  void zapNote(note);
                }}
              >
                [ ZAP_21 ]
              </BrutalistButton>
            </li>
          ))
        )}
      </ol>

      <div className="mt-4 border-t border-zinc-raw pt-3">
        {identity === "none" ? (
          <BrutalistButton
            size="sm"
            variant="secondary"
            onClick={connectIdentity}
          >
            [ CONNECT_IDENTITY ]
          </BrutalistButton>
        ) : (
          <p className="mb-2 font-mono text-[10px] tracking-telemetry text-zinc-raw uppercase">
            SIGNER: {identity === "nip07" ? "NIP-07" : "EPHEMERAL"} ·{" "}
            {pubkey ? truncatePubkey(pubkey) : "--"}
          </p>
        )}
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="KIND_1 DISPATCH"
            className={cn(
              "w-full border border-zinc-raw bg-void px-3 py-2 font-mono text-xs text-salt",
              "focus:border-violet focus:outline-none",
            )}
          />
          <BrutalistButton
            size="sm"
            variant="primary"
            disabled={busy || !draft.trim() || identity === "none"}
            onClick={() => {
              void publish();
            }}
          >
            BROADCAST
          </BrutalistButton>
        </div>
        {error ? (
          <p className="mt-2 font-mono text-[10px] tracking-telemetry text-amber uppercase">
            {error}
          </p>
        ) : null}
      </div>
    </TerminalCard>
  );
}
