"use client";

import { useEffect, useRef, useState } from "react";
import { LineupVisual } from "@/components/lineup/LineupVisual";
import { useLineupSnapshot } from "@/components/lineup/useLineupSnapshot";
import { formatInteger, formatBlockAge } from "@/lib/timechain";
import { formatVsize, hasLineupData, type LineupSnapshot } from "@/lib/lineup";

export function LineupApp({ initial }: { initial: LineupSnapshot }) {
  const { snapshot, status } = useLineupSnapshot(initial);
  const [now, setNow] = useState(() => Date.now());
  const [catching, setCatching] = useState(false);
  const prevHeight = useRef<number | null>(initial.blockHeight);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const height = snapshot.blockHeight;
    if (height === null) return;
    if (prevHeight.current !== null && height > prevHeight.current) {
      setCatching(true);
      const timeout = window.setTimeout(() => setCatching(false), 2200);
      prevHeight.current = height;
      return () => window.clearTimeout(timeout);
    }
    prevHeight.current = height;
  }, [snapshot.blockHeight]);

  const live = hasLineupData(snapshot);
  const age =
    snapshot.lastBlockTimestamp !== null
      ? formatBlockAge(now / 1000 - snapshot.lastBlockTimestamp)
      : "—";

  return (
    <div className="space-y-8">
      {status === "error" && !live ? (
        <div className="border border-magenta/40 bg-black px-4 py-16 text-center font-mono text-sm text-muted">
          lineup fogged in · mempool.space silent.
        </div>
      ) : status === "loading" && !live ? (
        <div className="border border-cyan/30 bg-black px-4 py-16 text-center">
          <p className="flicker font-display text-2xl font-bold uppercase text-cyan">
            Paddling out
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            reading the pack · sampling live txs
          </p>
        </div>
      ) : (
        <LineupVisual snapshot={snapshot} catching={catching} />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="height"
          value={
            snapshot.blockHeight !== null
              ? formatInteger(snapshot.blockHeight)
              : "—"
          }
        />
        <Stat label="last_set" value={age} hint={catching ? "just fired" : undefined} />
        <Stat
          label="in_the_water"
          value={
            snapshot.mempoolCount !== null
              ? formatInteger(snapshot.mempoolCount)
              : "—"
          }
          hint={
            snapshot.mempoolVsize !== null
              ? formatVsize(snapshot.mempoolVsize)
              : undefined
          }
        />
        <Stat
          label="takeoff"
          value={
            snapshot.fastestFee !== null ? `${snapshot.fastestFee} sat/vB` : "—"
          }
          hint={snapshot.feeLabel ?? undefined}
        />
      </div>

      {snapshot.sets.length > 0 ? (
        <ol className="panel divide-y divide-cyan/15 overflow-hidden">
          {snapshot.sets.map((set) => (
            <li
              key={set.index}
              className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan">
                {set.index === 0 ? "next_set" : `set_${String(set.index + 1).padStart(2, "0")}`}
              </span>
              <span className="text-sm text-foreground">
                {formatInteger(set.nTx)} waiting
              </span>
              <span className="font-mono text-xs text-sats">
                ~{set.medianFee.toFixed(1)} sat/vB
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <section className="panel p-5 sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
          {"//"} legend
        </p>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
          <li>
            <span className="text-sats">Peak / takeoff</span> — highest fees,
            first into the next block.
          </li>
          <li>
            <span className="text-cyan">The lineup</span> — unconfirmed txs
            waiting on a set. Position is fee rate.
          </li>
          <li>
            <span className="text-magenta">Outside</span> — cheap sats. They
            miss this wave unless the pack thins.
          </li>
          <li>
            <span className="text-foreground">Catch</span> — a block lands,
            the peak drops in and disappears into the face.
          </li>
          <li>
            <span className="text-cyan">Inspect</span> — hover or tap a bright
            body. Click again to open the tx on mempool.space. Dim dots are
            atmosphere, not individual txs.
          </li>
        </ul>
        <a
          href="https://mempool.space/"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex font-mono text-xs uppercase tracking-[0.14em] text-sats glitch-hover hover:text-cyan"
        >
          raw mempool.space -&gt;
        </a>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="panel p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-display text-xl font-bold uppercase tracking-tight">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-cyan">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
