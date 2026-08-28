"use client";

import { useEffect, useRef } from "react";
import {
  BLOCK_CAPACITY_VSIZE,
  bandMidRate,
  type LineupSnapshot,
} from "@/lib/lineup";
import { cn } from "@/lib/cn";
import wellShader from "./well.wgsl";

type Vec4 = [number, number, number, number];

export function WellCanvas({
  snapshot,
  onGpu,
  className,
}: {
  snapshot: LineupSnapshot;
  onGpu: (ok: boolean) => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let stopLoop: (() => void) | undefined;
    let disposeGpu: (() => void) | undefined;

    async function boot() {
      if (!("gpu" in navigator) || !navigator.gpu) {
        onGpu(false);
        return;
      }

      try {
        const { clock, init, effect, frameLoop, surface } = await import("vgpu");
        if (cancelled || !canvas) return;

        const gpu = await init();
        if (cancelled) {
          gpu.dispose();
          return;
        }

        const canvasSurface = surface(gpu, canvas, {
          dpr: [1, 2],
          clearColor: [0.02, 0.022, 0.028, 1],
        });

        const zeros: Vec4 = [0, 0, 0, 0];
        const well = effect(gpu, wellShader, {
          label: "the-well",
          set: {
            params: {
              time: 0,
              pulse: 0,
              fill: 0,
              _pad: 0,
              pointer: [0.5, 0.5],
              res: [canvasSurface.size[0], canvasSurface.size[1]],
              band0: zeros,
              band1: zeros,
              band2: zeros,
              band3: zeros,
              band4: zeros,
              band5: zeros,
              band6: zeros,
              band7: zeros,
              ring0: zeros,
              ring1: zeros,
              ring2: zeros,
              ring3: zeros,
            },
          },
        });

        await well.compile(canvasSurface);
        if (cancelled) {
          gpu.dispose();
          return;
        }

        gpu.onError(() => {
          if (!cancelled) onGpu(false);
        });

        const pointer = { x: 0.5, y: 0.5 };
        const onPointer = (event: PointerEvent) => {
          const rect = canvas.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;
          pointer.x = (event.clientX - rect.left) / rect.width;
          pointer.y = (event.clientY - rect.top) / rect.height;
        };
        canvas.addEventListener("pointermove", onPointer);

        const unresize = canvasSurface.onResize(({ width, height }) => {
          well.set({ params: { res: [width, height] } });
        });

        const time = clock(gpu);
        let lastHeight = snapshotRef.current.blockHeight;
        let pulseUntil = 0;

        const loop = frameLoop(gpu, (frame) => {
          const now = time.time;
          const snap = snapshotRef.current;
          if (
            lastHeight !== null &&
            snap.blockHeight !== null &&
            snap.blockHeight > lastHeight
          ) {
            pulseUntil = now + 0.9;
          }
          lastHeight = snap.blockHeight;
          const pulse = pulseUntil > now ? (pulseUntil - now) / 0.9 : 0;
          well.set({ params: uniformsFromSnapshot(snap, now, pulse, pointer, canvasSurface.size) });
          frame.pass(canvasSurface, well);
        });

        stopLoop = () => loop.stop();
        disposeGpu = () => {
          canvas.removeEventListener("pointermove", onPointer);
          unresize();
          gpu.dispose();
        };
        onGpu(true);
      } catch {
        if (!cancelled) onGpu(false);
      }
    }

    void boot();

    return () => {
      cancelled = true;
      stopLoop?.();
      disposeGpu?.();
    };
  }, [onGpu]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("well-canvas", className)}
      aria-hidden="true"
    />
  );
}

function uniformsFromSnapshot(
  snapshot: LineupSnapshot,
  time: number,
  pulse: number,
  pointer: { x: number; y: number },
  res: readonly [number, number],
) {
  const cap = snapshot.capacityVsize || BLOCK_CAPACITY_VSIZE;
  const fill = Math.min(1.2, (snapshot.nextBlockVsize ?? 0) / cap);
  const maxV = Math.max(1, ...snapshot.bands.map((band) => band.vsize));
  const bands = Array.from({ length: 8 }, (_, i) => {
    const band = snapshot.bands[i];
    if (!band) return [0, 0, 0, 0] as Vec4;
    return [
      Math.min(1, band.count / 25000),
      band.vsize / maxV,
      bandMidRate(band),
      0,
    ] as Vec4;
  });

  const upcoming = snapshot.projected.slice(1, 5);
  const rings = Array.from({ length: 4 }, (_, i) => {
    const block = upcoming[i];
    if (!block) return [0, 0, 0, 0] as Vec4;
    return [
      0.26 + i * 0.125,
      Math.min(1, block.blockVSize / cap),
      block.medianFee,
      Math.min(1, block.nTx / 4000),
    ] as Vec4;
  });

  return {
    time,
    pulse,
    fill,
    _pad: 0,
    pointer: [pointer.x, pointer.y],
    res: [res[0], res[1]],
    band0: bands[0],
    band1: bands[1],
    band2: bands[2],
    band3: bands[3],
    band4: bands[4],
    band5: bands[5],
    band6: bands[6],
    band7: bands[7],
    ring0: rings[0],
    ring1: rings[1],
    ring2: rings[2],
    ring3: rings[3],
  };
}
