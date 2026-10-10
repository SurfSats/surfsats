import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fiatChartLines, moscowSats, parseCandles } from "./fiat-chart.ts";
import { clearFiatHistoryCache, FIAT_HISTORY_MS, getFiatHistory } from "./fiat-history.ts";

const NOW = Date.parse("2026-10-10T18:00:00Z");

function candle(time: number, close: number) {
  return [time, close - 1, close + 1, close - 0.5, close, 10];
}

test("a higher bitcoin price buys fewer sats per dollar", () => {
  assert.equal(moscowSats(50_000), 2_000);
  assert.ok(moscowSats(40_000) < moscowSats(10_000));
  assert.ok(moscowSats(80_000) < moscowSats(40_000));
});

test("price and moscow time share one history and move against each other on a log scale", () => {
  const lines = fiatChartLines([
    { time: 1_000, priceUsd: 10_000 },
    { time: 2_000, priceUsd: 20_000 },
    { time: 3_000, priceUsd: 40_000 },
  ]);
  assert.ok(lines);
  const start = lines.price[0];
  const mid = lines.price[1];
  const end = lines.price[2];
  const moscowStart = lines.moscow[0];
  const moscowEnd = lines.moscow[2];
  assert.ok(start && mid && end && moscowStart && moscowEnd);

  assert.ok(end.y < start.y);
  assert.ok(moscowEnd.y > moscowStart.y);
  assert.equal(start.x, moscowStart.x);
  assert.equal(end.x, moscowEnd.x);
  assert.ok(Math.abs(mid.y - (start.y + end.y) / 2) < 0.01);
});

test("candle rows are daily closes, oldest first", () => {
  const parsed = parseCandles([candle(300, 40_000), candle(100, 10_000), candle(200, 20_000)]);
  assert.ok(parsed);
  assert.deepEqual(
    parsed.map((point) => point.priceUsd),
    [10_000, 20_000, 40_000],
  );
  assert.equal(parseCandles([{ time: 1, priceUsd: 10 }]), null);
  assert.equal(parseCandles([candle(1, 0), candle(2, 10)]), null);
});

test("a second load serves the cached price history and does not call the feed", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fiat-history-"));
  const cachePath = join(dir, "history.json");
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return Response.json([candle(300, 40_000), candle(100, 10_000), candle(200, 20_000)]);
  };

  try {
    const [first, twin] = await Promise.all([
      getFiatHistory({ now: NOW, fetchImpl, cachePath }),
      getFiatHistory({ now: NOW, fetchImpl, cachePath }),
    ]);
    assert.equal(calls, 1);
    assert.ok(first);
    assert.equal(first.stale, false);
    assert.equal(first.points[0]?.priceUsd, 10_000);
    assert.equal(first.points[2]?.priceUsd, 40_000);
    assert.equal(twin?.fetchedAt, first.fetchedAt);
    assert.ok(moscowSats(first.points[2]?.priceUsd ?? 0) < moscowSats(first.points[0]?.priceUsd ?? 0));

    const second = await getFiatHistory({ now: NOW + 60_000, fetchImpl, cachePath });
    assert.equal(calls, 1);
    assert.equal(second?.fetchedAt, first.fetchedAt);

    clearFiatHistoryCache(cachePath);
    const fromFile = await getFiatHistory({ now: NOW + 120_000, fetchImpl, cachePath });
    assert.equal(calls, 1);
    assert.equal(fromFile?.points.length, 3);
    assert.equal(fromFile?.stale, false);

    const fail: typeof fetch = async () => {
      calls += 1;
      throw new Error("feed down");
    };
    const stale = await getFiatHistory({
      now: NOW + FIAT_HISTORY_MS + 1,
      fetchImpl: fail,
      cachePath,
    });
    assert.equal(stale?.stale, true);
    assert.equal(stale?.fetchedAt, first.fetchedAt);
    assert.equal(stale?.points[2]?.priceUsd, 40_000);
    const afterFail = calls;

    const held = await getFiatHistory({
      now: NOW + FIAT_HISTORY_MS + 5_000,
      fetchImpl: fail,
      cachePath,
    });
    assert.equal(calls, afterFail);
    assert.equal(held?.stale, true);
    assert.equal(held?.points[0]?.priceUsd, 10_000);
  } finally {
    clearFiatHistoryCache(cachePath);
    rmSync(dir, { recursive: true, force: true });
  }
});
