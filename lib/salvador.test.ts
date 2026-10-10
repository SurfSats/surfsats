import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { ONBTC_ADDRESSES, ONBTC_WALLET_URL } from "./onbtc.ts";
import {
  assembleSalvadorDesk,
  countStreakDays,
  parseSavedHistory,
  formatBtc,
  formatStreakChip,
  loadSalvadorDesk,
  mempoolAddressUrl,
  mempoolTxUrl,
  ONE_BTC_SATS,
  parseBalance,
  parseSpotUsd,
  parseWalletTx,
  previousSvDay,
  reserveUsd,
  SALVADOR_POPULATION,
  satsPerSalvadoran,
  SATS_PER_BTC,
  stackFromTxs,
  svDayKey,
  type AddressLoad,
  type SalvadorDesk,
  type WalletTx,
} from "./salvador.ts";
import { stackChartMarks, stackChartPaths, stepAtX, windowBalance } from "./salvador-chart.ts";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const SET = new Set<string>(ONBTC_ADDRESSES);
const NOW = Math.floor(Date.parse("2026-10-10T18:00:00Z") / 1000);

function txid(n: number) {
  return n.toString(16).padStart(64, "0");
}

function decodeBase58(value: string) {
  let n = 0n;
  for (const char of value) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) return null;
    n = n * 58n + BigInt(index);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  let zeros = 0;
  for (const char of value) {
    if (char !== "1") break;
    zeros += 1;
  }
  return Buffer.concat([Buffer.alloc(zeros), Buffer.from(hex, "hex")]);
}

function loadsFor(txsByAddress: ReadonlyMap<string, WalletTx[]>, balanceFor: (address: string) => number | null): AddressLoad[] {
  return ONBTC_ADDRESSES.map((address) => ({
    address,
    balanceSats: balanceFor(address),
    txs: txsByAddress.get(address) ?? [],
  }));
}

function confirmed(txidValue: string, time: number, netSats: number): WalletTx {
  return { txid: txidValue, confirmed: true, time, netSats };
}

test("ONBTC list is the 20 checksummed public addresses", () => {
  assert.equal(ONBTC_ADDRESSES.length, 20);
  assert.equal(new Set(ONBTC_ADDRESSES).size, 20);
  assert.equal(ONBTC_WALLET_URL, "https://bitcoin.gob.sv/wallet/ONBTC");
  for (const address of ONBTC_ADDRESSES) {
    const raw = decodeBase58(address);
    assert.ok(raw);
    assert.equal(raw.length, 25);
    assert.equal(raw[0], 5);
    const payload = raw.subarray(0, 21);
    const check = raw.subarray(21);
    const hash = createHash("sha256")
      .update(createHash("sha256").update(payload).digest())
      .digest()
      .subarray(0, 4);
    assert.deepEqual(check, hash);
  }
});

test("El Salvador day rolls at 06:00 UTC", () => {
  const before = Math.floor(Date.parse("2026-10-09T05:59:59Z") / 1000);
  const after = Math.floor(Date.parse("2026-10-09T06:00:00Z") / 1000);
  assert.equal(svDayKey(before), "2026-10-08");
  assert.equal(svDayKey(after), "2026-10-09");
  assert.equal(previousSvDay("2026-10-09"), "2026-10-08");
});

test("a 1 BTC inflow is the wallet net, not an internal move", () => {
  const inflow = parseWalletTx(
    {
      txid: "ab".repeat(32),
      status: { confirmed: true, block_time: 1_700_000_000 },
      vin: [{ prevout: { scriptpubkey_address: "1outside", value: 100_000_400 } }],
      vout: [
        { scriptpubkey_address: ONBTC_ADDRESSES[0], value: ONE_BTC_SATS },
        { scriptpubkey_address: "1change", value: 100 },
      ],
    },
    SET,
  );
  assert.ok(inflow);
  assert.equal(inflow.netSats, ONE_BTC_SATS);

  const internal = parseWalletTx(
    {
      txid: "cd".repeat(32),
      status: { confirmed: true, block_time: 1_700_000_100 },
      vin: [{ prevout: { scriptpubkey_address: ONBTC_ADDRESSES[0], value: 500 * SATS_PER_BTC } }],
      vout: [{ scriptpubkey_address: ONBTC_ADDRESSES[1], value: 500 * SATS_PER_BTC }],
    },
    SET,
  );
  assert.ok(internal);
  assert.equal(internal.netSats, 0);

  const two = parseWalletTx(
    {
      txid: "ef".repeat(32),
      status: { confirmed: true, block_time: 1_700_000_200 },
      vin: [{ prevout: { scriptpubkey_address: "1outside", value: 2 * ONE_BTC_SATS } }],
      vout: [{ scriptpubkey_address: ONBTC_ADDRESSES[2], value: 2 * ONE_BTC_SATS }],
    },
    SET,
  );
  assert.ok(two);
  assert.equal(two.netSats === ONE_BTC_SATS, false);
});

test("streak counts consecutive Salvador days and keeps today open", () => {
  const day = (iso: string) => Math.floor(Date.parse(iso) / 1000);
  const hit = (iso: string, n: number) => ({
    txid: txid(n),
    time: day(iso),
    amountSats: ONE_BTC_SATS,
    confirmed: true,
  });
  const now = day("2026-10-10T18:00:00Z");
  assert.equal(
    countStreakDays(
      [
        hit("2026-10-07T18:00:00Z", 1),
        hit("2026-10-08T18:00:00Z", 2),
        hit("2026-10-09T18:00:00Z", 3),
      ],
      now,
    ),
    3,
  );
  assert.equal(
    countStreakDays(
      [hit("2026-10-07T18:00:00Z", 1), hit("2026-10-09T18:00:00Z", 3)],
      day("2026-10-09T18:00:00Z"),
    ),
    1,
  );
  assert.equal(countStreakDays([hit("2026-10-07T18:00:00Z", 1)], now), 0);
  assert.equal(formatStreakChip(3, false), "LIVE · 3 DAYS");
  assert.equal(formatStreakChip(1, false), "LIVE · 1 DAY");
  assert.equal(formatStreakChip(3, true), "STALE · 3 DAYS");
  assert.equal(formatStreakChip(null, true), "STALE · —");
});

test("sats per Salvadoran uses the labeled population", () => {
  assert.equal(SALVADOR_POPULATION, 6_300_000);
  assert.equal(satsPerSalvadoran(SALVADOR_POPULATION * 2), 2);
  assert.equal(reserveUsd(2 * SATS_PER_BTC, 50_000), 100_000);
  assert.equal(formatBtc(ONE_BTC_SATS), "1.00000000");
  assert.equal(formatBtc(1_000 * SATS_PER_BTC), "1,000.00000000");
  assert.equal(formatBtc(50_000_546), "0.50000546");
});

test("stack end is the summed confirmed net, one point per day", () => {
  const stacked = stackFromTxs([
    confirmed(txid(1), Math.floor(Date.parse("2026-10-08T18:00:00Z") / 1000), 2 * SATS_PER_BTC),
    confirmed(txid(2), Math.floor(Date.parse("2026-10-08T20:00:00Z") / 1000), SATS_PER_BTC),
    confirmed(txid(3), Math.floor(Date.parse("2026-10-09T18:00:00Z") / 1000), -SATS_PER_BTC),
  ]);
  assert.ok(stacked);
  assert.equal(stacked.endSats, 2 * SATS_PER_BTC);
  assert.equal(stacked.points.length, 2);
  assert.equal(stacked.points[1]?.balanceSats, 2 * SATS_PER_BTC);
});

test("a failed address does not become zero, and last good numbers stay marked stale", () => {
  const txs = new Map<string, WalletTx[]>();
  for (const [index, address] of ONBTC_ADDRESSES.entries()) {
    txs.set(address, [confirmed(txid(index + 1), NOW - 3600, ONE_BTC_SATS)]);
  }
  const fresh = assembleSalvadorDesk({
    loads: loadsFor(txs, () => ONE_BTC_SATS),
    priceUsd: 80_000,
    nowSec: NOW,
    previous: null,
    fetchedAt: NOW * 1000,
  });
  assert.equal(fresh.totalSats, ONBTC_ADDRESSES.length * ONE_BTC_SATS);
  assert.equal(fresh.totalStale, false);
  assert.equal(fresh.historyStale, false);
  assert.equal(fresh.streakDays, 1);
  assert.equal(fresh.latest?.amountSats, ONE_BTC_SATS);
  assert.equal(fresh.stack.at(-1)?.balanceSats, fresh.totalSats);
  assert.equal(fresh.steps.at(-1)?.balanceSats, fresh.totalSats);
  assert.equal(mempoolAddressUrl(ONBTC_ADDRESSES[0]).includes("mempool.space/address/"), true);
  assert.equal(mempoolTxUrl(txid(1)).includes("mempool.space/tx/"), true);

  const failed = ONBTC_ADDRESSES[0];
  const missing = assembleSalvadorDesk({
    loads: loadsFor(txs, (address) => (address === failed ? null : ONE_BTC_SATS)).map((load) =>
      load.address === failed ? { ...load, txs: null } : load,
    ),
    priceUsd: null,
    nowSec: NOW,
    previous: null,
    fetchedAt: NOW * 1000,
  });
  assert.equal(missing.addresses[0]?.balanceSats, null);
  assert.equal(missing.totalSats, null);
  assert.equal(missing.usd, null);
  assert.equal(missing.historyKnown, false);

  const kept = assembleSalvadorDesk({
    loads: loadsFor(txs, (address) => (address === failed ? null : ONE_BTC_SATS)).map((load) =>
      load.address === failed ? { ...load, txs: null } : load,
    ),
    priceUsd: null,
    nowSec: NOW,
    previous: fresh,
    fetchedAt: NOW * 1000 + 5,
  });
  assert.equal(kept.addresses[0]?.balanceSats, ONE_BTC_SATS);
  assert.equal(kept.addresses[0]?.stale, true);
  assert.equal(kept.totalSats, fresh.totalSats);
  assert.equal(kept.totalStale, true);
  assert.equal(kept.priceUsd, 80_000);
  assert.equal(kept.priceStale, true);
  assert.equal(kept.historyStale, true);
  assert.equal(kept.streakDays, fresh.streakDays);
  assert.equal(kept.latest?.txid, fresh.latest?.txid);
  assert.equal(kept.steps.at(-1)?.balanceSats, fresh.totalSats);
});

test("30-day stack stays off zero and a 1 BTC day is a tall step", () => {
  const now = Math.floor(Date.parse("2026-10-10T18:00:00Z") / 1000);
  const day = 24 * 60 * 60;
  const txs = [confirmed(txid(1), now - 40 * day, 7_770 * SATS_PER_BTC)];
  for (let age = 30; age >= 1; age -= 1) {
    txs.push(confirmed(txid(age + 1), now - age * day, ONE_BTC_SATS));
  }
  const steps = windowBalance(txs, now);
  assert.ok(steps);
  const end = steps[steps.length - 1];
  assert.ok(end);
  assert.equal(end.balanceSats, 7_800 * SATS_PER_BTC);
  assert.equal(steps[0]?.balanceSats, 7_770 * SATS_PER_BTC);
  assert.equal(steps.filter((step) => step.deltaSats === ONE_BTC_SATS).length, 30);

  const drawn = stackChartMarks(steps);
  assert.ok(drawn);
  assert.ok(drawn.yMin > 7_000 * SATS_PER_BTC);
  assert.ok(drawn.yMax < 8_000 * SATS_PER_BTC);
  const firstBuy = steps.findIndex((step) => step.txid === txid(31));
  const buy = drawn.marks[firstBuy];
  const before = drawn.marks[firstBuy - 1];
  assert.ok(buy && before);
  const dy = Math.abs(buy.y - before.y);
  assert.ok(dy >= 5);

  const paths = stackChartPaths(drawn.marks);
  assert.ok(paths);
  assert.match(paths.line, / H/);
  assert.match(paths.line, / V/);
  assert.equal(stepAtX(steps, drawn.marks, buy.x + 1), firstBuy);

  const quiet = windowBalance(
    [
      confirmed(txid(1), now - 40 * day, 5 * SATS_PER_BTC),
      confirmed(txid(2), now - day, 0),
      confirmed(txid(3), now - 3600, ONE_BTC_SATS),
    ],
    now,
  );
  assert.ok(quiet);
  assert.equal(quiet[quiet.length - 1]?.balanceSats, 6 * SATS_PER_BTC);
  assert.deepEqual(
    quiet.filter((step) => step.txid).map((step) => step.txid),
    [txid(3)],
  );
});

test("history that does not add up to the confirmed total is not drawn", () => {
  const desk = assembleSalvadorDesk({
    loads: ONBTC_ADDRESSES.map((address, index) => ({
      address,
      balanceSats: index === 0 ? 5 * SATS_PER_BTC : 0,
      txs: index === 0 ? [confirmed(txid(9), NOW, ONE_BTC_SATS)] : [],
    })),
    priceUsd: 10,
    nowSec: NOW,
    previous: null,
    fetchedAt: NOW * 1000,
  });
  assert.equal(desk.totalSats, 5 * SATS_PER_BTC);
  assert.equal(desk.totalStale, false);
  assert.equal(desk.stack.length, 0);
  assert.equal(desk.streakDays, null);
  assert.equal(desk.historyStale, true);
});

test("saved history must be the full address set or it is ignored", () => {
  assert.equal(parseSavedHistory({ version: 1 }), null);
  assert.equal(parseSavedHistory({ fetchedAt: 1, priceUsd: 10, loads: [] }), null);
  const loads = ONBTC_ADDRESSES.map((address) => ({
    address,
    balanceSats: 0,
    txs: [],
  }));
  const saved = parseSavedHistory({ fetchedAt: 1_700_000_000_000, priceUsd: 10, loads });
  assert.ok(saved);
  assert.equal(saved.loads.length, ONBTC_ADDRESSES.length);
  loads[0] = { ...loads[0], balanceSats: 1.5 };
  assert.equal(
    parseSavedHistory({ fetchedAt: 1_700_000_000_000, priceUsd: 10, loads }),
    null,
  );
});

test("parse rejects a balance that is not a funded-minus-spent integer", () => {
  assert.equal(
    parseBalance({ chain_stats: { funded_txo_sum: 150, spent_txo_sum: 50 } }),
    100,
  );
  assert.equal(
    parseBalance({ chain_stats: { funded_txo_sum: 10, spent_txo_sum: 11 } }),
    null,
  );
  assert.equal(parseBalance({ chain_stats: { funded_txo_sum: 1.5, spent_txo_sum: 0 } }), null);
  assert.equal(parseSpotUsd({ data: { amount: "82555.425", base: "BTC", currency: "USD" } }), 82555.425);
  assert.equal(parseSpotUsd({ data: { amount: "0" } }), null);
});

test("load reads mempool balances and the spot price, and does not invent a miss", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("BTC-USD")) {
      return Response.json({ data: { amount: "50000", base: "BTC", currency: "USD" } });
    }
    const chain = url.match(/\/address\/([^/]+)\/txs\/chain/);
    if (chain) {
      const address = chain[1] ?? "";
      const index = ONBTC_ADDRESSES.findIndex((item) => item === address);
      if (index < 0) return new Response("no", { status: 404 });
      return Response.json([
        {
          txid: txid(index + 1),
          status: { confirmed: true, block_time: NOW - 3600 },
          vin: [{ prevout: { scriptpubkey_address: "1outside", value: ONE_BTC_SATS } }],
          vout: [{ scriptpubkey_address: address, value: ONE_BTC_SATS }],
        },
      ]);
    }
    if (url.includes("/txs/mempool")) return Response.json([]);
    const address = url.match(/\/address\/([^/]+)$/)?.[1];
    if (!address || address === ONBTC_ADDRESSES[3]) return new Response("no", { status: 404 });
    return Response.json({
      chain_stats: { funded_txo_sum: ONE_BTC_SATS, spent_txo_sum: 0 },
    });
  };

  const desk = await loadSalvadorDesk(null, NOW * 1000, fetchImpl);
  const missed = desk.addresses.find((row) => row.address === ONBTC_ADDRESSES[3]);
  assert.ok(missed);
  assert.equal(missed.balanceSats, null);
  assert.equal(desk.totalSats, null);
  assert.equal(desk.priceUsd, 50_000);
  assert.equal(desk.priceStale, false);

  const prior: SalvadorDesk = {
    ...desk,
    totalSats: ONBTC_ADDRESSES.length * ONE_BTC_SATS,
    totalStale: false,
    satsPerPerson: satsPerSalvadoran(ONBTC_ADDRESSES.length * ONE_BTC_SATS),
    usd: reserveUsd(ONBTC_ADDRESSES.length * ONE_BTC_SATS, 50_000),
    historyKnown: true,
    historyStale: false,
    streakDays: 4,
    latest: {
      txid: txid(1),
      time: NOW - 3600,
      amountSats: ONE_BTC_SATS,
      confirmed: true,
    },
    stack: [{ time: NOW - 3600, balanceSats: ONBTC_ADDRESSES.length * ONE_BTC_SATS }],
    addresses: desk.addresses.map((row) => ({
      address: row.address,
      balanceSats: ONE_BTC_SATS,
      stale: false,
    })),
  };
  const again = await loadSalvadorDesk(prior, NOW * 1000 + 10, fetchImpl);
  assert.equal(again.addresses[3]?.balanceSats, ONE_BTC_SATS);
  assert.equal(again.addresses[3]?.stale, true);
  assert.equal(again.totalStale, true);
  assert.equal(again.streakDays, 4);
  assert.equal(again.historyStale, true);
});

test("anycast connect failure falls through to a mempool.space backend", async () => {
  const hosts = new Set<string>();
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    hosts.add(new URL(url).host);
    if (url.startsWith("https://mempool.space/")) {
      throw new TypeError("fetch failed", { cause: { code: "UND_ERR_CONNECT_TIMEOUT" } });
    }
    if (url.includes("BTC-USD")) {
      return Response.json({ data: { amount: "50000", base: "BTC", currency: "USD" } });
    }
    const chain = url.match(/\/address\/([^/]+)\/txs\/chain/);
    if (chain) {
      const address = chain[1] ?? "";
      const index = ONBTC_ADDRESSES.findIndex((item) => item === address);
      if (index < 0) return new Response("no", { status: 404 });
      return Response.json([
        {
          txid: txid(index + 1),
          status: { confirmed: true, block_time: NOW - 3600 },
          vin: [{ prevout: { scriptpubkey_address: "1outside", value: ONE_BTC_SATS } }],
          vout: [{ scriptpubkey_address: address, value: ONE_BTC_SATS }],
        },
      ]);
    }
    if (url.includes("/txs/mempool")) return Response.json([]);
    return Response.json({
      chain_stats: { funded_txo_sum: ONE_BTC_SATS, spent_txo_sum: 0 },
    });
  };

  const desk = await loadSalvadorDesk(null, NOW * 1000, fetchImpl);
  assert.equal(desk.totalSats, ONBTC_ADDRESSES.length * ONE_BTC_SATS);
  assert.equal(desk.totalStale, false);
  assert.equal(desk.historyKnown, true);
  assert.equal(hosts.has("mempool.space"), true);
  assert.equal(hosts.has("node202.va1.mempool.space"), true);
});
