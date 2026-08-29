import {
  createAlbyInvoice,
  getAlbyInvoice,
  invoiceAmountSats,
  invoicePaymentHash,
  isInvoiceSettled,
  type AlbyInvoice,
} from "@/lib/alby";
import {
  TAB_META_KIND,
  TAB_PRICE_SATS,
  isPlayerId,
  sanitizeAlias,
  type TabPlayer,
} from "@/lib/tab";
import { hashRef, tabLog } from "@/lib/tab-log";
import {
  findTabGrant,
  getTabPending,
  getTabPlayer,
  grantTabCredits,
  saveTabPending,
  tabStoreKind,
} from "@/lib/tab-store";

export type TabInvoicePayload = {
  playerId: string;
  alias: string;
};

export function parseTabPayload(value: unknown): TabInvoicePayload | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    record.kind &&
    record.kind !== TAB_META_KIND &&
    record.kind !== "tab"
  ) {
    return null;
  }
  if (record.machine && record.machine !== "tab") return null;
  if (!isPlayerId(record.playerId) && !isPlayerId(record.player_id)) {
    return null;
  }
  const clean = sanitizeAlias(String(record.alias ?? ""));
  if (!clean.ok) return null;
  return {
    playerId: String(record.playerId || record.player_id),
    alias: clean.alias,
  };
}

export function isTabInvoiceAmount(invoice: AlbyInvoice) {
  return invoiceAmountSats(invoice) === TAB_PRICE_SATS;
}

async function createInvoice(input: TabInvoicePayload) {
  const metadata = {
    kind: TAB_META_KIND,
    playerId: input.playerId,
    alias: input.alias,
    machine: "tab",
  };
  const description = "SurfSats · THE TAB";
  try {
    return await createAlbyInvoice({
      amountSats: TAB_PRICE_SATS,
      description,
      metadata,
    });
  } catch {
    tabLog("warn", "invoice.metadata_rejected", { store: tabStoreKind() });
    return createAlbyInvoice({
      amountSats: TAB_PRICE_SATS,
      description,
    });
  }
}

export async function createTabInvoice(input: TabInvoicePayload) {
  const invoice = await createInvoice(input);
  const paymentHash = invoicePaymentHash(invoice);
  await saveTabPending({
    paymentHash,
    playerId: input.playerId,
    alias: input.alias,
    createdAt: new Date().toISOString(),
  });
  const paymentRequest = invoice.payment_request as string;
  tabLog("info", "invoice.created", {
    hash: hashRef(paymentHash),
    amountSats: TAB_PRICE_SATS,
    store: tabStoreKind(),
  });
  return {
    paymentHash,
    paymentRequest,
    amountSats: TAB_PRICE_SATS,
    expiresAt: invoice.expires_at ?? null,
  };
}

export async function settleTabPayment(paymentHash: string): Promise<{
  paid: boolean;
  ok: boolean;
  already: boolean;
  player: TabPlayer | null;
}> {
  const existing = await findTabGrant(paymentHash);
  if (existing) {
    const player = await getTabPlayer(existing.playerId);
    tabLog("info", "settle.already_live", {
      hash: hashRef(paymentHash),
      store: tabStoreKind(),
    });
    return {
      paid: true,
      ok: true,
      already: true,
      player: player ?? {
        playerId: existing.playerId,
        alias: existing.alias,
        credits: existing.credits,
      },
    };
  }

  const pending = await getTabPending(paymentHash);
  const invoice = await getAlbyInvoice(paymentHash);
  const meta = parseTabPayload(invoice.metadata);
  if (!pending && !meta) {
    return { paid: false, ok: false, already: false, player: null };
  }

  if (!isInvoiceSettled(invoice)) {
    return { paid: false, ok: false, already: false, player: null };
  }
  if (!isTabInvoiceAmount(invoice)) {
    tabLog("warn", "settle.wrong_amount", { hash: hashRef(paymentHash) });
    return { paid: false, ok: false, already: false, player: null };
  }

  const claim = pending ?? meta;
  if (!claim) {
    return { paid: true, ok: false, already: false, player: null };
  }

  const result = await grantTabCredits({
    paymentHash,
    playerId: claim.playerId,
    alias: claim.alias,
  });
  return {
    paid: true,
    ok: true,
    already: result.already,
    player: result.player,
  };
}

export function pendingTabFromBody(
  body: unknown,
): TabInvoicePayload | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "missing player" };
  }
  const record = body as Record<string, unknown>;
  if (!isPlayerId(record.playerId) && !isPlayerId(record.player_id)) {
    return { error: "missing player" };
  }
  const clean = sanitizeAlias(String(record.alias ?? ""));
  if (!clean.ok) return { error: clean.reason };
  return {
    playerId: String(record.playerId || record.player_id),
    alias: clean.alias,
  };
}
