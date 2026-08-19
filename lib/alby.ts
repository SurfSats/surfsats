import { GRAFFITI_PRICE_SATS } from "@/lib/graffiti";

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

export async function createAlbyInvoice(input: {
  amountSats: number;
  description: string;
  metadata?: Record<string, unknown>;
  comment?: string;
}) {
  const body = await albyFetch("/invoices", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountSats,
      description: input.description,
      memo: input.description,
      comment: input.comment,
      metadata: input.metadata ?? {},
    }),
  });

  const invoice = asInvoice(body);
  if (!invoice?.payment_request || !invoicePaymentHash(invoice)) {
    throw Object.assign(new Error("could not create invoice. try again"), {
      status: 502,
    });
  }
  return invoice;
}

export async function getAlbyInvoice(paymentHash: string) {
  const body = await albyFetch(`/invoices/${encodeURIComponent(paymentHash)}`);
  const invoice = asInvoice(body);
  if (!invoice) {
    throw Object.assign(new Error("invoice not found"), { status: 404 });
  }
  return invoice;
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

export function asInvoice(value: unknown): AlbyInvoice | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    amount: numberOrNull(record.amount),
    value: numberOrNull(record.value),
    payment_hash: stringOrNull(record.payment_hash),
    r_hash_str: stringOrNull(record.r_hash_str),
    payment_request: stringOrNull(record.payment_request),
    expires_at: stringOrNull(record.expires_at),
    settled: typeof record.settled === "boolean" ? record.settled : null,
    settled_at: stringOrNull(record.settled_at),
    state: stringOrNull(record.state),
    identifier: stringOrNull(record.identifier),
    metadata: record.metadata,
    memo: stringOrNull(record.memo),
    description: stringOrNull(record.description),
    type: stringOrNull(record.type),
  };
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
