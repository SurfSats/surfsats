import {
  createAlbyInvoice,
  getAlbyInvoice,
  invoicePaymentHash,
  isGraffitiInvoiceAmount,
  isInvoiceSettled,
  type AlbyInvoice,
} from "@/lib/alby";
import { readCallsign } from "@/lib/callsign";
import type { CallsignEtch } from "@/lib/callsign";
import { rememberSettledCallsign } from "@/lib/callsign-store";
import {
  GRAFFITI_META_KIND,
  GRAFFITI_PRICE_SATS,
  createMark,
  isGraffitiColor,
  isGraffitiStyle,
  readPlacement,
  sanitizeGraffiti,
  type GraffitiColor,
  type GraffitiMark,
  type GraffitiPlacement,
  type GraffitiStyle,
} from "@/lib/graffiti";
import { graffitiLog, hashRef } from "@/lib/graffiti-log";
import {
  findPaidByHash,
  getPaidMarks,
  getPending,
  graffitiStoreKind,
  savePaidMark,
  savePending,
} from "@/lib/graffiti-store";

export type GraffitiInvoicePayload = {
  text: string;
  style: GraffitiStyle;
  color: GraffitiColor;
  callsign: string;
  placement?: GraffitiPlacement;
};

function placementFromRecord(
  record: Record<string, unknown>,
): GraffitiPlacement | undefined {
  return (
    readPlacement({
      top: record.top,
      left: record.left ?? record.left_pos,
      rotate: record.rotate,
      scale: record.scale,
    }) ?? undefined
  );
}

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
  const callsign = readCallsign(record.callsign ?? record.alias);
  if (!callsign) return null;
  const placement = placementFromRecord(record);
  return {
    text: clean.text,
    style: record.style,
    color: record.color,
    callsign,
    ...(placement ? { placement } : {}),
  };
}

async function createInvoice(input: GraffitiInvoicePayload) {
  const metadata = {
    kind: GRAFFITI_META_KIND,
    text: input.text,
    style: input.style,
    color: input.color,
    callsign: input.callsign,
    ...(input.placement
      ? {
          top: input.placement.top,
          left: input.placement.left,
          rotate: input.placement.rotate,
          scale: input.placement.scale,
        }
      : {}),
  };
  try {
    return await createAlbyInvoice({
      amountSats: GRAFFITI_PRICE_SATS,
      description: "SurfSats Graffiti",
      metadata,
    });
  } catch {
    graffitiLog("warn", "invoice.metadata_rejected", {
      store: graffitiStoreKind(),
    });
    return createAlbyInvoice({
      amountSats: GRAFFITI_PRICE_SATS,
      description: "SurfSats Graffiti",
    });
  }
}

export async function createGraffitiInvoice(input: GraffitiInvoicePayload) {
  const invoice = await createInvoice(input);
  const paymentHash = invoicePaymentHash(invoice);
  await savePending({
    paymentHash,
    text: input.text,
    style: input.style,
    color: input.color,
    callsign: input.callsign,
    createdAt: new Date().toISOString(),
    ...(input.placement
      ? {
          top: input.placement.top,
          left: input.placement.left,
          rotate: input.placement.rotate,
          scale: input.placement.scale,
        }
      : {}),
  });
  graffitiLog("info", "invoice.created", {
    hash: hashRef(paymentHash),
    store: graffitiStoreKind(),
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
  etch: CallsignEtch | null;
}> {
  const existing = await findPaidByHash(paymentHash);
  if (existing) {
    graffitiLog("info", "settle.already_live", {
      id: existing.id,
      hash: hashRef(paymentHash),
      store: graffitiStoreKind(),
    });
    const etch = await rememberSettledCallsign({
      callsign: existing.callsign,
      paymentHash,
      machine: "graffiti",
    });
    return { paid: true, mark: existing, etch };
  }

  const invoice = await getAlbyInvoice(paymentHash);
  if (!isInvoiceSettled(invoice)) {
    return { paid: false, mark: null, etch: null };
  }
  if (!isGraffitiInvoiceAmount(invoice)) {
    graffitiLog("warn", "settle.wrong_amount", {
      hash: hashRef(paymentHash),
    });
    return { paid: false, mark: null, etch: null };
  }

  const mark = await promotePaidInvoice(invoice);
  if (!mark) {
    const ours = Boolean(
      (await getPending(paymentHash)) || parseGraffitiPayload(invoice.metadata),
    );
    if (ours) {
      graffitiLog("error", "settle.paid_without_mark", {
        hash: hashRef(paymentHash),
        hasMetadata: Boolean(parseGraffitiPayload(invoice.metadata)),
        store: graffitiStoreKind(),
      });
    }
  }
  const etch = mark
    ? await rememberSettledCallsign({
        callsign: mark.callsign,
        paymentHash,
        machine: "graffiti",
      })
    : null;
  return { paid: true, mark, etch };
}

async function promotePaidInvoice(invoice: AlbyInvoice) {
  const paymentHash = invoicePaymentHash(invoice);
  if (!paymentHash) return null;

  const existing = await findPaidByHash(paymentHash);
  if (existing) return existing;

  const pending =
    (await getPending(paymentHash)) ?? parseGraffitiPayload(invoice.metadata);
  if (!pending) {
    graffitiLog("warn", "settle.missing_payload", {
      hash: hashRef(paymentHash),
      store: graffitiStoreKind(),
    });
    return null;
  }

  const paidAt = invoice.settled_at
    ? new Date(invoice.settled_at).getTime()
    : Date.now();
  const placement = readPlacement(pending);
  const mark = createMark(pending.text, pending.style, pending.color, {
    paidAt: Number.isFinite(paidAt) ? paidAt : Date.now(),
    paymentHash,
    placement,
    callsign: pending.callsign,
  });
  await savePaidMark(mark);
  return mark;
}

export async function liveGraffitiMarks() {
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
  const callsign = readCallsign(record.callsign ?? record.alias);
  if (!callsign) return { error: "SET CALLSIGN FIRST · 2–16 CHARS" };
  const placement = placementFromRecord(record);
  return {
    text: clean.text,
    style: record.style,
    color: record.color,
    callsign,
    ...(placement ? { placement } : {}),
  };
}
