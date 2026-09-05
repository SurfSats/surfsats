import { randomBytes } from "node:crypto";
import type { AlbyInvoice } from "@/lib/alby";

export const MOCK_HASH_PREFIX = "devmock";
export const MOCK_SETTLE_MS = 8000;

type EnvMap = Record<string, string | undefined>;

type MockRecord = {
  invoice: AlbyInvoice;
  createdAt: number;
};

const mocks = new Map<string, MockRecord>();

export function isDevLightningFallback(env: EnvMap = process.env) {
  return env.NODE_ENV === "development";
}

export function lightningMode(
  env: EnvMap = process.env,
): "alby" | "mock" | "offline" {
  if (env.ALBY_ACCESS_TOKEN?.trim()) return "alby";
  if (isDevLightningFallback(env)) return "mock";
  return "offline";
}

export function canServeLightning(env: EnvMap = process.env) {
  return lightningMode(env) !== "offline";
}

export function isMockPaymentHash(hash: string) {
  return hash.startsWith(MOCK_HASH_PREFIX);
}

function amountHex(amountSats: number) {
  const n = Math.max(0, Math.floor(amountSats));
  return n.toString(16).padStart(8, "0");
}

function amountFromHash(hash: string) {
  const hex = hash.slice(MOCK_HASH_PREFIX.length, MOCK_HASH_PREFIX.length + 8);
  const parsed = Number.parseInt(hex, 16);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function createMockInvoice({
  amountSats,
  description,
  metadata,
  now = Date.now(),
}: {
  amountSats: number;
  description: string;
  metadata?: Record<string, unknown>;
  now?: number;
}): AlbyInvoice {
  const paymentHash = `${MOCK_HASH_PREFIX}${amountHex(amountSats)}${randomBytes(16).toString("hex")}`;
  const paymentRequest =
    `lnbc${amountSats}n1mock${paymentHash}${randomBytes(24).toString("hex")}`.toLowerCase();
  const invoice: AlbyInvoice = {
    amount: amountSats,
    value: amountSats,
    payment_hash: paymentHash,
    r_hash_str: paymentHash,
    payment_request: paymentRequest,
    expires_at: new Date(now + 50 * 60 * 1000).toISOString(),
    settled: false,
    settled_at: null,
    state: "OPEN",
    identifier: paymentHash,
    metadata: metadata ?? null,
    memo: description,
    description,
    type: "incoming",
  };
  mocks.set(paymentHash, { invoice, createdAt: now });
  return invoice;
}

export function getMockInvoice(
  paymentHash: string,
  { now = Date.now() }: { now?: number } = {},
): AlbyInvoice | null {
  if (!isMockPaymentHash(paymentHash)) return null;

  const stored = mocks.get(paymentHash);
  if (stored) {
    const settled = now - stored.createdAt >= MOCK_SETTLE_MS;
    return {
      ...stored.invoice,
      settled,
      settled_at: settled
        ? new Date(stored.createdAt + MOCK_SETTLE_MS).toISOString()
        : null,
      state: settled ? "SETTLED" : "OPEN",
    };
  }

  const amount = amountFromHash(paymentHash);
  if (!amount) return null;
  return {
    amount,
    value: amount,
    payment_hash: paymentHash,
    r_hash_str: paymentHash,
    payment_request: `lnbc${amount}n1mock${paymentHash}${"ab".repeat(24)}`,
    expires_at: new Date(now + 50 * 60 * 1000).toISOString(),
    settled: true,
    settled_at: new Date(now).toISOString(),
    state: "SETTLED",
    identifier: paymentHash,
    metadata: null,
    memo: "mock",
    description: "mock",
    type: "incoming",
  };
}
