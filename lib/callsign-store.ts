import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDatabaseConfigured, sql } from "@/lib/db";
import {
  applyCallsignSighting,
  parseCallsignEtch,
  sanitizeCallsign,
  type CallsignEtch,
  type CallsignMachine,
} from "@/lib/callsign";

type Store = {
  etches: Record<string, CallsignEtch>;
};

const emptyStore = (): Store => ({ etches: {} });
const memory = emptyStore();
let loaded = false;
let writeChain: Promise<void> = Promise.resolve();
let warnedEphemeral = false;
let schemaReady: Promise<void> | null = null;

type LogLevel = "info" | "warn" | "error";

function hashRef(hash?: string | null) {
  if (!hash) return null;
  return hash.slice(0, 8);
}

function callsignLog(
  level: LogLevel,
  event: string,
  extra?: Record<string, unknown>,
) {
  const payload = extra ? { event, ...extra } : { event };
  if (level === "error") {
    console.error("[callsign]", payload);
    return;
  }
  if (level === "warn") {
    console.warn("[callsign]", payload);
    return;
  }
  console.info("[callsign]", payload);
}

export function callsignStoreKind() {
  return isDatabaseConfigured() ? "neon" : "ephemeral";
}

function warnEphemeral() {
  if (warnedEphemeral) return;
  warnedEphemeral = true;
  callsignLog("warn", "store.ephemeral", {
    detail: "DATABASE_URL missing; wall of glass is not shared across servers",
  });
}

async function ensureNeonSchema() {
  const db = sql();
  if (!schemaReady) {
    schemaReady = (async () => {
      await db`CREATE TABLE IF NOT EXISTS callsign_etches (
        callsign TEXT PRIMARY KEY,
        first_payment_hash TEXT NOT NULL,
        first_machine TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        block_height INTEGER,
        last_seen_at TIMESTAMPTZ NOT NULL,
        machines TEXT NOT NULL
      )`;
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

function etchFromRow(row: Record<string, unknown>): CallsignEtch | null {
  let machines: unknown = row.machines;
  if (typeof machines === "string") {
    try {
      machines = JSON.parse(machines) as unknown;
    } catch {
      machines = [];
    }
  }
  return parseCallsignEtch({
    callsign: row.callsign,
    firstPaymentHash: row.first_payment_hash,
    firstMachine: row.first_machine,
    createdAt: iso(row.created_at),
    lastSeenAt: iso(row.last_seen_at),
    blockHeight: row.block_height,
    machines,
  });
}

function storePaths() {
  return [
    path.join(process.cwd(), "data", "callsign.json"),
    path.join("/tmp", "surfsats-callsign.json"),
  ];
}

async function loadStore() {
  if (loaded) return memory;
  warnEphemeral();
  for (const file of storePaths()) {
    try {
      const raw = await readFile(file, "utf8");
      const parsed = JSON.parse(raw) as Partial<Store>;
      if (parsed.etches && typeof parsed.etches === "object") {
        for (const [key, value] of Object.entries(parsed.etches)) {
          const etch = parseCallsignEtch(value);
          if (etch) memory.etches[key] = etch;
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

async function neonGetEtch(callsign: string) {
  await ensureNeonSchema();
  const db = sql();
  const rows = await db`
    SELECT
      callsign, first_payment_hash, first_machine, created_at,
      block_height, last_seen_at, machines
    FROM callsign_etches
    WHERE callsign = ${callsign}
    LIMIT 1
  `;
  return rows[0] ? etchFromRow(rows[0] as Record<string, unknown>) : null;
}

async function neonListEtches() {
  await ensureNeonSchema();
  const db = sql();
  const rows = await db`
    SELECT
      callsign, first_payment_hash, first_machine, created_at,
      block_height, last_seen_at, machines
    FROM callsign_etches
    ORDER BY created_at ASC
  `;
  return rows
    .map((row) => etchFromRow(row as Record<string, unknown>))
    .filter((etch): etch is CallsignEtch => Boolean(etch));
}

async function neonSaveEtch(etch: CallsignEtch) {
  await ensureNeonSchema();
  const db = sql();
  const machines = JSON.stringify(etch.machines);
  await db`
    INSERT INTO callsign_etches (
      callsign, first_payment_hash, first_machine, created_at,
      block_height, last_seen_at, machines
    )
    VALUES (
      ${etch.callsign},
      ${etch.firstPaymentHash},
      ${etch.firstMachine},
      ${etch.createdAt},
      ${etch.blockHeight ?? null},
      ${etch.lastSeenAt},
      ${machines}
    )
    ON CONFLICT (callsign) DO UPDATE SET
      last_seen_at = EXCLUDED.last_seen_at,
      machines = EXCLUDED.machines
  `;
  return etch;
}

async function tipHeight() {
  try {
    const response = await fetch("https://mempool.space/api/blocks/tip/height", {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return undefined;
    const n = Number((await response.text()).trim());
    return Number.isFinite(n) ? n : undefined;
  } catch {
    return undefined;
  }
}

export async function getCallsignEtch(name: string) {
  const parsed = sanitizeCallsign(name);
  if (!parsed.ok) return null;
  if (isDatabaseConfigured()) return neonGetEtch(parsed.callsign);
  await loadStore();
  return memory.etches[parsed.callsign] ?? null;
}

export async function listCallsignEtches() {
  if (isDatabaseConfigured()) return neonListEtches();
  await loadStore();
  return Object.values(memory.etches).sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function rememberCallsign(input: {
  callsign: string;
  paymentHash: string;
  machine: CallsignMachine;
  blockHeight?: number;
  now?: string;
}): Promise<CallsignEtch | null> {
  const parsed = sanitizeCallsign(input.callsign);
  if (!parsed.ok) return null;
  const paymentHash = input.paymentHash.trim();
  if (!paymentHash) return null;
  const at = input.now || new Date().toISOString();

  try {
    const existing = await getCallsignEtch(parsed.callsign);
    const blockHeight =
      existing?.blockHeight ??
      input.blockHeight ??
      (existing ? undefined : await tipHeight());
    const next = applyCallsignSighting(existing, {
      callsign: parsed.callsign,
      paymentHash,
      machine: input.machine,
      at,
      blockHeight,
    });

    if (isDatabaseConfigured()) {
      const saved = await neonSaveEtch(next);
      callsignLog("info", existing ? "etch.seen" : "etch.burned", {
        callsign: saved.callsign,
        machine: input.machine,
        hash: hashRef(paymentHash),
        store: "neon",
      });
      return saved;
    }

    return withLock(async () => {
      await loadStore();
      memory.etches[next.callsign] = next;
      await persist();
      callsignLog("info", existing ? "etch.seen" : "etch.burned", {
        callsign: next.callsign,
        machine: input.machine,
        hash: hashRef(paymentHash),
        store: "ephemeral",
      });
      return next;
    });
  } catch (error) {
    callsignLog("error", "etch.failed", {
      callsign: parsed.callsign,
      machine: input.machine,
      hash: hashRef(paymentHash),
      store: callsignStoreKind(),
    });
    throw error;
  }
}

export async function rememberSettledCallsign(input: {
  callsign?: string | null;
  paymentHash: string;
  machine: CallsignMachine;
}): Promise<CallsignEtch | null> {
  const callsign = String(input.callsign ?? "").trim();
  if (!callsign) return null;
  try {
    return await rememberCallsign({
      callsign,
      paymentHash: input.paymentHash,
      machine: input.machine,
    });
  } catch {
    return null;
  }
}
