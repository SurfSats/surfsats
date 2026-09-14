import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDatabaseConfigured, sql } from "@/lib/db";
import { hashRef, slabLog } from "@/lib/slab-log";
import {
  applyStroke,
  expireBoard,
  isSlabCoat,
  isSlabColor,
  parseSlabPixels,
  type PendingSlab,
  type SlabCell,
  type SlabPixel,
  type SlabStain,
  type SlabStroke,
} from "@/lib/slab";
import { getTimechainHeight } from "@/lib/timechain";

type Store = {
  pending: Record<string, PendingSlab>;
  cells: SlabCell[];
  stains: SlabStain[];
  strokes: SlabStroke[];
};

const emptyStore = (): Store => ({
  pending: {},
  cells: [],
  stains: [],
  strokes: [],
});

const memory = emptyStore();
let loaded = false;
let writeChain: Promise<void> = Promise.resolve();
let warnedEphemeral = false;
let schemaReady: Promise<void> | null = null;

export function slabStoreKind() {
  return isDatabaseConfigured() ? "neon" : "ephemeral";
}

function warnEphemeral() {
  if (warnedEphemeral) return;
  warnedEphemeral = true;
  slabLog("warn", "store.ephemeral", {
    detail: "DATABASE_URL missing; the slab is not shared across servers",
  });
}

async function ensureNeonSchema() {
  const db = sql();
  if (!schemaReady) {
    schemaReady = (async () => {
      await db`CREATE TABLE IF NOT EXISTS slab_pending (
        payment_hash TEXT PRIMARY KEY,
        coat TEXT NOT NULL,
        color TEXT NOT NULL,
        pixels TEXT NOT NULL,
        callsign TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        amount_sats INTEGER NOT NULL
      )`;
      await db`CREATE TABLE IF NOT EXISTS slab_cells (
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        color TEXT NOT NULL,
        coat TEXT NOT NULL,
        callsign TEXT NOT NULL,
        painted_height INTEGER NOT NULL,
        expires_height INTEGER NOT NULL,
        payment_hash TEXT,
        PRIMARY KEY (x, y)
      )`;
      await db`CREATE INDEX IF NOT EXISTS slab_cells_expires_height
        ON slab_cells (expires_height)`;
      await db`CREATE TABLE IF NOT EXISTS slab_stains (
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        color TEXT NOT NULL,
        PRIMARY KEY (x, y)
      )`;
      await db`CREATE TABLE IF NOT EXISTS slab_strokes (
        payment_hash TEXT PRIMARY KEY,
        callsign TEXT NOT NULL,
        coat TEXT NOT NULL,
        color TEXT NOT NULL,
        pixel_count INTEGER NOT NULL,
        amount_sats INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        painted_height INTEGER NOT NULL
      )`;
      await db`CREATE INDEX IF NOT EXISTS slab_strokes_created_at
        ON slab_strokes (created_at)`;
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

function int(value: unknown) {
  const parsed = num(value);
  return parsed != null && Number.isInteger(parsed) ? parsed : null;
}

function parsePixelsJson(value: unknown): SlabPixel[] | null {
  if (Array.isArray(value)) return parseSlabPixels(value);
  if (typeof value === "string") {
    try {
      return parseSlabPixels(JSON.parse(value) as unknown);
    } catch {
      return null;
    }
  }
  return null;
}

function cellFromRow(row: Record<string, unknown>): SlabCell | null {
  const x = int(row.x);
  const y = int(row.y);
  const color = row.color;
  const coat = row.coat;
  const callsign = String(row.callsign ?? "").trim();
  const paintedHeight = int(row.painted_height ?? row.paintedHeight);
  const expiresHeight = int(row.expires_height ?? row.expiresHeight);
  if (
    x == null ||
    y == null ||
    !isSlabColor(color) ||
    !isSlabCoat(coat) ||
    !callsign ||
    paintedHeight == null ||
    expiresHeight == null
  ) {
    return null;
  }
  const paymentHash = String(row.payment_hash ?? row.paymentHash ?? "").trim();
  return {
    x,
    y,
    color,
    coat,
    callsign,
    paintedHeight,
    expiresHeight,
    ...(paymentHash ? { paymentHash } : {}),
  };
}

function stainFromRow(row: Record<string, unknown>): SlabStain | null {
  const x = int(row.x);
  const y = int(row.y);
  const color = row.color;
  if (x == null || y == null || !isSlabColor(color)) return null;
  return { x, y, color };
}

function strokeFromRow(row: Record<string, unknown>): SlabStroke | null {
  const paymentHash = String(row.payment_hash ?? row.paymentHash ?? "").trim();
  const callsign = String(row.callsign ?? "").trim();
  const coat = row.coat;
  const color = row.color;
  const pixelCount = int(row.pixel_count ?? row.pixelCount);
  const amountSats = int(row.amount_sats ?? row.amountSats);
  const createdAt = iso(row.created_at ?? row.createdAt);
  const paintedHeight = int(row.painted_height ?? row.paintedHeight);
  if (
    !paymentHash ||
    !callsign ||
    !isSlabCoat(coat) ||
    !isSlabColor(color) ||
    pixelCount == null ||
    amountSats == null ||
    !createdAt ||
    paintedHeight == null
  ) {
    return null;
  }
  return {
    paymentHash,
    callsign,
    coat,
    color,
    pixelCount,
    amountSats,
    createdAt,
    paintedHeight,
  };
}

function pendingFromRow(row: Record<string, unknown>): PendingSlab | null {
  const paymentHash = String(row.payment_hash ?? row.paymentHash ?? "").trim();
  const coat = row.coat;
  const color = row.color;
  const callsign = String(row.callsign ?? "").trim();
  const pixels = parsePixelsJson(row.pixels);
  const amountSats = int(row.amount_sats ?? row.amountSats);
  const createdAt = iso(row.created_at ?? row.createdAt);
  if (
    !paymentHash ||
    !isSlabCoat(coat) ||
    !isSlabColor(color) ||
    !callsign ||
    !pixels ||
    amountSats == null
  ) {
    return null;
  }
  return {
    paymentHash,
    coat,
    color,
    pixels,
    callsign,
    createdAt: createdAt || new Date().toISOString(),
    amountSats,
  };
}

export async function siteHeight() {
  const height = await getTimechainHeight();
  return height ?? 0;
}

async function neonExpire(height: number) {
  await ensureNeonSchema();
  const db = sql();
  await db`
    INSERT INTO slab_stains (x, y, color)
    SELECT x, y, color FROM slab_cells
    WHERE expires_height <= ${height}
    ON CONFLICT (x, y) DO UPDATE SET color = EXCLUDED.color
  `;
  await db`DELETE FROM slab_cells WHERE expires_height <= ${height}`;
}

async function neonGetCells() {
  await ensureNeonSchema();
  const db = sql();
  const rows = await db`
    SELECT x, y, color, coat, callsign, painted_height, expires_height, payment_hash
    FROM slab_cells
  `;
  return rows
    .map((row) => cellFromRow(row as Record<string, unknown>))
    .filter((cell): cell is SlabCell => Boolean(cell));
}

async function neonGetStains() {
  await ensureNeonSchema();
  const db = sql();
  const rows = await db`SELECT x, y, color FROM slab_stains`;
  return rows
    .map((row) => stainFromRow(row as Record<string, unknown>))
    .filter((stain): stain is SlabStain => Boolean(stain));
}

async function neonSavePending(pending: PendingSlab) {
  await ensureNeonSchema();
  const db = sql();
  const pixels = JSON.stringify(pending.pixels);
  await db`
    INSERT INTO slab_pending (
      payment_hash, coat, color, pixels, callsign, created_at, amount_sats
    )
    VALUES (
      ${pending.paymentHash},
      ${pending.coat},
      ${pending.color},
      ${pixels},
      ${pending.callsign},
      ${pending.createdAt},
      ${pending.amountSats}
    )
    ON CONFLICT (payment_hash) DO UPDATE SET
      coat = EXCLUDED.coat,
      color = EXCLUDED.color,
      pixels = EXCLUDED.pixels,
      callsign = EXCLUDED.callsign,
      created_at = EXCLUDED.created_at,
      amount_sats = EXCLUDED.amount_sats
  `;
  return pending;
}

async function neonGetPending(paymentHash: string) {
  await ensureNeonSchema();
  const db = sql();
  const rows = await db`
    SELECT payment_hash, coat, color, pixels, callsign, created_at, amount_sats
    FROM slab_pending
    WHERE payment_hash = ${paymentHash}
    LIMIT 1
  `;
  return rows[0] ? pendingFromRow(rows[0] as Record<string, unknown>) : null;
}

async function neonFindStroke(paymentHash: string) {
  await ensureNeonSchema();
  const db = sql();
  const rows = await db`
    SELECT payment_hash, callsign, coat, color, pixel_count, amount_sats,
           created_at, painted_height
    FROM slab_strokes
    WHERE payment_hash = ${paymentHash}
    LIMIT 1
  `;
  return rows[0] ? strokeFromRow(rows[0] as Record<string, unknown>) : null;
}

async function neonRecentStrokes(limit = 24) {
  await ensureNeonSchema();
  const db = sql();
  const rows = await db`
    SELECT payment_hash, callsign, coat, color, pixel_count, amount_sats,
           created_at, painted_height
    FROM slab_strokes
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows
    .map((row) => strokeFromRow(row as Record<string, unknown>))
    .filter((stroke): stroke is SlabStroke => Boolean(stroke));
}

async function neonSaveStroke(input: {
  stroke: SlabStroke;
  live: SlabCell[];
  stains: SlabStain[];
  painted: SlabCell[];
}) {
  await ensureNeonSchema();
  const db = sql();
  const { stroke, painted } = input;
  await db`
    INSERT INTO slab_strokes (
      payment_hash, callsign, coat, color, pixel_count, amount_sats,
      created_at, painted_height
    )
    VALUES (
      ${stroke.paymentHash},
      ${stroke.callsign},
      ${stroke.coat},
      ${stroke.color},
      ${stroke.pixelCount},
      ${stroke.amountSats},
      ${stroke.createdAt},
      ${stroke.paintedHeight}
    )
    ON CONFLICT (payment_hash) DO NOTHING
  `;
  for (const cell of painted) {
    await db`
      INSERT INTO slab_cells (
        x, y, color, coat, callsign, painted_height, expires_height, payment_hash
      )
      VALUES (
        ${cell.x},
        ${cell.y},
        ${cell.color},
        ${cell.coat},
        ${cell.callsign},
        ${cell.paintedHeight},
        ${cell.expiresHeight},
        ${cell.paymentHash ?? null}
      )
      ON CONFLICT (x, y) DO UPDATE SET
        color = EXCLUDED.color,
        coat = EXCLUDED.coat,
        callsign = EXCLUDED.callsign,
        painted_height = EXCLUDED.painted_height,
        expires_height = EXCLUDED.expires_height,
        payment_hash = EXCLUDED.payment_hash
    `;
    await db`DELETE FROM slab_stains WHERE x = ${cell.x} AND y = ${cell.y}`;
  }
  await db`DELETE FROM slab_pending WHERE payment_hash = ${stroke.paymentHash}`;
  return stroke;
}

function storePaths() {
  return [
    path.join(process.cwd(), "data", "slab.json"),
    path.join("/tmp", "surfsats-slab.json"),
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
        for (const [key, value] of Object.entries(parsed.pending)) {
          const pending = pendingFromRow(value as unknown as Record<string, unknown>);
          if (pending) memory.pending[key] = pending;
        }
      }
      if (Array.isArray(parsed.cells)) {
        for (const item of parsed.cells) {
          const cell = cellFromRow(item as unknown as Record<string, unknown>);
          if (!cell) continue;
          const exists = memory.cells.some(
            (current) => current.x === cell.x && current.y === cell.y,
          );
          if (!exists) memory.cells.push(cell);
        }
      }
      if (Array.isArray(parsed.stains)) {
        for (const item of parsed.stains) {
          const stain = stainFromRow(item as unknown as Record<string, unknown>);
          if (!stain) continue;
          const exists = memory.stains.some(
            (current) => current.x === stain.x && current.y === stain.y,
          );
          if (!exists) memory.stains.push(stain);
        }
      }
      if (Array.isArray(parsed.strokes)) {
        for (const item of parsed.strokes) {
          const stroke = strokeFromRow(item as unknown as Record<string, unknown>);
          if (!stroke) continue;
          const exists = memory.strokes.some(
            (current) => current.paymentHash === stroke.paymentHash,
          );
          if (!exists) memory.strokes.push(stroke);
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

function applyExpire(height: number) {
  const next = expireBoard({
    live: memory.cells,
    stains: memory.stains,
    currentHeight: height,
  });
  memory.cells = next.live;
  memory.stains = next.stains;
}

export async function saveSlabPending(pending: PendingSlab) {
  try {
    if (isDatabaseConfigured()) {
      const saved = await neonSavePending(pending);
      slabLog("info", "pending.saved", {
        hash: hashRef(pending.paymentHash),
        coat: pending.coat,
        pixels: pending.pixels.length,
        store: "neon",
      });
      return saved;
    }
    return withLock(async () => {
      await loadStore();
      memory.pending[pending.paymentHash] = pending;
      await persist();
      slabLog("info", "pending.saved", {
        hash: hashRef(pending.paymentHash),
        coat: pending.coat,
        pixels: pending.pixels.length,
        store: "ephemeral",
      });
      return pending;
    });
  } catch (error) {
    slabLog("error", "pending.save_failed", {
      hash: hashRef(pending.paymentHash),
      store: slabStoreKind(),
    });
    throw error;
  }
}

export async function getSlabPending(paymentHash: string) {
  if (isDatabaseConfigured()) return neonGetPending(paymentHash);
  await loadStore();
  return memory.pending[paymentHash] ?? null;
}

export async function getSlabBoard() {
  const height = await siteHeight();
  if (isDatabaseConfigured()) {
    await neonExpire(height);
    const [live, stains] = await Promise.all([neonGetCells(), neonGetStains()]);
    return { live, stains, height };
  }
  await loadStore();
  applyExpire(height);
  return {
    live: [...memory.cells],
    stains: [...memory.stains],
    height,
  };
}

export async function findSlabStroke(paymentHash: string) {
  if (isDatabaseConfigured()) return neonFindStroke(paymentHash);
  await loadStore();
  return (
    memory.strokes.find((stroke) => stroke.paymentHash === paymentHash) ?? null
  );
}

export async function getRecentSlabStrokes(limit = 24) {
  if (isDatabaseConfigured()) return neonRecentStrokes(limit);
  await loadStore();
  return [...memory.strokes]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}

export async function saveSlabStroke(input: {
  pending: PendingSlab;
  paintedHeight: number;
  paymentHash: string;
}) {
  const { pending, paintedHeight, paymentHash } = input;
  try {
    const board = await getSlabBoard();
    const next = applyStroke({
      live: board.live,
      stains: board.stains,
      pixels: pending.pixels,
      coat: pending.coat,
      color: pending.color,
      callsign: pending.callsign,
      paintedHeight,
      paymentHash,
    });
    const stroke: SlabStroke = {
      paymentHash,
      callsign: pending.callsign,
      coat: pending.coat,
      color: pending.color,
      pixelCount: next.painted.length,
      amountSats: pending.amountSats,
      createdAt: new Date().toISOString(),
      paintedHeight,
    };
    if (!next.painted.length) {
      return { stroke: null, live: next.live, stains: next.stains, height: paintedHeight };
    }
    if (isDatabaseConfigured()) {
      await neonSaveStroke({
        stroke,
        live: next.live,
        stains: next.stains,
        painted: next.painted,
      });
      slabLog("info", "stroke.saved", {
        hash: hashRef(paymentHash),
        coat: stroke.coat,
        pixels: stroke.pixelCount,
        store: "neon",
      });
      return {
        stroke,
        live: next.live,
        stains: next.stains,
        painted: next.painted,
        height: paintedHeight,
      };
    }
    return withLock(async () => {
      await loadStore();
      applyExpire(paintedHeight);
      memory.cells = next.live;
      memory.stains = next.stains;
      if (!memory.strokes.some((item) => item.paymentHash === paymentHash)) {
        memory.strokes.push(stroke);
      }
      delete memory.pending[paymentHash];
      await persist();
      slabLog("info", "stroke.saved", {
        hash: hashRef(paymentHash),
        coat: stroke.coat,
        pixels: stroke.pixelCount,
        store: "ephemeral",
      });
      return {
        stroke,
        live: next.live,
        stains: next.stains,
        painted: next.painted,
        height: paintedHeight,
      };
    });
  } catch (error) {
    slabLog("error", "stroke.save_failed", {
      hash: hashRef(paymentHash),
      store: slabStoreKind(),
    });
    throw error;
  }
}


