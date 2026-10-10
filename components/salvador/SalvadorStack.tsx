"use client";

import { useState } from "react";
import { STACK_CHART, stackChartMarks, stackChartPaths, stepAtX } from "@/lib/salvador-chart";

export type StackViewStep = {
  time: number;
  balanceSats: number;
  txid: string | null;
  href: string | null;
  label: string | null;
  when: string | null;
  deltaBtc: string | null;
  balanceBtc: string;
  deltaUsd: string | null;
  balanceUsd: string | null;
  gain: boolean;
};

function readout(step: StackViewStep, unit: "btc" | "usd") {
  if (unit === "usd") {
    return { delta: step.deltaUsd, balance: step.balanceUsd };
  }
  return { delta: step.deltaBtc, balance: step.balanceBtc };
}

export function SalvadorStack({
  steps,
  usdReady,
}: {
  steps: StackViewStep[];
  usdReady: boolean;
}) {
  const [unit, setUnit] = useState<"btc" | "usd">("btc");
  const [active, setActive] = useState<number | null>(null);
  const drawn = stackChartMarks(steps);
  const paths = drawn ? stackChartPaths(drawn.marks) : null;
  const end = drawn?.marks[drawn.marks.length - 1];
  const endBalance = steps[steps.length - 1]?.balanceSats;
  if (!drawn || !paths || !end || endBalance === undefined) return null;

  const marks = drawn.marks;
  const selected = active === null ? null : steps[active] ?? null;
  const selectedMark = active === null ? null : marks[active] ?? null;
  const text = selected ? readout(selected, unit) : null;

  function hoverAt(clientX: number, bounds: DOMRect) {
    const x = ((clientX - bounds.left) / bounds.width) * STACK_CHART.width;
    setActive(stepAtX(steps, marks, x));
  }

  const tipLeft = selectedMark ? (selectedMark.x / STACK_CHART.width) * 100 : 0;
  const tipTop = selectedMark ? (selectedMark.y / STACK_CHART.height) * 100 : 0;

  return (
    <div className="salvador-stack">
      <div className="salvador-toggle" role="group" aria-label="Stack unit">
        <button type="button" aria-pressed={unit === "btc"} onClick={() => setUnit("btc")}>
          BTC
        </button>
        <button
          type="button"
          aria-pressed={unit === "usd"}
          disabled={!usdReady}
          onClick={() => setUnit("usd")}
        >
          USD
        </button>
      </div>
      <div
        className="salvador-chart-wrap"
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setActive(null);
        }}
      >
        <svg
          className="salvador-chart"
          viewBox={`0 0 ${STACK_CHART.width} ${STACK_CHART.height}`}
          role="img"
          aria-label={`Balance history, last 30 days, ending at ${endBalance} sats`}
          onPointerMove={(event) => {
            if (event.pointerType === "mouse") {
              hoverAt(event.clientX, event.currentTarget.getBoundingClientRect());
            }
          }}
          onClick={(event) => {
            hoverAt(event.clientX, event.currentTarget.getBoundingClientRect());
          }}
        >
          <path className="salvador-step-fill" d={paths.fill} />
          <path className="salvador-step-line" d={paths.line} />
          <line
            className="salvador-step-end"
            x1={end.x}
            x2={end.x}
            y1={STACK_CHART.padY}
            y2={STACK_CHART.height - STACK_CHART.padY}
          />
          <circle className="salvador-step-dot" cx={end.x} cy={end.y} r="3.5" />
        </svg>
        {selected && selected.href && selected.label && selected.when && text?.delta && text.balance ? (
          <div
            className="salvador-tip"
            style={{ left: `${tipLeft}%`, top: `${tipTop}%` }}
          >
            <p>{selected.when}</p>
            <a href={selected.href} target="_blank" rel="noreferrer">
              {selected.label}
            </a>
            <p className={selected.gain ? "salvador-tip-gain" : undefined}>{text.delta}</p>
            <p>{text.balance}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
