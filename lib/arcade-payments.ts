import {
  createAlbyInvoice,
  getAlbyInvoice,
  invoiceAmountSats,
  invoicePaymentHash,
  isInvoiceSettled,
  type AlbyInvoice,
} from "@/lib/alby";
import {
  ARCADE_META_KIND,
  ARCADE_PRICE_SATS,
  isPlayerId,
  sanitizeAlias,
  type ArcadePlayer,
} from "@/lib/arcade";
import { arcadeLog, hashRef } from "@/lib/arcade-log";
import {
  arcadeStoreKind,
  findArcadeGrant,
  getArcadePending,
  getArcadePlayer,
  grantArcadeCredits,
  saveArcadePending,
} from "@/lib/arcade-store";

export type ArcadeInvoicePayload = {
  playerId: string;
  alias: string;
};

export function parseArcadePayload(
  value: unknown,
): ArcadeInvoicePayload | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    record.kind &&
    record.kind !== ARCADE_META_KIND &&
    record.kind !== "arcade"
  ) {
    return null;
  }
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

export function isArcadeInvoiceAmount(invoice: AlbyInvoice) {
  return invoiceAmountSats(invoice) === ARCADE_PRICE_SATS;
}

async function createInvoice(input: ArcadeInvoicePayload) {
  const metadata = {
    kind: ARCADE_META_KIND,
    playerId: input.playerId,
    alias: input.alias,
  };
  try {
    return await createAlbyInvoice({
      amountSats: ARCADE_PRICE_SATS,
      description: "SurfSats Arcade",
      metadata,
    });
  } catch {
    arcadeLog("warn", "invoice.metadata_rejected", {
      store: arcadeStoreKind(),
    });
    return createAlbyInvoice({
      amountSats: ARCADE_PRICE_SATS,
      description: "SurfSats Arcade",
    });
  }
}

export async function createArcadeInvoice(input: ArcadeInvoicePayload) {
  const invoice = await createInvoice(input);
  const paymentHash = invoicePaymentHash(invoice);
  await saveArcadePending({
    paymentHash,
    playerId: input.playerId,
    alias: input.alias,
    createdAt: new Date().toISOString(),
  });
  const paymentRequest = invoice.payment_request as string;
  arcadeLog("info", "invoice.created", {
    hash: hashRef(paymentHash),
    amountSats: ARCADE_PRICE_SATS,
    chars: paymentRequest.length,
    prefix: paymentRequest.slice(0, 6).toLowerCase(),
    store: arcadeStoreKind(),
  });
  if (paymentRequest.toLowerCase().startsWith("lnbcrt")) {
    arcadeLog("warn", "invoice.regtest", {
      hash: hashRef(paymentHash),
    });
  }
  return {
    paymentHash,
    paymentRequest,
    amountSats: ARCADE_PRICE_SATS,
    expiresAt: invoice.expires_at ?? null,
  };
}

export async function settleArcadePayment(paymentHash: string): Promise<{
  paid: boolean;
  ok: boolean;
  already: boolean;
  player: ArcadePlayer | null;
}> {
  const existing = await findArcadeGrant(paymentHash);
  if (existing) {
    const player = await getArcadePlayer(existing.playerId);
    arcadeLog("info", "settle.already_live", {
      hash: hashRef(paymentHash),
      store: arcadeStoreKind(),
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

  const invoice = await getAlbyInvoice(paymentHash);
  if (!isInvoiceSettled(invoice)) {
    return { paid: false, ok: false, already: false, player: null };
  }
  if (!isArcadeInvoiceAmount(invoice)) {
    arcadeLog("warn", "settle.wrong_amount", {
      hash: hashRef(paymentHash),
    });
    return { paid: false, ok: false, already: false, player: null };
  }

  const pending =
    (await getArcadePending(paymentHash)) ??
    parseArcadePayload(invoice.metadata);
  if (!pending) {
    return { paid: true, ok: false, already: false, player: null };
  }

  const result = await grantArcadeCredits({
    paymentHash,
    playerId: pending.playerId,
    alias: pending.alias,
  });
  return {
    paid: true,
    ok: true,
    already: result.already,
    player: result.player,
  };
}

export function pendingArcadeFromBody(
  body: unknown,
): ArcadeInvoicePayload | { error: string } {
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
