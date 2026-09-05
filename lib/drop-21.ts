export const DROP_21_DOCUMENT_ID = "DROP_21_GLOBAL";
export const DROP_21_SATS = 21;

export type Drop21Invoice = {
  bolt11: string;
  hash: string;
  amountSats: number;
};

export type Drop21Presentation = "zap" | "qr";

export function drop21Presentation(connected: boolean): Drop21Presentation {
  return connected ? "zap" : "qr";
}

export function parseDrop21Invoice(body: unknown): Drop21Invoice | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const bolt11 = String(record.payment_request ?? "").trim();
  const hash = String(record.payment_hash ?? "").trim();
  if (!bolt11.toLowerCase().startsWith("ln") || !hash) return null;
  const amount = Number(record.amount);
  return {
    bolt11,
    hash,
    amountSats:
      Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : DROP_21_SATS,
  };
}

export function drop21DocumentId(): string {
  return DROP_21_DOCUMENT_ID.replace(/[^A-Z0-9_]/g, "").slice(0, 64);
}
