import {
  createAlbyInvoice,
  getAlbyInvoice,
  invoiceAmountSats,
  invoicePaymentHash,
  isInvoiceSettled,
  type AlbyInvoice,
} from "@/lib/alby";
import {
  STORY_META_KIND,
  STORY_PRICE_SATS,
  createStoryLine,
  sanitizeStoryAlias,
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
  const alias = sanitizeStoryAlias(String(record.alias ?? ""));
  if (!alias.ok) return null;
  return { text: clean.text, alias: alias.alias };
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
}> {
  const existing = await findStoryByHash(paymentHash);
  if (existing) {
    storyLog("info", "settle.already_live", {
      id: existing.id,
      hash: hashRef(paymentHash),
      store: storyStoreKind(),
    });
    return { paid: true, line: existing };
  }

  const invoice = await getAlbyInvoice(paymentHash);
  if (!isInvoiceSettled(invoice)) {
    return { paid: false, line: null };
  }
  if (!isStoryInvoiceAmount(invoice)) {
    return { paid: false, line: null };
  }

  const pending =
    (await getStoryPending(paymentHash)) ?? parseStoryPayload(invoice.metadata);
  if (!pending) {
    return { paid: true, line: null };
  }

  const paidAt = invoice.settled_at
    ? new Date(invoice.settled_at).getTime()
    : Date.now();
  const line = createStoryLine(pending.text, pending.alias, {
    paidAt: Number.isFinite(paidAt) ? paidAt : Date.now(),
    paymentHash,
  });
  await saveStoryLine(line);
  return { paid: true, line };
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
  const alias = sanitizeStoryAlias(String(record.alias ?? ""));
  if (!alias.ok) return { error: alias.reason };
  return { text: clean.text, alias: alias.alias };
}
