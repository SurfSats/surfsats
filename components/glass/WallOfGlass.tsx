"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";
import type { CallsignEtch } from "@/lib/callsign";
import { useGlass } from "@/lib/useGlass";

function formatWhen(iso: string) {
  const parsed = new Date(iso).getTime();
  if (!Number.isFinite(parsed)) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function WallOfGlass() {
  const { glass, wipeGlass } = useGlass();
  const [etches, setEtches] = useState<CallsignEtch[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/callsign", { cache: "no-store" });
        const data = (await response.json()) as {
          etches?: CallsignEtch[];
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error || "glass unavailable");
          return;
        }
        setEtches(Array.isArray(data.etches) ? data.etches : []);
        setError(null);
      } catch {
        if (!cancelled) setError("glass unavailable");
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="glass-wall">
      <div className="glass-wall-bg" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/harbor.jpg" alt="" />
        <div className="glass-wall-scrim" />
      </div>
      <Container className="relative max-w-3xl py-10 sm:py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan">
          {"//"} wall of glass
        </p>
        <h1 className="mt-3 font-mono text-3xl font-bold uppercase tracking-tight text-[#efe6d4] sm:text-4xl">
          Wall of Glass
        </h1>
        <p className="mt-4 max-w-xl font-mono text-sm leading-relaxed text-stone-300">
          21 sats burns a callsign onto this pane. No accounts. Names are not
          owned. Two browsers can both be HOPE. One row.
        </p>

        <section className="glass-plaque mt-10">
          <p className="glass-plaque-kicker">harbor plaque · first burn stays</p>
          {error ? <p className="glass-wall-error">{error}</p> : null}
          {etches.length === 0 && !error ? (
            <p className="glass-wall-empty">
              nothing on the glass yet. etch a callsign with 21 sats.
            </p>
          ) : (
            <ol className="glass-wall-list">
              {etches.map((etch) => (
                <li key={etch.callsign}>
                  <Link href={`/glass/${encodeURIComponent(etch.callsign)}`}>
                    <span className="glass-wall-name">{etch.callsign}</span>
                    <span className="glass-wall-meta">
                      {etch.firstMachine}
                      {etch.blockHeight != null ? ` · #${etch.blockHeight}` : ""}
                      {` · ${formatWhen(etch.createdAt)}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="mt-10 border border-white/10 bg-black/50 p-4 sm:p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-400">
            this browser
          </p>
          <p className="mt-2 font-mono text-sm uppercase tracking-[0.12em] text-[#efe6d4]">
            {glass?.callsign
              ? glass.etched
                ? `${glass.callsign} · on the glass`
                : `${glass.callsign} · not etched`
              : "callsign —"}
          </p>
          <button
            type="button"
            className="glass-wipe"
            onClick={() => wipeGlass()}
          >
            Wipe glass
          </button>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-stone-500">
            clears this browser only. the wall stays.
          </p>
        </section>
      </Container>
    </div>
  );
}
