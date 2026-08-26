import {
  createAlbyInvoice,
  getAlbyInvoice,
  invoiceAmountSats,
  invoicePaymentHash,
  isInvoiceSettled,
  type AlbyInvoice,
} from "@/lib/alby";
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
  return { kind: BOTTLE_META_KIND, machine: BOTTLE_MACHINE };
}

export function isBottleInvoiceAmount(invoice: AlbyInvoice) {
  return invoiceAmountSats(invoice) === BOTTLE_PRICE_SATS;
}

async function createInvoice() {
  const metadata = {
    kind: BOTTLE_META_KIND,
    machine: BOTTLE_MACHINE,
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

export async function createBottleInvoice() {
  const lines = await loadBottleLines();
  if (!lines.length) {
    throw Object.assign(new Error("the rack is empty"), { status: 503 });
  }
  const invoice = await createInvoice();
  const paymentHash = invoicePaymentHash(invoice);
  await saveBottlePending({
    paymentHash,
    createdAt: new Date().toISOString(),
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
}> {
  const existing = await findBottleByHash(paymentHash);
  if (existing) {
    bottleLog("info", "settle.already_live", {
      hash: hashRef(paymentHash),
      store: bottleStoreKind(),
    });
    return { paid: true, pull: existing };
  }

  const pending = await getBottlePending(paymentHash);
  const invoice = await getAlbyInvoice(paymentHash);
  if (!isInvoiceSettled(invoice)) {
    return { paid: false, pull: null };
  }
  if (!isBottleInvoiceAmount(invoice)) {
    bottleLog("warn", "settle.wrong_amount", {
      hash: hashRef(paymentHash),
    });
    return { paid: false, pull: null };
  }

  const ours = pending || parseBottlePayload(invoice.metadata);
  if (!ours) {
    return { paid: false, pull: null };
  }

  const lines = await loadBottleLines();
  const recent = await getRecentBottleLines();
  const line = pickBottleLine(lines, recent);
  if (line == null) {
    bottleLog("error", "settle.no_lines", {
      hash: hashRef(paymentHash),
      store: bottleStoreKind(),
    });
    return { paid: true, pull: null };
  }

  const pull = await saveBottlePull({
    id: `b-${paymentHash.slice(0, 12)}`,
    line,
    createdAt: new Date().toISOString(),
    paymentHash,
  });
  return { paid: true, pull };
}
