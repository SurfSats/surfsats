export type SettlementEvent = {
  type: "invoice_paid" | "settled";
  paymentHash: string;
  preimage: string;
};

const SETTLED_NAMES = new Set([
  "invoice_paid",
  "settled",
  "invoice.settled",
  "invoice_settled",
]);

export function isSettlementEventName(value: string) {
  return SETTLED_NAMES.has(value.trim().toLowerCase());
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function asText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function pickHash(record: Record<string, unknown>) {
  return (
    asText(record.payment_hash) ||
    asText(record.paymentHash) ||
    asText(record.hash) ||
    asText(record.r_hash_str) ||
    asText(record.id)
  );
}

function pickPreimage(record: Record<string, unknown>) {
  return (
    asText(record.preimage) ||
    asText(record.payment_preimage) ||
    asText(record.paymentPreimage) ||
    asText(record.r_preimage)
  );
}

function eventTypeOf(record: Record<string, unknown>) {
  return (
    asText(record.type) ||
    asText(record.event) ||
    asText(record.event_type) ||
    asText(record.filter_type)
  ).toLowerCase();
}

export function parseSettlementPayload(raw: unknown): SettlementEvent | null {
  const record = asRecord(raw);
  if (!record) return null;

  const nested =
    asRecord(record.data) ||
    asRecord(record.invoice) ||
    asRecord(record.payload);
  const type = eventTypeOf(record) || (nested ? eventTypeOf(nested) : "");
  const settledFlag =
    record.settled === true ||
    String(record.state || "").toUpperCase() === "SETTLED" ||
    nested?.settled === true;

  if (type && !isSettlementEventName(type) && !settledFlag) return null;
  if (!type && !settledFlag) return null;

  const paymentHash = pickHash(record) || (nested ? pickHash(nested) : "");
  if (!paymentHash) return null;

  const preimage = pickPreimage(record) || (nested ? pickPreimage(nested) : "");
  const kind: SettlementEvent["type"] =
    type === "settled" || type === "invoice.settled" || type === "invoice_settled"
      ? "settled"
      : "invoice_paid";

  return { type: kind, paymentHash, preimage };
}

export function encodeSseEvent(event: SettlementEvent) {
  return `event: ${event.type}\ndata: ${JSON.stringify({
    type: event.type,
    payment_hash: event.paymentHash,
    preimage: event.preimage,
  })}\n\n`;
}
