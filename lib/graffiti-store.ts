import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDatabaseConfigured, sql } from "@/lib/db";
import { graffitiLog, hashRef } from "@/lib/graffiti-log";
import {
  GRAFFITI_TTL_MS,
  isActiveMark,
  isGraffitiColor,
  isGraffitiStyle,
  type GraffitiMark,
  type PendingGraffiti,
} from "@/lib/graffiti";

type Store = {
  pending: Record<string, PendingGraffiti>;
  paid: GraffitiMark[];
};

const emptyStore = (): Store => ({ pending: {}, paid: [] });

const memory = emptyStore();
let loaded = false;
let writeChain: Promise<void> = Promise.resolve();
let warnedEphemeral = false;
let schemaReady: Promise<void> | null = null;

type MarkRow = {
  id: unknown;
  payment_hash: unknown;
  text: unknown;
  style: unknown;
  color: unknown;
  top: unknown;
  left_pos: unknown;
  rotate: unknown;
  scale: unknown;
  created_at: unknown;
  expires_at: unknown;
};

export function graffitiStoreKind() {
  return isDatabaseConfigured() ? "neon" : "ephemeral";
}

function warnEphemeral() {
  if (warnedEphemeral) return;
  warnedEphemeral = true;
  graffitiLog("warn", "store.ephemeral", {
    detail: "DATABASE_URL missing; paid tags are not shared across servers",
  });
}

async function ensureNeonSchema() {
  const db = sql();
  if (!schemaReady) {
    schemaReady = (async () => {
      await db`CREATE TABLE IF NOT EXISTS graffiti_pending (
        payment_hash TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        style TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await db`ALTER TABLE graffiti_pending
        ADD COLUMN IF NOT EXISTS top DOUBLE PRECISION`;
      await db`ALTER TABLE graffiti_pending
        ADD COLUMN IF NOT EXISTS left_pos DOUBLE PRECISION`;
      await db`ALTER TABLE graffiti_pending
        ADD COLUMN IF NOT EXISTS rotate DOUBLE PRECISION`;
      await db`ALTER TABLE graffiti_pending
        ADD COLUMN IF NOT EXISTS scale DOUBLE PRECISION`;
      await db`CREATE TABLE IF NOT EXISTS graffiti_marks (
        id TEXT PRIMARY KEY,
        payment_hash TEXT NOT NULL UNIQUE,
        text TEXT NOT NULL,
        style TEXT NOT NULL,
        color TEXT NOT NULL,
        top DOUBLE PRECISION NOT NULL,
        left_pos DOUBLE PRECISION NOT NULL,
        rotate DOUBLE PRECISION NOT NULL,
        scale DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      )`;
      await db`CREATE INDEX IF NOT EXISTS graffiti_marks_expires_at
        ON graffiti_marks (expires_at)`;
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

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function markFromRow(row: MarkRow): GraffitiMark | null {
  const id = String(row.id ?? "").trim();
  const text = String(row.text ?? "").trim();
  const style = row.style;
  const color = row.color;
  const createdAt = iso(row.created_at);
  const expiresAt = iso(row.expires_at);
  const top = num(row.top);
  const left = num(row.left_pos);
  const rotate = num(row.rotate);
  const scale = num(row.scale);
  if (
    !id ||
    !text ||
    !createdAt ||
    !expiresAt ||
    top == null ||
    left == null ||
    rotate == null ||
    scale == null ||
    !isGraffitiStyle(style) ||
    !isGraffitiColor(color)
  ) {
    return null;
  }
  const paymentHash = String(row.payment_hash ?? "").trim();
  return {
    id,
    text,
    style,
    color,
    createdAt,
    expiresAt,
    top,
    left,
    rotate,
    scale,
    ...(paymentHash ? { paymentHash } : {}),
  };
}

async function neonSavePending(pending: PendingGraffiti) {
  await ensureNeonSchema();
  const db = sql();
  await db`
    INSERT INTO graffiti_pending (
      payment_hash, text, style, color, created_at,
      top, left_pos, rotate, scale
    )
    VALUES (
      ${pending.paymentHash},
      ${pending.text},
      ${pending.style},
      ${pending.color},
      ${pending.createdAt},
      ${pending.top ?? null},
      ${pending.left ?? null},
      ${pending.rotate ?? null},
      ${pending.scale ?? null}
    )
    ON CONFLICT (payment_hash) DO UPDATE SET
      text = EXCLUDED.text,
      style = EXCLUDED.style,
      color = EXCLUDED.color,
      created_at = EXCLUDED.created_at,
      top = EXCLUDED.top,
      left_pos = EXCLUDED.left_pos,
      rotate = EXCLUDED.rotate,
      scale = EXCLUDED.scale
  `;
  return pending;
}

async function neonGetPending(paymentHash: string) {
  await ensureNeonSchema();
  const db = sql();
  const rows = await db`
    SELECT payment_hash, text, style, color, created_at,
           top, left_pos, rotate, scale
    FROM graffiti_pending
    WHERE payment_hash = ${paymentHash}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const style = row.style;
  const color = row.color;
  const text = String(row.text ?? "").trim();
  if (!text || !isGraffitiStyle(style) || !isGraffitiColor(color)) return null;
  const top = num(row.top);
  const left = num(row.left_pos);
  const rotate = num(row.rotate);
  const scale = num(row.scale);
  return {
    paymentHash: String(row.payment_hash ?? paymentHash),
    text,
    style,
    color,
    createdAt: iso(row.created_at) || new Date().toISOString(),
    ...(top != null ? { top } : {}),
    ...(left != null ? { left } : {}),
    ...(rotate != null ? { rotate } : {}),
    ...(scale != null ? { scale } : {}),
  } satisfies PendingGraffiti;
}

async function neonSavePaidMark(mark: GraffitiMark) {
  await ensureNeonSchema();
  const db = sql();
  const paymentHash = mark.paymentHash ?? "";
  if (!paymentHash) {
    throw new Error("paid mark missing payment hash");
  }
  await db`
    INSERT INTO graffiti_marks (
      id, payment_hash, text, style, color,
      top, left_pos, rotate, scale, created_at, expires_at
    )
    VALUES (
      ${mark.id},
      ${paymentHash},
      ${mark.text},
      ${mark.style},
      ${mark.color},
      ${mark.top},
      ${mark.left},
      ${mark.rotate},
      ${mark.scale},
      ${mark.createdAt},
      ${mark.expiresAt}
    )
    ON CONFLICT (payment_hash) DO NOTHING
  `;
  await db`DELETE FROM graffiti_pending WHERE payment_hash = ${paymentHash}`;
  await db`DELETE FROM graffiti_marks WHERE expires_at <= NOW()`;
  return mark;
}

async function neonGetPaidMarks() {
  await ensureNeonSchema();
  const db = sql();
  const rows = await db`
    SELECT
      id, payment_hash, text, style, color,
      top, left_pos, rotate, scale, created_at, expires_at
    FROM graffiti_marks
    WHERE expires_at > NOW()
    ORDER BY created_at ASC
  `;
  return rows
    .map((row) => markFromRow(row as MarkRow))
    .filter((mark): mark is GraffitiMark => mark !== null && isActiveMark(mark));
}

async function neonFindPaidByHash(paymentHash: string) {
  await ensureNeonSchema();
  const db = sql();
  const rows = await db`
    SELECT
      id, payment_hash, text, style, color,
      top, left_pos, rotate, scale, created_at, expires_at
    FROM graffiti_marks
    WHERE payment_hash = ${paymentHash}
    LIMIT 1
  `;
  const mark = rows[0] ? markFromRow(rows[0] as MarkRow) : null;
  if (!mark || !isActiveMark(mark)) return null;
  return mark;
}

function storePaths() {
  return [
    path.join(process.cwd(), "data", "graffiti.json"),
    path.join("/tmp", "surfsats-graffiti.json"),
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
        for (const mark of parsed.paid) {
          if (!mark?.id) continue;
          const exists = memory.paid.some(
            (item) =>
              item.id === mark.id ||
              (mark.paymentHash && item.paymentHash === mark.paymentHash),
          );
          if (!exists) memory.paid.push(mark);
        }
      }
    } catch {
      // missing file or unreadable path — keep going
    }
  }
  pruneExpired();
  loaded = true;
  return memory;
}

function pruneExpired(now = Date.now()) {
  memory.paid = memory.paid.filter((mark) => isActiveMark(mark, now));
  const pendingCutoff = now - GRAFFITI_TTL_MS;
  for (const [hash, pending] of Object.entries(memory.pending)) {
    if (new Date(pending.createdAt).getTime() < pendingCutoff) {
      delete memory.pending[hash];
    }
  }
}

async function persist() {
  const payload = JSON.stringify(memory, null, 2);
  for (const file of storePaths()) {
    try {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, payload, "utf8");
    } catch {
      // Vercel project dirs are read-only; /tmp usually works
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

export async function savePending(pending: PendingGraffiti) {
  try {
    if (isDatabaseConfigured()) {
      const saved = await neonSavePending(pending);
      graffitiLog("info", "pending.saved", {
        hash: hashRef(pending.paymentHash),
        style: pending.style,
        color: pending.color,
        chars: pending.text.length,
        store: "neon",
      });
      return saved;
    }
    return withLock(async () => {
      await loadStore();
      memory.pending[pending.paymentHash] = pending;
      await persist();
      graffitiLog("info", "pending.saved", {
        hash: hashRef(pending.paymentHash),
        style: pending.style,
        color: pending.color,
        chars: pending.text.length,
        store: "ephemeral",
      });
      return pending;
    });
  } catch (error) {
    graffitiLog("error", "pending.save_failed", {
      hash: hashRef(pending.paymentHash),
      store: graffitiStoreKind(),
    });
    throw error;
  }
}

export async function getPending(paymentHash: string) {
  if (isDatabaseConfigured()) {
    return neonGetPending(paymentHash);
  }
  await loadStore();
  return memory.pending[paymentHash] ?? null;
}

export async function savePaidMark(mark: GraffitiMark) {
  try {
    if (isDatabaseConfigured()) {
      const saved = await neonSavePaidMark(mark);
      graffitiLog("info", "mark.saved", {
        id: mark.id,
        hash: hashRef(mark.paymentHash),
        style: mark.style,
        color: mark.color,
        expiresAt: mark.expiresAt,
        store: "neon",
      });
      return saved;
    }
    return withLock(async () => {
      await loadStore();
      pruneExpired();
      const exists = memory.paid.some(
        (item) =>
          item.id === mark.id ||
          (mark.paymentHash && item.paymentHash === mark.paymentHash),
      );
      if (!exists) memory.paid.push(mark);
      if (mark.paymentHash) delete memory.pending[mark.paymentHash];
      await persist();
      graffitiLog("info", exists ? "mark.duplicate" : "mark.saved", {
        id: mark.id,
        hash: hashRef(mark.paymentHash),
        style: mark.style,
        color: mark.color,
        expiresAt: mark.expiresAt,
        store: "ephemeral",
      });
      return mark;
    });
  } catch (error) {
    graffitiLog("error", "mark.save_failed", {
      id: mark.id,
      hash: hashRef(mark.paymentHash),
      store: graffitiStoreKind(),
    });
    throw error;
  }
}

export async function getPaidMarks() {
  if (isDatabaseConfigured()) {
    return neonGetPaidMarks();
  }
  await loadStore();
  pruneExpired();
  return memory.paid.filter((mark) => isActiveMark(mark));
}

export async function findPaidByHash(paymentHash: string) {
  if (isDatabaseConfigured()) {
    return neonFindPaidByHash(paymentHash);
  }
  await loadStore();
  pruneExpired();
  return memory.paid.find((mark) => mark.paymentHash === paymentHash) ?? null;
}
