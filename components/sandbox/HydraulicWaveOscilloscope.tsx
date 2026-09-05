"use client";

import { Activity, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrutalistButton } from "@/components/ui/BrutalistButton";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { cn } from "@/lib/cn";
import {
  SANDBOX_CANVAS_HEIGHT,
  harmonicFlowKhz,
  hydraulicAmplitude,
  hydraulicPressureKpa,
  hydraulicSpeed,
  isCrestHighlight,
  primaryWaveY,
  secondaryWaveY,
  swellPeriodSec,
} from "@/lib/sandbox";

type HydraulicWaveOscilloscopeProps = {
  initialSatsPerSec?: number;
  className?: string;
};

function runOscilloscope({
  surface,
  host,
  gfx,
  satsRef,
  frameRef,
}: {
  surface: HTMLCanvasElement;
  host: HTMLElement;
  gfx: CanvasRenderingContext2D;
  satsRef: { current: number };
  frameRef: { current: number };
}) {
  let step = 0;
  let running = true;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function size() {
    const width = Math.max(1, host.clientWidth);
    const dpr = window.devicePixelRatio || 1;
    surface.width = Math.floor(width * dpr);
    surface.height = Math.floor(SANDBOX_CANVAS_HEIGHT * dpr);
    surface.style.width = `${width}px`;
    surface.style.height = `${SANDBOX_CANVAS_HEIGHT}px`;
    gfx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function paint() {
    const width = Math.max(1, surface.clientWidth || host.clientWidth);
    const height = SANDBOX_CANVAS_HEIGHT;
    const throughput = satsRef.current;
    const speed = hydraulicSpeed(throughput);
    const amplitude = hydraulicAmplitude(throughput);
    if (!reduce) step += speed;

    gfx.fillStyle = "#08080A";
    gfx.fillRect(0, 0, width, height);

    gfx.strokeStyle = "#27272A";
    gfx.lineWidth = 1;
    for (let y = 20; y < height; y += 30) {
      gfx.beginPath();
      gfx.moveTo(0, y);
      gfx.lineTo(width, y);
      gfx.stroke();
    }

    gfx.beginPath();
    gfx.strokeStyle = "rgba(124, 58, 237, 0.35)";
    gfx.lineWidth = 1.5;
    for (let x = 0; x < width; x += 1) {
      const y = secondaryWaveY({ x, step, amplitude, height });
      if (x === 0) gfx.moveTo(x, y);
      else gfx.lineTo(x, y);
    }
    gfx.stroke();

    gfx.beginPath();
    gfx.strokeStyle = "#F3F4F6";
    gfx.globalAlpha = 0.35;
    gfx.lineWidth = 1;
    for (let x = 0; x < width; x += 1) {
      const y = primaryWaveY({
        x,
        step: step * 0.85,
        amplitude: amplitude * 0.45,
        height,
      });
      if (x === 0) gfx.moveTo(x, y);
      else gfx.lineTo(x, y);
    }
    gfx.stroke();
    gfx.globalAlpha = 1;

    gfx.beginPath();
    gfx.strokeStyle = "#7C3AED";
    gfx.lineWidth = 2;
    for (let x = 0; x < width; x += 1) {
      const y = primaryWaveY({ x, step, amplitude, height });
      if (x === 0) gfx.moveTo(x, y);
      else gfx.lineTo(x, y);
    }
    gfx.stroke();

    gfx.fillStyle = throughput > 50 ? "#10B981" : "#F59E0B";
    for (let x = 0; x < width; x += 4) {
      const y = primaryWaveY({ x, step, amplitude, height });
      if (isCrestHighlight({ y, height, amplitude })) {
        gfx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
  }

  function tick() {
    if (!running) return;
    paint();
    if (!reduce) frameRef.current = window.requestAnimationFrame(tick);
  }

  size();
  tick();
  const observer = new ResizeObserver(() => {
    size();
    paint();
  });
  observer.observe(host);

  return () => {
    running = false;
    observer.disconnect();
    window.cancelAnimationFrame(frameRef.current);
  };
}

export function HydraulicWaveOscilloscope({
  initialSatsPerSec = 21,
  className,
}: HydraulicWaveOscilloscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const satsRef = useRef(initialSatsPerSec);
  const [satsPerSec, setSatsPerSec] = useState(initialSatsPerSec);
  const [telemetryPeriod, setTelemetryPeriod] = useState(
    Number(swellPeriodSec(initialSatsPerSec, 0).toFixed(1)),
  );

  useEffect(() => {
    satsRef.current = satsPerSec;
  }, [satsPerSec]);

  useEffect(() => {
    const surface = canvasRef.current;
    if (!surface) return;
    const host = surface.parentElement;
    if (!host) return;
    const gfx = surface.getContext("2d");
    if (!gfx) return;
    return runOscilloscope({ surface, host, gfx, satsRef, frameRef });
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTelemetryPeriod(
        Number(swellPeriodSec(satsPerSec, Math.random() * 0.3).toFixed(1)),
      );
    }, 1500);
    return () => window.clearInterval(id);
  }, [satsPerSec]);

  const amplitude = hydraulicAmplitude(satsPerSec);
  const pressure = hydraulicPressureKpa(satsPerSec);
  const harmonic = harmonicFlowKhz(satsPerSec);

  return (
    <TerminalCard
      className={className}
      status="live"
      tag="L402_STREAM"
      title="HYDRAULIC_OSCILLOSCOPE // SWELL_TELEMETRY"
    >
      <div className="relative w-full overflow-hidden border border-zinc-raw bg-void">
        <canvas ref={canvasRef} className="block w-full" />
        <div className="absolute top-2 right-2 flex items-center gap-2 border border-zinc-raw bg-void/80 px-2 py-0.5 font-mono text-[10px] text-zinc-raw">
          <Activity className="h-3 w-3 animate-pulse text-terminal-green" />
          <span>REALTIME_FLOW</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-4">
        <div className="border border-zinc-raw bg-void p-2">
          <span className="block text-[10px] text-zinc-raw">THROUGHPUT</span>
          <span className="font-bold text-amber">{satsPerSec} SATS/SEC</span>
        </div>
        <div className="border border-zinc-raw bg-void p-2">
          <span className="block text-[10px] text-zinc-raw">SWELL_PERIOD_SEC</span>
          <span className="font-bold text-salt">{telemetryPeriod} SEC</span>
        </div>
        <div className="border border-zinc-raw bg-void p-2">
          <span className="block text-[10px] text-zinc-raw">
            HYDRAULIC_AMPLITUDE_SATS
          </span>
          <span className="font-bold text-violet">{amplitude.toFixed(1)}</span>
        </div>
        <div className="border border-zinc-raw bg-void p-2">
          <span className="block text-[10px] text-zinc-raw">HARMONIC_FLOW_KHZ</span>
          <span className="font-bold text-terminal-green">{harmonic}</span>
        </div>
      </div>
      <p className="mt-2 font-mono text-[10px] tracking-telemetry text-zinc-raw">
        PRESSURE {pressure.toFixed(1)} KPA
      </p>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-raw pt-2">
        <BrutalistButton
          size="sm"
          variant={satsPerSec === 21 ? "primary" : "secondary"}
          onClick={() => setSatsPerSec(21)}
        >
          21 SATS/S
        </BrutalistButton>
        <BrutalistButton
          size="sm"
          variant={satsPerSec === 64 ? "primary" : "secondary"}
          onClick={() => setSatsPerSec(64)}
        >
          64 SATS/S
        </BrutalistButton>
        <BrutalistButton
          size="sm"
          variant={satsPerSec === 210 ? "amber" : "secondary"}
          onClick={() => setSatsPerSec(210)}
          className={cn(satsPerSec === 210 && "flex items-center")}
        >
          <Zap className="mr-1 inline h-3 w-3" />
          210 SATS/S
        </BrutalistButton>
      </div>
    </TerminalCard>
  );
}
