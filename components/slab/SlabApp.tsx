"use client";

import { useCallback, useEffect, useState } from "react";
import { SlabCanvas } from "@/components/slab/SlabCanvas";
import { SlabDeck } from "@/components/slab/SlabDeck";
import { SlabHow } from "@/components/slab/SlabHow";
import {
  SLAB_COPY,
  SLAB_STORAGE_KEY,
  cellKey,
  type SlabCell,
  type SlabCoat,
  type SlabColor,
  type SlabPixel,
  type SlabStain,
} from "@/lib/slab";

type BoardCache = {
  cells: SlabCell[];
  stains: SlabStain[];
  height: number;
};

export function SlabApp() {
  const [live, setLive] = useState<SlabCell[]>([]);
  const [stains, setStains] = useState<SlabStain[]>([]);
  const [height, setHeight] = useState(0);
  const [selected, setSelected] = useState<SlabPixel[]>([]);
  const [coat, setCoat] = useState<SlabCoat>("swell");
  const [color, setColor] = useState<SlabColor>("hope");
  const [wetKeys, setWetKeys] = useState<Set<string>>(new Set());
  const [howOpen, setHowOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SLAB_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as BoardCache;
        if (Array.isArray(stored.cells)) setLive(stored.cells);
        if (Array.isArray(stored.stains)) setStains(stored.stains);
        if (Number.isFinite(stored.height)) setHeight(stored.height);
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(
        SLAB_STORAGE_KEY,
        JSON.stringify({ cells: live, stains, height }),
      );
    } catch {
      // ignore
    }
  }, [height, live, ready, stains]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/slab", { cache: "no-store" });
        const data = (await response.json()) as BoardCache & { error?: string };
        if (cancelled) return;
        if (!response.ok) return;
        if (Array.isArray(data.cells)) setLive(data.cells);
        if (Array.isArray(data.stains)) setStains(data.stains);
        if (Number.isFinite(data.height)) setHeight(data.height);
      } catch {
        // keep last
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const onPaid = useCallback(
    (input: {
      cells: SlabCell[];
      stains: SlabStain[];
      painted: SlabCell[];
      height: number;
    }) => {
      setLive(input.cells);
      setStains(input.stains);
      setHeight(input.height);
      setSelected([]);
      const keys = new Set(input.painted.map((cell) => cellKey(cell.x, cell.y)));
      setWetKeys(keys);
      window.setTimeout(() => {
        setWetKeys((current) => {
          if (current !== keys) return current;
          return new Set();
        });
      }, 980);
    },
    [],
  );

  return (
    <div className="slab-page">
      <p className="slab-strip">
        {SLAB_COPY.title} · {SLAB_COPY.clock}
      </p>
      <div className="slab-bleed">
        <SlabCanvas
          live={live}
          stains={stains}
          height={height}
          selected={selected}
          coat={coat}
          color={color}
          wetKeys={wetKeys}
          onSelect={setSelected}
        />
        <div className="slab-hotbar">
          <SlabDeck
            coat={coat}
            color={color}
            selected={selected}
            onCoat={setCoat}
            onColor={setColor}
            onPaid={onPaid}
            onClear={() => setSelected([])}
            onHow={() => setHowOpen((value) => !value)}
            howOpen={howOpen}
          />
        </div>
        {howOpen ? (
          <div className="slab-how-card">
            <SlabHow />
          </div>
        ) : null}
      </div>
    </div>
  );
}
