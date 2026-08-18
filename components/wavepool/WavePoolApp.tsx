"use client";

import { useEffect, useMemo, useState } from "react";
import { TimechainStats } from "@/components/timechain/TimechainStats";
import { useTimechainSnapshot } from "@/components/timechain/useTimechainSnapshot";
import { WaveVisual } from "@/components/wavepool/WaveVisual";
import { ZapPanel } from "@/components/wavepool/ZapPanel";
import { formatInteger } from "@/lib/timechain";
import type { TimechainSnapshot } from "@/lib/timechain";
import {
  type WaveZap,
  WAVE_POOL_GOAL_SATS,
  WAVE_POOL_SEED_SATS,
  WAVE_POOL_STORAGE_KEY,
  isPoolComplete,
  remainingSats,
  seedZaps,
} from "@/lib/wavepool";

type StoredPool = {
  extraSats: number;
  zaps: WaveZap[];
  cycles: number;
};

export function WavePoolApp({
  initialSnapshot,
}: {
  initialSnapshot: TimechainSnapshot;
}) {
  const { snapshot } = useTimechainSnapshot(initialSnapshot);
  const [extraSats, setExtraSats] = useState(0);
  const [zaps, setZaps] = useState<WaveZap[]>(seedZaps);
  const [cycles, setCycles] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WAVE_POOL_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as StoredPool;
        setExtraSats(stored.extraSats ?? 0);
        setZaps(stored.zaps?.length ? stored.zaps : seedZaps);
        setCycles(stored.cycles ?? 0);
      }
    } catch {
      // ignore bad local state
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const payload: StoredPool = { extraSats, zaps, cycles };
    window.localStorage.setItem(WAVE_POOL_STORAGE_KEY, JSON.stringify(payload));
  }, [extraSats, zaps, cycles, ready]);

  const total = WAVE_POOL_SEED_SATS + extraSats;
  const complete = isPoolComplete(total);
  const left = remainingSats(total);

  const recent = useMemo(
    () => [...zaps].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6),
    [zaps],
  );

  function applyZap(sats: number) {
    const zap: WaveZap = {
      id: `local-${Date.now()}`,
      sats,
      handle: "you",
      at: new Date().toISOString(),
    };
    setExtraSats((value) => value + sats);
    setZaps((list) => [zap, ...list]);
  }

  function resetPool() {
    setExtraSats(0);
    setZaps(seedZaps);
    setCycles((value) => value + 1);
  }

  return (
    <div className="space-y-8">
      <WaveVisual
        total={total}
        direction={snapshot.priceDirection}
        complete={complete}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Meter label="pool" value={`${formatInteger(total)} sats`} />
        <Meter
          label="to_threshold"
          value={complete ? "unlocked" : `${formatInteger(left)} sats`}
        />
        <Meter label="goal" value={`${formatInteger(WAVE_POOL_GOAL_SATS)}`} />
      </div>

      {complete ? (
        <section className="border border-sats bg-sats/15 p-6 shadow-[6px_6px_0_var(--color-magenta)] sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sats">
            wave_complete
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            The set is unlocked.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            {WAVE_POOL_GOAL_SATS} sats in the pool. Reward TBD — for now this is
            the celebration. Paddle back out and start the next one.
          </p>
          <button type="button" onClick={resetPool} className="btn mt-6">
            paddle back out
          </button>
          {cycles > 0 ? (
            <p className="mt-4 font-mono text-[11px] uppercase text-muted">
              sets ridden: {cycles}
            </p>
          ) : null}
        </section>
      ) : null}

      <TimechainStats initial={initialSnapshot} variant="compact" />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <ZapPanel complete={complete} onZap={applyZap} />

        <section>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
            {"//"} recent_energy
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight">
            Last zaps
          </h2>
          <ol className="panel mt-4 divide-y divide-cyan/15">
            {recent.map((zap) => (
              <li
                key={zap.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{zap.handle}</p>
                  <p className="font-mono text-[11px] uppercase text-muted">
                    {new Date(zap.at).toLocaleString()}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-sm text-sats">
                  +{zap.sats}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-display text-xl font-bold uppercase tracking-tight">
        {value}
      </p>
    </div>
  );
}
