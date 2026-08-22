import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDatabaseConfigured, sql } from "@/lib/db";
import { hashRef, storyLog } from "@/lib/story-log";
import {
  type PendingStory,
  type StoryLine,
  seedStory,
} from "@/lib/story";

type Store = {
  pending: Record<string, PendingStory>;
  paid: StoryLine[];
};

const emptyStore = (): Store => ({ pending: {}, paid: [] });
const memory = emptyStore();
let loaded = false;
let writeChain: Promise<void> = Promise.resolve();
let warnedEphemeral = false;
let schemaReady: Promise<void> | null = null;

export function storyStoreKind() {
  return isDatabaseConfigured() ? "neon" : "ephemeral";
}

function warnEphemeral() {
  if (warnedEphemeral) return;
  warnedEphemeral = true;
  storyLog("warn", "store.ephemeral", {
    detail: "DATABASE_URL missing; lines are not shared across servers",
  });
}

async function ensureNeonSchema() {
  const db = sql();
  if (!schemaReady) {
    schemaReady = (async () => {
      await db`CREATE TABLE IF NOT EXISTS story_pending (
        payment_hash TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        alias TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await db`CREATE TABLE IF NOT EXISTS story_lines (
        id TEXT PRIMARY KEY,
        payment_hash TEXT NOT NULL UNIQUE,
        text TEXT NOT NULL,
        alias TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      )`;
      await db`CREATE INDEX IF NOT EXISTS story_lines_created_at
        ON story_lines (created_at)`;
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

function lineFromRow(row: Record<string, unknown>): StoryLine | null {
  const id = String(row.id ?? "").trim();
  const text = String(row.text ?? "").trim();
  const alias = String(row.alias ?? "").trim() || "anon";
  const createdAt = iso(row.created_at);
  if (!id || !text || !createdAt) return null;
  const paymentHash = String(row.payment_hash ?? "").trim();
  return {
    id,
    text,
    alias,
    createdAt,
    ...(paymentHash ? { paymentHash } : {}),
  };
}

async function neonSavePending(pending: PendingStory) {
  await ensureNeonSchema();
  const db = sql();
  await db`
    INSERT INTO story_pending (payment_hash, text, alias, created_at)
    VALUES (
      ${pending.paymentHash},
      ${pending.text},
      ${pending.alias},
      ${pending.createdAt}
    )
    ON CONFLICT (payment_hash) DO UPDATE SET
      text = EXCLUDED.text,
      alias = EXCLUDED.alias,
      created_at = EXCLUDED.created_at
  `;
  return pending;
}

async function neonGetPending(paymentHash: string) {
  await ensureNeonSchema();
  const db = sql();
  const rows = await db`
    SELECT payment_hash, text, alias, created_at
    FROM story_pending
    WHERE payment_hash = ${paymentHash}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const text = String(row.text ?? "").trim();
  if (!text) return null;
  return {
    paymentHash: String(row.payment_hash ?? paymentHash),
    text,
    alias: String(row.alias ?? "anon").trim() || "anon",
    createdAt: iso(row.created_at) || new Date().toISOString(),
  } satisfies PendingStory;
}

async function neonSaveLine(line: StoryLine) {
  await ensureNeonSchema();
  const db = sql();
  const paymentHash = line.paymentHash ?? "";
  if (!paymentHash) throw new Error("story line missing payment hash");
  await db`
    INSERT INTO story_lines (id, payment_hash, text, alias, created_at)
    VALUES (
      ${line.id},
      ${paymentHash},
      ${line.text},
      ${line.alias},
      ${line.createdAt}
    )
    ON CONFLICT (payment_hash) DO NOTHING
  `;
  await db`DELETE FROM story_pending WHERE payment_hash = ${paymentHash}`;
  return line;
}

async function neonGetLines() {
  await ensureNeonSchema();
  const db = sql();
  const rows = await db`
    SELECT id, payment_hash, text, alias, created_at
    FROM story_lines
    ORDER BY created_at ASC
  `;
  return rows
    .map((row) => lineFromRow(row as Record<string, unknown>))
    .filter((line): line is StoryLine => Boolean(line));
}

async function neonFindByHash(paymentHash: string) {
  await ensureNeonSchema();
  const db = sql();
  const rows = await db`
    SELECT id, payment_hash, text, alias, created_at
    FROM story_lines
    WHERE payment_hash = ${paymentHash}
    LIMIT 1
  `;
  return rows[0] ? lineFromRow(rows[0] as Record<string, unknown>) : null;
}

async function neonLastLine() {
  await ensureNeonSchema();
  const db = sql();
  const rows = await db`
    SELECT id, payment_hash, text, alias, created_at
    FROM story_lines
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] ? lineFromRow(rows[0] as Record<string, unknown>) : null;
}

function storePaths() {
  return [
    path.join(process.cwd(), "data", "story.json"),
    path.join("/tmp", "surfsats-story.json"),
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
        for (const line of parsed.paid) {
          if (!line?.id) continue;
          const exists = memory.paid.some(
            (item) =>
              item.id === line.id ||
              (line.paymentHash && item.paymentHash === line.paymentHash),
          );
          if (!exists) memory.paid.push(line);
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
      // ignore
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

function mergePublic(paid: StoryLine[]) {
  const byId = new Map<string, StoryLine>();
  for (const line of [...seedStory, ...paid]) {
    byId.set(line.id, line);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function saveStoryPending(pending: PendingStory) {
  try {
    if (isDatabaseConfigured()) {
      const saved = await neonSavePending(pending);
      storyLog("info", "pending.saved", {
        hash: hashRef(pending.paymentHash),
        chars: pending.text.length,
        store: "neon",
      });
      return saved;
    }
    return withLock(async () => {
      await loadStore();
      memory.pending[pending.paymentHash] = pending;
      await persist();
      storyLog("info", "pending.saved", {
        hash: hashRef(pending.paymentHash),
        chars: pending.text.length,
        store: "ephemeral",
      });
      return pending;
    });
  } catch (error) {
    storyLog("error", "pending.save_failed", {
      hash: hashRef(pending.paymentHash),
      store: storyStoreKind(),
    });
    throw error;
  }
}

export async function getStoryPending(paymentHash: string) {
  if (isDatabaseConfigured()) return neonGetPending(paymentHash);
  await loadStore();
  return memory.pending[paymentHash] ?? null;
}

export async function saveStoryLine(line: StoryLine) {
  try {
    if (isDatabaseConfigured()) {
      const saved = await neonSaveLine(line);
      storyLog("info", "line.saved", {
        id: line.id,
        hash: hashRef(line.paymentHash),
        store: "neon",
      });
      return saved;
    }
    return withLock(async () => {
      await loadStore();
      const exists = memory.paid.some(
        (item) =>
          item.id === line.id ||
          (line.paymentHash && item.paymentHash === line.paymentHash),
      );
      if (!exists) memory.paid.push(line);
      if (line.paymentHash) delete memory.pending[line.paymentHash];
      await persist();
      storyLog("info", exists ? "line.duplicate" : "line.saved", {
        id: line.id,
        hash: hashRef(line.paymentHash),
        store: "ephemeral",
      });
      return line;
    });
  } catch (error) {
    storyLog("error", "line.save_failed", {
      id: line.id,
      hash: hashRef(line.paymentHash),
      store: storyStoreKind(),
    });
    throw error;
  }
}

export async function getStoryLines() {
  if (isDatabaseConfigured()) {
    return mergePublic(await neonGetLines());
  }
  await loadStore();
  return mergePublic(memory.paid);
}

export async function findStoryByHash(paymentHash: string) {
  if (isDatabaseConfigured()) return neonFindByHash(paymentHash);
  await loadStore();
  return memory.paid.find((line) => line.paymentHash === paymentHash) ?? null;
}

export async function getLastStoryLine() {
  const lines = await getStoryLines();
  return lines[lines.length - 1] ?? null;
}

export async function getLastPaidStoryLine() {
  if (isDatabaseConfigured()) return neonLastLine();
  await loadStore();
  return memory.paid[memory.paid.length - 1] ?? null;
}
