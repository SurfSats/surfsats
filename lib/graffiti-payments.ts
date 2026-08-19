import {
  createAlbyInvoice,
  getAlbyInvoice,
  invoicePaymentHash,
  isGraffitiInvoiceAmount,
  isInvoiceSettled,
  listIncomingInvoices,
  type AlbyInvoice,
} from "@/lib/alby";
import {
  GRAFFITI_META_KIND,
  GRAFFITI_PRICE_SATS,
  createMark,
  isGraffitiColor,
  isGraffitiStyle,
  sanitizeGraffiti,
  type GraffitiColor,
  type GraffitiMark,
  type GraffitiStyle,
  type PendingGraffiti,
} from "@/lib/graffiti";
import {
  findPaidByHash,
  getPaidMarks,
  getPending,
  savePaidMark,
  savePending,
} from "@/lib/graffiti-store";

export type GraffitiInvoicePayload = {
  text: string;
  style: GraffitiStyle;
  color: GraffitiColor;
};

export function parseGraffitiPayload(
  value: unknown,
): GraffitiInvoicePayload | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    record.kind &&
    record.kind !== GRAFFITI_META_KIND &&
    record.kind !== "graffiti"
  ) {
    return null;
  }
  if (!isGraffitiStyle(record.style) || !isGraffitiColor(record.color)) {
    return null;
  }
  const clean = sanitizeGraffiti(String(record.text ?? ""));
  if (!clean.ok) return null;
  return { text: clean.text, style: record.style, color: record.color };
}

export async function createGraffitiInvoice(input: GraffitiInvoicePayload) {
  const invoice = await createAlbyInvoice({
    amountSats: GRAFFITI_PRICE_SATS,
    description: "SurfSats Graffiti",
    comment: input.text.slice(0, 80),
    metadata: {
      kind: GRAFFITI_META_KIND,
      text: input.text,
      style: input.style,
      color: input.color,
    },
  });

  const paymentHash = invoicePaymentHash(invoice);
  await savePending({
    paymentHash,
    text: input.text,
    style: input.style,
    color: input.color,
    createdAt: new Date().toISOString(),
  });

  return {
    paymentHash,
    paymentRequest: invoice.payment_request as string,
    amountSats: GRAFFITI_PRICE_SATS,
    expiresAt: invoice.expires_at ?? null,
  };
}

export async function settleGraffitiPayment(paymentHash: string): Promise<{
  paid: boolean;
  mark: GraffitiMark | null;
}> {
  const existing = await findPaidByHash(paymentHash);
  if (existing) return { paid: true, mark: existing };

  const invoice = await getAlbyInvoice(paymentHash);
  if (!isInvoiceSettled(invoice)) {
    return { paid: false, mark: null };
  }
  if (!isGraffitiInvoiceAmount(invoice)) {
    return { paid: false, mark: null };
  }

  const mark = await promotePaidInvoice(invoice);
  return { paid: true, mark };
}

async function promotePaidInvoice(invoice: AlbyInvoice) {
  const paymentHash = invoicePaymentHash(invoice);
  if (!paymentHash) return null;

  const existing = await findPaidByHash(paymentHash);
  if (existing) return existing;

  const pending =
    (await getPending(paymentHash)) ?? parseGraffitiPayload(invoice.metadata);
  if (!pending) return null;

  const paidAt = invoice.settled_at
    ? new Date(invoice.settled_at).getTime()
    : Date.now();
  const mark = createMark(pending.text, pending.style, pending.color, {
    paidAt: Number.isFinite(paidAt) ? paidAt : Date.now(),
    paymentHash,
  });
  await savePaidMark(mark);
  return mark;
}

let lastHydrate = 0;

export async function liveGraffitiMarks() {
  if (Date.now() - lastHydrate > 20_000) {
    lastHydrate = Date.now();
    try {
      const incoming = await listIncomingInvoices(50);
      for (const invoice of incoming) {
        if (!isInvoiceSettled(invoice) || !isGraffitiInvoiceAmount(invoice)) {
          continue;
        }
        if (!parseGraffitiPayload(invoice.metadata)) continue;
        await promotePaidInvoice(invoice);
      }
    } catch {
      // store-only fallback if history cannot be read
    }
  }
  return getPaidMarks();
}

export function pendingFromBody(
  body: unknown,
): GraffitiInvoicePayload | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "missing mark" };
  }
  const record = body as Record<string, unknown>;
  if (!isGraffitiStyle(record.style) || !isGraffitiColor(record.color)) {
    return { error: "pick a style and color" };
  }
  const clean = sanitizeGraffiti(String(record.text ?? ""));
  if (!clean.ok) return { error: clean.reason };
  return { text: clean.text, style: record.style, color: record.color };
}
