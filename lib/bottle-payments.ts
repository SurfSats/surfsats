import {
  createAlbyInvoice,
  getAlbyInvoice,
  invoiceAmountSats,
  invoicePaymentHash,
  isInvoiceSettled,
  type AlbyInvoice,
} from "@/lib/alby";
import { readCallsign, sanitizeCallsign } from "@/lib/callsign";
import type { CallsignEtch } from "@/lib/callsign";
import { rememberSettledCallsign } from "@/lib/callsign-store";
import {
  BOTTLE_MACHINE,
  BOTTLE_META_KIND,
  BOTTLE_PRICE_SATS,
  isBottleKind,
  pickBottleLine,
  type BottlePull,
} from "@/lib/bottle";
import { bottleLog, hashRef } from "@/lib/bottle-log";
import {
  bottleStoreKind,
  findBottleByHash,
  getBottlePending,
  getRecentBottleLines,
  loadBottleLines,
  saveBottlePending,
  saveBottlePull,
} from "@/lib/bottle-store";

export function parseBottlePayload(value: unknown) {
  if (!isBottleKind(value)) return null;
  const record = value as Record<string, unknown>;
  const callsign = readCallsign(record.callsign ?? record.alias);
  return {
    kind: BOTTLE_META_KIND,
    machine: BOTTLE_MACHINE,
    ...(callsign ? { callsign } : {}),
  };
}

export function isBottleInvoiceAmount(invoice: AlbyInvoice) {
  return invoiceAmountSats(invoice) === BOTTLE_PRICE_SATS;
}

async function createInvoice(callsign: string) {
  const metadata = {
    kind: BOTTLE_META_KIND,
    machine: BOTTLE_MACHINE,
    callsign,
  };
  try {
    return await createAlbyInvoice({
      amountSats: BOTTLE_PRICE_SATS,
      description: "SurfSats Message in a Bottle",
      metadata,
    });
  } catch {
    bottleLog("warn", "invoice.metadata_rejected", {
      store: bottleStoreKind(),
    });
    return createAlbyInvoice({
      amountSats: BOTTLE_PRICE_SATS,
      description: "SurfSats Message in a Bottle",
    });
  }
}

export async function createBottleInvoice(callsign: string) {
  const lines = await loadBottleLines();
  if (!lines.length) {
    throw Object.assign(new Error("the rack is empty"), { status: 503 });
  }
  const invoice = await createInvoice(callsign);
  const paymentHash = invoicePaymentHash(invoice);
  await saveBottlePending({
    paymentHash,
    createdAt: new Date().toISOString(),
    callsign,
  });
  const paymentRequest = invoice.payment_request as string;
  bottleLog("info", "invoice.created", {
    hash: hashRef(paymentHash),
    amountSats: BOTTLE_PRICE_SATS,
    store: bottleStoreKind(),
  });
  return {
    paymentHash,
    paymentRequest,
    amountSats: BOTTLE_PRICE_SATS,
    expiresAt: invoice.expires_at ?? null,
  };
}

export async function settleBottlePayment(paymentHash: string): Promise<{
  paid: boolean;
  pull: BottlePull | null;
  etch: CallsignEtch | null;
}> {
  const existing = await findBottleByHash(paymentHash);
  if (existing) {
    bottleLog("info", "settle.already_live", {
      hash: hashRef(paymentHash),
      store: bottleStoreKind(),
    });
    const etch = await rememberSettledCallsign({
      callsign: existing.alias,
      paymentHash,
      machine: "radio",
    });
    return { paid: true, pull: existing, etch };
  }

  const pending = await getBottlePending(paymentHash);
  const invoice = await getAlbyInvoice(paymentHash);
  if (!isInvoiceSettled(invoice)) {
    return { paid: false, pull: null, etch: null };
  }
  if (!isBottleInvoiceAmount(invoice)) {
    bottleLog("warn", "settle.wrong_amount", {
      hash: hashRef(paymentHash),
    });
    return { paid: false, pull: null, etch: null };
  }

  const ours = pending || parseBottlePayload(invoice.metadata);
  if (!ours) {
    return { paid: false, pull: null, etch: null };
  }

  const lines = await loadBottleLines();
  const recent = await getRecentBottleLines();
  const line = pickBottleLine(lines, recent);
  if (line == null) {
    bottleLog("error", "settle.no_lines", {
      hash: hashRef(paymentHash),
      store: bottleStoreKind(),
    });
    return { paid: true, pull: null, etch: null };
  }

  const callsign =
    pending?.callsign ||
    (ours && "callsign" in ours ? ours.callsign : undefined);
  const pull = await saveBottlePull({
    id: `b-${paymentHash.slice(0, 12)}`,
    line,
    createdAt: new Date().toISOString(),
    paymentHash,
    ...(callsign ? { alias: callsign } : {}),
  });
  const etch = await rememberSettledCallsign({
    callsign,
    paymentHash,
    machine: "radio",
  });
  return { paid: true, pull, etch };
}

export function pendingBottleFromBody(
  body: unknown,
): { callsign: string } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "SET CALLSIGN FIRST · 2–16 CHARS" };
  }
  const record = body as Record<string, unknown>;
  const parsed = sanitizeCallsign(String(record.callsign ?? record.alias ?? ""));
  if (!parsed.ok) return { error: "SET CALLSIGN FIRST · 2–16 CHARS" };
  return { callsign: parsed.callsign };
}
