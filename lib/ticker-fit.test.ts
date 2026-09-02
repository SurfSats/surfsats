import assert from "node:assert/strict";
import { test } from "node:test";
import { hiddenTickerIds } from "./ticker-fit.ts";

const TAPE = [
  { id: "live_signal", width: 131 },
  { id: "btc", width: 92 },
  { id: "chg", width: 72 },
  { id: "height", width: 96 },
  { id: "no_kyc", width: 54 },
  { id: "mempool", width: 92 },
  { id: "swell", width: 88 },
  { id: "moscow_time", width: 118 },
  { id: "hash", width: 76 },
];

function visibleWidth(hidden: string[], gap = 8) {
  const vis = TAPE.filter((item) => !hidden.includes(item.id));
  if (vis.length === 0) return 0;
  return vis.reduce((sum, item) => sum + item.width, 0) + gap * (vis.length - 1);
}

test("keeps every token when the tape already fits", () => {
  assert.deepEqual(
    hiddenTickerIds({ available: 2000, items: TAPE, gap: 8 }),
    [],
  );
});

test("drops hash then moscow_time before any other token", () => {
  const hidden = hiddenTickerIds({ available: 720, items: TAPE, gap: 8 });
  assert.ok(hidden.includes("hash"));
  assert.ok(hidden.includes("moscow_time"));
  assert.equal(
    hidden.some((id) => id !== "hash" && id !== "moscow_time"),
    false,
  );
});

test("after hash and moscow_time, hides whole tokens from the right", () => {
  const hidden = hiddenTickerIds({ available: 430, items: TAPE, gap: 8 });
  assert.ok(hidden.includes("hash"));
  assert.ok(hidden.includes("moscow_time"));
  assert.ok(hidden.includes("swell"));
  assert.equal(hidden.includes("live_signal"), false);
  assert.equal(hidden.includes("btc"), false);
  assert.equal(hidden.includes("height"), false);
  assert.ok(visibleWidth(hidden) <= 430);
});

test("never leaves a token that would clip through the tape edge", () => {
  for (const available of [350, 390, 520, 720, 1024, 1440]) {
    const hidden = hiddenTickerIds({ available, items: TAPE, gap: 8 });
    assert.ok(
      visibleWidth(hidden) <= available,
      `overflow at ${available}: ${hidden.join(",")}`,
    );
  }
});

test("skips zero-width tokens instead of dropping height", () => {
  const items = [
    { id: "live_signal", width: 120 },
    { id: "btc", width: 80 },
    { id: "24h", width: 64 },
    { id: "height", width: 88 },
    { id: "no_kyc", width: 0 },
    { id: "moscow_time", width: 0 },
    { id: "hash", width: 0 },
  ];
  const hidden = hiddenTickerIds({ available: 380, items, gap: 8 });
  assert.deepEqual(hidden, []);
  assert.equal(hidden.includes("height"), false);
});
