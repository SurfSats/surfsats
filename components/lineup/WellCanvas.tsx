"use client";

import { useEffect, useRef } from "react";
import type { LineupSnapshot } from "@/lib/lineup";
import { cn } from "@/lib/cn";
import { wellUniforms, wellVisualFromSnapshot } from "@/components/lineup/wellVisual";
import wellShader from "./well.wgsl";

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

        const visual = wellVisualFromSnapshot(snapshotRef.current);
        const well = effect(gpu, wellShader, {
          label: "the-well",
          set: {
            params: wellUniforms(
              visual,
              0,
              0,
              { x: 0.5, y: 0.5 },
              canvasSurface.size,
            ),
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

        const time = clock(gpu);
        let lastHeight = snapshotRef.current.blockHeight;
        let pulseUntil = 0;

        const loop = frameLoop(gpu, (frame) => {
          const now = time.time;
          const snap = snapshotRef.current;
          const vis = wellVisualFromSnapshot(snap);
          if (
            lastHeight !== null &&
            vis.height !== null &&
            vis.height > lastHeight
          ) {
            pulseUntil = now + 0.9;
          }
          lastHeight = vis.height;
          const pulse = pulseUntil > now ? (pulseUntil - now) / 0.9 : 0;
          well.set({
            params: wellUniforms(vis, now, pulse, pointer, canvasSurface.size),
          });
          frame.pass(canvasSurface, well);
        });

        stopLoop = () => loop.stop();
        disposeGpu = () => {
          canvas.removeEventListener("pointermove", onPointer);
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
