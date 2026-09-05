"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLightningLive } from "@/components/pay/useLightningLive";
import { COPY } from "@/lib/copy";
import type { SettlementEvent } from "@/lib/lightning-live";
import { playSettleChime } from "@/lib/sfx";

export function InvoiceBurst({
  paymentHash,
  enabled = true,
  status,
  onPaid,
  children,
}: {
  paymentHash: string;
  enabled?: boolean;
  status?: ReactNode;
  onPaid?: (event: SettlementEvent) => void;
  children: ReactNode;
}) {
  const [burst, setBurst] = useState<SettlementEvent | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fired = useRef(false);

  const celebrate = useCallback(
    (event: SettlementEvent) => {
      if (fired.current) return;
      fired.current = true;
      setBurst(event);
      playSettleChime();
      onPaid?.(event);
    },
    [onPaid],
  );

  useLightningLive({
    paymentHash,
    enabled: enabled && Boolean(paymentHash) && !burst,
    onEvent: celebrate,
  });

  useEffect(() => {
    fired.current = false;
    setBurst(null);
  }, [paymentHash]);

  useEffect(() => {
    if (!burst) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const started = performance.now();
    const bits = Array.from({ length: 42 }, () => ({
      x: 0.5 + (Math.random() - 0.5) * 0.12,
      y: 0.48 + (Math.random() - 0.5) * 0.08,
      vx: (Math.random() - 0.5) * 0.9,
      vy: -0.4 - Math.random() * 0.7,
      size: 3 + Math.random() * 5,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.4,
      color: Math.random() > 0.55 ? "#F7931A" : Math.random() > 0.5 ? "#ffd27a" : "#111111",
    }));

    function paint(now: number) {
      const node = canvasRef.current;
      if (!node || !ctx) return;
      const w = node.clientWidth;
      const h = node.clientHeight;
      if (node.width !== w || node.height !== h) {
        node.width = w;
        node.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      const t = (now - started) / 1000;
      for (const bit of bits) {
        bit.x += bit.vx * 0.016;
        bit.y += bit.vy * 0.016;
        bit.vy += 1.6 * 0.016;
        bit.rot += bit.spin;
        ctx.save();
        ctx.translate(bit.x * w, bit.y * h);
        ctx.rotate(bit.rot);
        ctx.globalAlpha = Math.max(0, 1 - t / 1.15);
        ctx.fillStyle = bit.color;
        ctx.fillRect(-bit.size / 2, -bit.size / 2, bit.size, bit.size);
        ctx.restore();
      }
      if (t < 1.2) raf = window.requestAnimationFrame(paint);
    }

    raf = window.requestAnimationFrame(paint);
    return () => window.cancelAnimationFrame(raf);
  }, [burst]);

  return (
    <div className="invoice-burst">
      <div className="invoice-burst-qr">
        {children}
        <canvas
          ref={canvasRef}
          className="invoice-burst-bits"
          aria-hidden="true"
        />
      </div>
      {burst ? (
        <div className="invoice-burst-status" role="status">
          <span className="invoice-burst-check" aria-hidden="true">
            ✓
          </span>
          <span>{COPY.settled}</span>
          {burst.preimage ? (
            <code className="invoice-burst-preimage">{burst.preimage}</code>
          ) : null}
        </div>
      ) : (
        status
      )}
    </div>
  );
}
