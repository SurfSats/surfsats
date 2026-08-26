import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDatabaseConfigured, sql } from "@/lib/db";
import { bottleLog, hashRef } from "@/lib/bottle-log";
import {
  BOTTLE_AVOID,
  BOTTLE_RECENT,
  type BottlePending,
  type BottlePull,
} from "@/lib/bottle";

type Store = {
  pending: Record<string, BottlePending>;
  paid: BottlePull[];
};

const emptyStore = (): Store => ({ pending: {}, paid: [] });
const memory = emptyStore();
let loaded = false;
let writeChain: Promise<void> = Promise.resolve();
let warnedEphemeral = false;
let schemaReady: Promise<void> | null = null;

export function bottleStoreKind() {
  return isDatabaseConfigured() ? "neon" : "ephemeral";
}

function warnEphemeral() {
  if (warnedEphemeral) return;
  warnedEphemeral = true;
  bottleLog("warn", "store.ephemeral", {
    detail: "DATABASE_URL missing; bottles are not shared across servers",
  });
}

async function ensureNeonSchema() {
  const db = sql();
  if (!schemaReady) {
    schemaReady = (async () => {
      await db`CREATE TABLE IF NOT EXISTS bottle_pending (
        payment_hash TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await db`CREATE TABLE IF NOT EXISTS bottle_pulls (
        id TEXT PRIMARY KEY,
        payment_hash TEXT NOT NULL UNIQUE,
        line TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      )`;
      await db`CREATE INDEX IF NOT EXISTS bottle_pulls_created_at
        ON bottle_pulls (created_at DESC)`;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString();
  }
  return "";
}

function pullFromRow(row: Record<string, unknown>): BottlePull | null {
  const id = String(row.id ?? "").trim();
  const line = String(row.line ?? "");
  const createdAt = iso(row.created_at);
  if (!id || !createdAt) return null;
  const paymentHash = String(row.payment_hash ?? "").trim();
  return {
    id,
    line,
    createdAt,
    ...(paymentHash ? { paymentHash } : {}),
  };
}

function storePaths() {
  return [
    path.join(process.cwd(), "data", "bottles-paid.json"),
    path.join("/tmp", "surfsats-bottles.json"),
  ];
}

async function loadStore() {
  if (loaded) return memory;
  warnEphemeral();
  for (const file of storePaths()) {
    try {
      const raw = await readFile(file, "utf8");
      const parsed = JSON.parse(raw) as Partial<Store>;
      if (parsed.pending && typeof parsed.pending === "object") {
        Object.assign(memory.pending, parsed.pending);
      }
      if (Array.isArray(parsed.paid)) {
        for (const pull of parsed.paid) {
          if (!pull?.id) continue;
          const exists = memory.paid.some(
            (item) =>
              item.id === pull.id ||
              (pull.paymentHash && item.paymentHash === pull.paymentHash),
          );
          if (!exists) memory.paid.push(pull);
        }
      }
    } catch {
      // missing file
    }
  }
  loaded = true;
  return memory;
}

async function persist() {
  const payload = JSON.stringify(memory, null, 2);
  for (const file of storePaths()) {
    try {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, payload, "utf8");
    } catch {
      // /tmp usually works
    }
  }
}

function withLock<T>(fn: () => Promise<T>) {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function saveBottlePending(pending: BottlePending) {
  if (isDatabaseConfigured()) {
    await ensureNeonSchema();
    const db = sql();
    await db`
      INSERT INTO bottle_pending (payment_hash, created_at)
      VALUES (${pending.paymentHash}, ${pending.createdAt})
      ON CONFLICT (payment_hash) DO UPDATE SET
        created_at = EXCLUDED.created_at
    `;
    bottleLog("info", "pending.saved", {
      hash: hashRef(pending.paymentHash),
      store: "neon",
    });
    return pending;
  }
  return withLock(async () => {
    await loadStore();
    memory.pending[pending.paymentHash] = pending;
    await persist();
    bottleLog("info", "pending.saved", {
      hash: hashRef(pending.paymentHash),
      store: "ephemeral",
    });
    return pending;
  });
}

export async function getBottlePending(paymentHash: string) {
  if (isDatabaseConfigured()) {
    await ensureNeonSchema();
    const db = sql();
    const rows = await db`
      SELECT payment_hash, created_at
      FROM bottle_pending
      WHERE payment_hash = ${paymentHash}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      paymentHash: String(row.payment_hash ?? paymentHash),
      createdAt: iso(row.created_at) || new Date().toISOString(),
    } satisfies BottlePending;
  }
  await loadStore();
  return memory.pending[paymentHash] ?? null;
}

export async function findBottleByHash(paymentHash: string) {
  if (isDatabaseConfigured()) {
    await ensureNeonSchema();
    const db = sql();
    const rows = await db`
      SELECT id, payment_hash, line, created_at
      FROM bottle_pulls
      WHERE payment_hash = ${paymentHash}
      LIMIT 1
    `;
    return rows[0]
      ? pullFromRow(rows[0] as Record<string, unknown>)
      : null;
  }
  await loadStore();
  return (
    memory.paid.find((item) => item.paymentHash === paymentHash) ?? null
  );
}

export async function saveBottlePull(pull: BottlePull) {
  const paymentHash = pull.paymentHash ?? "";
  if (!paymentHash) throw new Error("bottle pull missing payment hash");
  if (isDatabaseConfigured()) {
    await ensureNeonSchema();
    const db = sql();
    await db`
      INSERT INTO bottle_pulls (id, payment_hash, line, created_at)
      VALUES (
        ${pull.id},
        ${paymentHash},
        ${pull.line},
        ${pull.createdAt}
      )
      ON CONFLICT (payment_hash) DO NOTHING
    `;
    await db`DELETE FROM bottle_pending WHERE payment_hash = ${paymentHash}`;
    bottleLog("info", "pull.saved", {
      hash: hashRef(paymentHash),
      store: "neon",
    });
    return (await findBottleByHash(paymentHash)) ?? pull;
  }
  return withLock(async () => {
    await loadStore();
    if (!memory.paid.some((item) => item.paymentHash === paymentHash)) {
      memory.paid.unshift(pull);
      memory.paid = memory.paid.slice(0, 200);
    }
    delete memory.pending[paymentHash];
    await persist();
    bottleLog("info", "pull.saved", {
      hash: hashRef(paymentHash),
      store: "ephemeral",
    });
    return memory.paid.find((item) => item.paymentHash === paymentHash) ?? pull;
  });
}

export async function getRecentBottlePulls(limit = BOTTLE_RECENT) {
  if (isDatabaseConfigured()) {
    await ensureNeonSchema();
    const db = sql();
    const rows = await db`
      SELECT id, payment_hash, line, created_at
      FROM bottle_pulls
      ORDER BY created_at DESC
      LIMIT 12
    `;
    return rows
      .map((row) => pullFromRow(row as Record<string, unknown>))
      .filter((item): item is BottlePull => Boolean(item))
      .slice(0, limit);
  }
  await loadStore();
  return [...memory.paid]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function getRecentBottleLines(limit = BOTTLE_AVOID) {
  const pulls = await getRecentBottlePulls(limit);
  return pulls.map((pull) => pull.line);
}

let linesCache: string[] | null = null;

export async function loadBottleLines(): Promise<string[]> {
  if (linesCache && linesCache.length) return linesCache;
  const file = path.join(process.cwd(), "public", "bottles.json");
  const raw = await readFile(file, "utf8");
  const parsed = JSON.parse(raw) as { lines?: unknown };
  const lines = Array.isArray(parsed.lines)
    ? parsed.lines.filter((item): item is string => typeof item === "string")
    : [];
  linesCache = lines;
  return lines;
}
