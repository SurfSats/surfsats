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
  STORY_META_KIND,
  STORY_PRICE_SATS,
  createStoryLine,
  sanitizeStoryLine,
  type StoryLine,
} from "@/lib/story";
import { hashRef, storyLog } from "@/lib/story-log";
import {
  findStoryByHash,
  getLastStoryLine,
  getStoryPending,
  saveStoryLine,
  saveStoryPending,
  storyStoreKind,
} from "@/lib/story-store";

export type StoryInvoicePayload = {
  text: string;
  alias: string;
};

export function parseStoryPayload(value: unknown): StoryInvoicePayload | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    record.kind &&
    record.kind !== STORY_META_KIND &&
    record.kind !== "story"
  ) {
    return null;
  }
  const clean = sanitizeStoryLine(String(record.text ?? ""));
  if (!clean.ok) return null;
  const alias = readCallsign(record.callsign ?? record.alias);
  if (!alias) return null;
  return { text: clean.text, alias };
}

export function isStoryInvoiceAmount(invoice: AlbyInvoice) {
  return invoiceAmountSats(invoice) === STORY_PRICE_SATS;
}

async function createInvoice(input: StoryInvoicePayload) {
  const metadata = {
    kind: STORY_META_KIND,
    text: input.text,
    alias: input.alias,
  };
  try {
    return await createAlbyInvoice({
      amountSats: STORY_PRICE_SATS,
      description: "SurfSats Story Chain",
      metadata,
    });
  } catch {
    storyLog("warn", "invoice.metadata_rejected", {
      store: storyStoreKind(),
    });
    return createAlbyInvoice({
      amountSats: STORY_PRICE_SATS,
      description: "SurfSats Story Chain",
    });
  }
}

export async function createStoryInvoice(input: StoryInvoicePayload) {
  const last = await getLastStoryLine();
  if (last && last.text.toLowerCase() === input.text.toLowerCase()) {
    throw Object.assign(new Error("the book already ends that way"), {
      status: 400,
    });
  }

  const invoice = await createInvoice(input);
  const paymentHash = invoicePaymentHash(invoice);
  await saveStoryPending({
    paymentHash,
    text: input.text,
    alias: input.alias,
    createdAt: new Date().toISOString(),
  });
  storyLog("info", "invoice.created", {
    hash: hashRef(paymentHash),
    store: storyStoreKind(),
  });
  return {
    paymentHash,
    paymentRequest: invoice.payment_request as string,
    amountSats: STORY_PRICE_SATS,
    expiresAt: invoice.expires_at ?? null,
  };
}

export async function settleStoryPayment(paymentHash: string): Promise<{
  paid: boolean;
  line: StoryLine | null;
  etch: CallsignEtch | null;
}> {
  const existing = await findStoryByHash(paymentHash);
  if (existing) {
    storyLog("info", "settle.already_live", {
      id: existing.id,
      hash: hashRef(paymentHash),
      store: storyStoreKind(),
    });
    const etch = await rememberSettledCallsign({
      callsign: existing.alias,
      paymentHash,
      machine: "story",
    });
    return { paid: true, line: existing, etch };
  }

  const invoice = await getAlbyInvoice(paymentHash);
  if (!isInvoiceSettled(invoice)) {
    return { paid: false, line: null, etch: null };
  }
  if (!isStoryInvoiceAmount(invoice)) {
    return { paid: false, line: null, etch: null };
  }

  const pending =
    (await getStoryPending(paymentHash)) ?? parseStoryPayload(invoice.metadata);
  if (!pending) {
    return { paid: true, line: null, etch: null };
  }

  const paidAt = invoice.settled_at
    ? new Date(invoice.settled_at).getTime()
    : Date.now();
  const line = createStoryLine(pending.text, pending.alias, {
    paidAt: Number.isFinite(paidAt) ? paidAt : Date.now(),
    paymentHash,
  });
  await saveStoryLine(line);
  const etch = await rememberSettledCallsign({
    callsign: line.alias,
    paymentHash,
    machine: "story",
  });
  return { paid: true, line, etch };
}

export function pendingStoryFromBody(
  body: unknown,
): StoryInvoicePayload | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "missing line" };
  }
  const record = body as Record<string, unknown>;
  const clean = sanitizeStoryLine(String(record.text ?? ""));
  if (!clean.ok) return { error: clean.reason };
  const parsed = sanitizeCallsign(String(record.callsign ?? record.alias ?? ""));
  if (!parsed.ok) return { error: "SET CALLSIGN FIRST · 2–16 CHARS" };
  return { text: clean.text, alias: parsed.callsign };
}
