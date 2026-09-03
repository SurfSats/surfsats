import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LOG_BTC_MAX,
  LOG_BTC_MIN,
  SATS_PER_BTC,
  asTxid,
  extractFeedBatch,
  logT,
  parseLiveTx,
  parseLiveTxList,
  pendingTxids,
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

test("parseLiveTx reads compressed tuples [txid, fee, vsize, value]", () => {
  const txid = "dd".repeat(32);
  const tx = parseLiveTx([txid, 2000, 171.25, 5942725, 11.68, 1, 1734881537]);
  assert.equal(tx?.txid, txid);
  assert.equal(tx?.value, 5942725);
});

test("parseLiveTx reads string sat values and ignores fee-only rows", () => {
  const txid = "ee".repeat(32);
  assert.equal(parseLiveTx({ txid, value: "456110" })?.value, 456110);
  assert.equal(parseLiveTx({ txid, fee: 100, vsize: 140 }), null);
});

test("pendingTxids collects ids that still need a value", () => {
  const a = "aa".repeat(32);
  const b = "bb".repeat(32);
  const c = "cc".repeat(32);
  const ids = pendingTxids([a, { txid: b }, { txid: c, value: 1 }]);
  assert.deepEqual(ids, [a, b]);
});

test("extractFeedBatch reads live txs, stats, and nested JSON strings", () => {
  const txid = "11".repeat(32);
  const projected = "55".repeat(32);
  const mined = "22".repeat(32);
  const pending = "33".repeat(32);
  const hash = "44".repeat(32);
  const batch = extractFeedBatch({
    mempoolInfo: { size: 81234 },
    transactions: [{ txid, value: 9001 }],
    "mempool-txids": { added: [pending], mined: [mined] },
    "projected-block-transactions": JSON.stringify({
      blockTransactions: [[projected, 10, 140, 777, 1, 0, 1]],
    }),
    block: { id: hash, height: 900000, timestamp: 1_700_000_000, tx_count: 12 },
  });
  assert.equal(batch.unconfirmed, 81234);
  assert.equal(
    batch.txs.some((tx) => tx.txid === txid && tx.value === 9001),
    true,
  );
  assert.equal(
    batch.txs.some((tx) => tx.txid === projected && tx.value === 777),
    true,
  );
  assert.deepEqual(batch.pending, [pending]);
  assert.deepEqual(batch.mined, [mined]);
  assert.equal(batch.block?.hash, hash);
  assert.equal(batch.block?.height, 900000);
});
