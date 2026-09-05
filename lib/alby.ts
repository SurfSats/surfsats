import { createHmac, timingSafeEqual } from "node:crypto";
import { GRAFFITI_PRICE_SATS } from "@/lib/graffiti";
import {
  canServeLightning,
  createMockInvoice,
  getMockInvoice,
  isDevLightningFallback,
  isMockPaymentHash,
  lightningMode,
} from "@/lib/lightning-mock";

export { canServeLightning };

const ALBY_API_BASE =
  process.env.ALBY_API_BASE?.replace(/\/$/, "") || "https://api.getalby.com";

export type AlbyInvoice = {
  amount?: number | null;
  value?: number | null;
  payment_hash?: string | null;
  r_hash_str?: string | null;
  payment_request?: string | null;
  expires_at?: string | null;
  settled?: boolean | null;
  settled_at?: string | null;
  state?: string | null;
  identifier?: string | null;
  metadata?: unknown;
  memo?: string | null;
  description?: string | null;
  type?: string | null;
  preimage?: string | null;
};

export type AlbyError = {
  status: number;
  message: string;
};

export function isAlbyConfigured() {
  return Boolean(process.env.ALBY_ACCESS_TOKEN?.trim());
}

function token() {
  const value = process.env.ALBY_ACCESS_TOKEN?.trim();
  if (!value) {
    throw Object.assign(new Error("lightning is offline right now"), {
      status: 503,
    });
  }
  return value;
}

async function albyFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${ALBY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw Object.assign(new Error(publicAlbyFailure(response.status)), {
      status: response.status >= 500 ? 502 : response.status === 401 || response.status === 403 ? 503 : 502,
    });
  }

  return (await response.json()) as unknown;
}

export function publicAlbyFailure(status?: number) {
  if (status === 401 || status === 403) return "lightning is offline right now";
  return "could not reach lightning. try again";
}

export function publicErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: string }).message || "");
    if (
      message &&
      !/bearer|token|authorization|alby_access/i.test(message)
    ) {
      return message;
    }
  }
  return "lightning is offline right now";
}

export function publicErrorStatus(error: unknown) {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status?: number }).status);
    if (status >= 400 && status < 600) return status;
  }
  return 502;
}

function logLightningFallback(
  reason: string,
  extra?: Record<string, unknown>,
  level: "warn" | "error" = "error",
) {
  if (level === "warn") {
    console.warn("[lightning]", reason, extra ?? {});
    return;
  }
  console.error("[lightning]", reason, extra ?? {});
}

function mockOrThrow(input: {
  amountSats: number;
  description: string;
  metadata?: Record<string, unknown>;
}, reason: string, extra?: Record<string, unknown>) {
  if (!isDevLightningFallback()) {
    throw Object.assign(new Error("lightning is offline right now"), {
      status: 503,
    });
  }
  logLightningFallback(reason, extra);
  return createMockInvoice(input);
}

export async function createAlbyInvoice(input: {
  amountSats: number;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  const mode = lightningMode();
  if (mode === "mock") {
    logLightningFallback(
      "ALBY_ACCESS_TOKEN missing; using mock invoice",
      {},
      "warn",
    );
    return createMockInvoice(input);
  }

  const payload: Record<string, unknown> = {
    amount: input.amountSats,
    description: input.description,
  };
  if (input.metadata) payload.metadata = input.metadata;

  try {
    const body = await albyFetch("/invoices", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const invoice = asInvoice(body);
    if (
      !invoice?.payment_request ||
      !invoice.payment_request.toLowerCase().startsWith("ln") ||
      !invoicePaymentHash(invoice)
    ) {
      throw Object.assign(new Error("could not create invoice. try again"), {
        status: 502,
      });
    }
    return invoice;
  } catch (error) {
    if (isDevLightningFallback()) {
      return mockOrThrow(input, "Alby create invoice failed; using mock", {
        status: publicErrorStatus(error),
        message: publicErrorMessage(error),
      });
    }
    throw error;
  }
}

export async function getAlbyInvoice(paymentHash: string) {
  if (isMockPaymentHash(paymentHash)) {
    const mock = getMockInvoice(paymentHash);
    if (mock) return mock;
    throw Object.assign(new Error("invoice not found"), { status: 404 });
  }

  if (lightningMode() !== "alby") {
    throw Object.assign(new Error("lightning is offline right now"), {
      status: 503,
    });
  }

  try {
    const body = await albyFetch(`/invoices/${encodeURIComponent(paymentHash)}`);
    const invoice = asInvoice(body);
    if (!invoice) {
      throw Object.assign(new Error("invoice not found"), { status: 404 });
    }
    return invoice;
  } catch (error) {
    if (isDevLightningFallback()) {
      logLightningFallback("Alby lookup failed", {
        status: publicErrorStatus(error),
        message: publicErrorMessage(error),
      });
    }
    throw error;
  }
}

export async function listIncomingInvoices(items = 50) {
  const body = await albyFetch(`/invoices/incoming?items=${items}`);
  if (!Array.isArray(body)) return [];
  return body
    .map((item) => asInvoice(item))
    .filter((item): item is AlbyInvoice => Boolean(item));
}

export function invoicePaymentHash(invoice: AlbyInvoice) {
  return invoice.payment_hash || invoice.r_hash_str || "";
}

export function invoicePreimage(invoice: AlbyInvoice) {
  return invoice.preimage || "";
}

export function invoiceAmountSats(invoice: AlbyInvoice) {
  const amount = Number(invoice.amount);
  if (Number.isFinite(amount) && amount > 0) return amount;
  const value = Number(invoice.value);
  if (Number.isFinite(value) && value > 0) return value;
  return 0;
}

export function isInvoiceSettled(invoice: AlbyInvoice) {
  if (invoice.settled === true) return true;
  return String(invoice.state || "").toUpperCase() === "SETTLED";
}

export function isGraffitiInvoiceAmount(invoice: AlbyInvoice) {
  return invoiceAmountSats(invoice) === GRAFFITI_PRICE_SATS;
}

function asBolt11(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, "").trim();
  if (cleaned.length < 80) return null;
  if (!cleaned.toLowerCase().startsWith("ln")) return null;
  return cleaned;
}

export function asInvoice(value: unknown): AlbyInvoice | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const nested =
    record.invoice && typeof record.invoice === "object"
      ? (record.invoice as Record<string, unknown>)
      : null;
  const paymentRequest =
    asBolt11(record.payment_request) ||
    asBolt11(record.bolt11) ||
    asBolt11(record.pay_req) ||
    asBolt11(nested?.payment_request) ||
    asBolt11(nested?.bolt11);
  return {
    amount: numberOrNull(record.amount) ?? numberOrNull(nested?.amount),
    value: numberOrNull(record.value) ?? numberOrNull(nested?.value),
    payment_hash:
      stringOrNull(record.payment_hash) ||
      stringOrNull(nested?.payment_hash),
    r_hash_str: stringOrNull(record.r_hash_str) || stringOrNull(nested?.r_hash_str),
    payment_request: paymentRequest,
    expires_at: stringOrNull(record.expires_at),
    settled: typeof record.settled === "boolean" ? record.settled : null,
    settled_at: stringOrNull(record.settled_at),
    state: stringOrNull(record.state),
    identifier: stringOrNull(record.identifier),
    metadata: record.metadata,
    memo: stringOrNull(record.memo),
    description: stringOrNull(record.description),
    type: stringOrNull(record.type),
    preimage:
      stringOrNull(record.preimage) ||
      stringOrNull(record.payment_preimage) ||
      stringOrNull(record.r_preimage) ||
      stringOrNull(nested?.preimage) ||
      stringOrNull(nested?.payment_preimage) ||
      stringOrNull(nested?.r_preimage),
  };
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function webhookSecretConfigured() {
  return Boolean(process.env.ALBY_WEBHOOK_SECRET?.trim());
}

/** Svix signature check used by Alby webhooks. Skips if no secret is set. */
export function verifyAlbyWebhook(rawBody: string, headers: Headers) {
  const secret = process.env.ALBY_WEBHOOK_SECRET?.trim();
  if (!secret) return { ok: true as const, skipped: true };

  const id = headers.get("svix-id") || headers.get("webhook-id");
  const timestamp =
    headers.get("svix-timestamp") || headers.get("webhook-timestamp");
  const signature =
    headers.get("svix-signature") || headers.get("webhook-signature");
  if (!id || !timestamp || !signature) {
    return { ok: false as const, skipped: false };
  }

  const ageSec = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (Number.isFinite(ageSec) && ageSec > 5 * 60) {
    return { ok: false as const, skipped: false };
  }

  const keyPart = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key = Buffer.from(keyPart, "base64");
  if (!key.length) key = Buffer.from(secret, "utf8");

  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  const valid = signature.split(/\s+/).some((part) => {
    const value = part.includes(",") ? part.slice(part.lastIndexOf(",") + 1) : part;
    const got = Buffer.from(value);
    return got.length === expectedBuf.length && timingSafeEqual(got, expectedBuf);
  });

  return { ok: valid, skipped: false };
}

export function webhookEventType(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const record = body as Record<string, unknown>;
  return String(record.type || record.event_type || record.filter_type || "");
}

export function webhookInvoicePayload(body: unknown) {
  if (!body || typeof body !== "object") return asInvoice(body);
  const record = body as Record<string, unknown>;
  return (
    asInvoice(body) ||
    asInvoice(record.data) ||
    asInvoice(record.invoice)
  );
}
