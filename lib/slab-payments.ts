import {
  createAlbyInvoice,
  getAlbyInvoice,
  invoiceAmountSats,
  invoicePaymentHash,
  isInvoiceSettled,
  type AlbyInvoice,
} from "@/lib/alby";
import type { CallsignEtch } from "@/lib/callsign";
import { rememberSettledCallsign } from "@/lib/callsign-store";
import {
  SLAB_META_KIND,
  invoiceSats,
  parseSlabPayload,
  pendingSlabFromBody,
  stripStroke,
  type SlabCell,
  type SlabInvoicePayload,
  type SlabStain,
  type SlabStroke,
} from "@/lib/slab";
import { hashRef, slabLog } from "@/lib/slab-log";
import {
  findSlabStroke,
  getSlabBoard,
  getSlabPending,
  saveSlabPending,
  saveSlabStroke,
  slabStoreKind,
} from "@/lib/slab-store";

export { pendingSlabFromBody };

export function isSlabInvoiceAmount(
  invoice: AlbyInvoice,
  amountSats: number,
) {
  return invoiceAmountSats(invoice) === amountSats;
}

async function createInvoice(input: SlabInvoicePayload, amountSats: number) {
  const metadata = {
    kind: SLAB_META_KIND,
    coat: input.coat,
    color: input.color,
    callsign: input.callsign,
    pixels: input.pixels,
  };
  try {
    return await createAlbyInvoice({
      amountSats,
      description: "SurfSats The Slab",
      metadata,
    });
  } catch {
    slabLog("warn", "invoice.metadata_rejected", {
      store: slabStoreKind(),
    });
    return createAlbyInvoice({
      amountSats,
      description: "SurfSats The Slab",
    });
  }
}

export async function createSlabInvoice(input: SlabInvoicePayload) {
  const board = await getSlabBoard();
  const pixels = stripStroke({
    pixels: input.pixels,
    live: board.live,
    coat: input.coat,
    currentHeight: board.height,
  });
  if (!pixels.length) {
    throw Object.assign(new Error("reef holds those pixels"), { status: 400 });
  }
  const amountSats = invoiceSats(input.coat, pixels.length);
  const invoice = await createInvoice({ ...input, pixels }, amountSats);
  const paymentHash = invoicePaymentHash(invoice);
  await saveSlabPending({
    paymentHash,
    coat: input.coat,
    color: input.color,
    pixels,
    callsign: input.callsign,
    createdAt: new Date().toISOString(),
    amountSats,
  });
  slabLog("info", "invoice.created", {
    hash: hashRef(paymentHash),
    coat: input.coat,
    pixels: pixels.length,
    amountSats,
    store: slabStoreKind(),
  });
  return {
    paymentHash,
    paymentRequest: invoice.payment_request as string,
    amountSats,
    pixelCount: pixels.length,
    expiresAt: invoice.expires_at ?? null,
  };
}

export async function settleSlabPayment(paymentHash: string): Promise<{
  paid: boolean;
  stroke: SlabStroke | null;
  cells: SlabCell[];
  stains: SlabStain[];
  painted: SlabCell[];
  height: number;
  etch: CallsignEtch | null;
}> {
  const existing = await findSlabStroke(paymentHash);
  if (existing) {
    const board = await getSlabBoard();
    slabLog("info", "settle.already_live", {
      hash: hashRef(paymentHash),
      store: slabStoreKind(),
    });
    const etch = await rememberSettledCallsign({
      callsign: existing.callsign,
      paymentHash,
      machine: "slab",
    });
    return {
      paid: true,
      stroke: existing,
      cells: board.live,
      stains: board.stains,
      painted: [],
      height: board.height,
      etch,
    };
  }

  const invoice = await getAlbyInvoice(paymentHash);
  if (!isInvoiceSettled(invoice)) {
    const board = await getSlabBoard();
    return {
      paid: false,
      stroke: null,
      cells: board.live,
      stains: board.stains,
      painted: [],
      height: board.height,
      etch: null,
    };
  }

  const pending =
    (await getSlabPending(paymentHash)) ?? parseSlabPayload(invoice.metadata);
  if (!pending) {
    const board = await getSlabBoard();
    return {
      paid: true,
      stroke: null,
      cells: board.live,
      stains: board.stains,
      painted: [],
      height: board.height,
      etch: null,
    };
  }

  const amountSats =
    "amountSats" in pending && typeof pending.amountSats === "number"
      ? pending.amountSats
      : invoiceSats(pending.coat, pending.pixels.length);
  if (!isSlabInvoiceAmount(invoice, amountSats)) {
    slabLog("warn", "settle.wrong_amount", {
      hash: hashRef(paymentHash),
    });
    const board = await getSlabBoard();
    return {
      paid: false,
      stroke: null,
      cells: board.live,
      stains: board.stains,
      painted: [],
      height: board.height,
      etch: null,
    };
  }

  const saved = await saveSlabStroke({
    pending: {
      paymentHash,
      coat: pending.coat,
      color: pending.color,
      pixels: pending.pixels,
      callsign: pending.callsign,
      createdAt: new Date().toISOString(),
      amountSats,
    },
    paintedHeight: (await getSlabBoard()).height,
    paymentHash,
  });
  if (!saved.stroke) {
    slabLog("error", "settle.paid_without_stroke", {
      hash: hashRef(paymentHash),
      store: slabStoreKind(),
    });
    return {
      paid: true,
      stroke: null,
      cells: saved.live,
      stains: saved.stains,
      painted: [],
      height: saved.height,
      etch: null,
    };
  }
  const etch = await rememberSettledCallsign({
    callsign: saved.stroke.callsign,
    paymentHash,
    machine: "slab",
  });
  return {
    paid: true,
    stroke: saved.stroke,
    cells: saved.live,
    stains: saved.stains,
    painted: saved.painted ?? [],
    height: saved.height,
    etch,
  };
}
