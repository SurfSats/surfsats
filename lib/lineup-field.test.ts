import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LOG_BTC_MAX,
  LOG_BTC_MIN,
  SATS_PER_BTC,
  asTxid,
  logT,
  parseLiveTx,
  parseLiveTxList,
  tileSide,
} from "./lineup-field.ts";

test("tile side steps ~constant per 10× BTC (Bitfeed width rule)", () => {
  const min = 8;
  const max = 48;
  const a = tileSide(0.01 * SATS_PER_BTC, min, max);
  const b = tileSide(0.1 * SATS_PER_BTC, min, max);
  const c = tileSide(1 * SATS_PER_BTC, min, max);
  assert.ok(Math.abs(b - a - (c - b)) < 0.2);
  assert.ok(b > a);
  assert.ok(c > b);
});

test("dust stays at min, whales clamp at max", () => {
  const min = 8;
  const max = 48;
  assert.equal(tileSide(1, min, max), min);
  assert.equal(tileSide(200 * SATS_PER_BTC, min, max), max);
});

test("log range is 1_000 sats to 50 BTC", () => {
  assert.equal(LOG_BTC_MIN, Math.log10(1_000 / SATS_PER_BTC));
  assert.equal(LOG_BTC_MAX, Math.log10(50));
  assert.equal(logT(1_000), 0);
  assert.equal(logT(50 * SATS_PER_BTC), 1);
});

test("parseLiveTx reads recent-endpoint value and vout sums", () => {
  const recent = parseLiveTx({
    txid: "aa".repeat(32),
    fee: 100,
    vsize: 140,
    value: 456110,
  });
  assert.equal(recent?.value, 456110);

  const full = parseLiveTx({
    txid: "bb".repeat(32),
    vout: [{ value: 1000 }, { value: 2500 }],
  });
  assert.equal(full?.value, 3500);

  assert.equal(parseLiveTx({ txid: "nope", value: 1 }), null);
  assert.equal(asTxid("zz".repeat(32)), null);
});

test("parseLiveTxList drops dupes and junk", () => {
  const txid = "cc".repeat(32);
  const list = parseLiveTxList([
    { txid, value: 10 },
    { txid, value: 99 },
    { fee: 1 },
  ]);
  assert.equal(list.length, 1);
  assert.equal(list[0]?.value, 10);
});
