export type LnurlPayRequest = {
  callback: string;
  minSendable: number;
  maxSendable: number;
  commentAllowed: number;
};

export function lightningAddressToLnurlp(address: string): string | null {
  const trimmed = address.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;
  const name = trimmed.slice(0, at);
  const host = trimmed.slice(at + 1);
  if (!name || !host || host.includes("/")) return null;
  return `https://${host}/.well-known/lnurlp/${encodeURIComponent(name)}`;
}

export function parseLnurlPayRequest(value: unknown): LnurlPayRequest | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.tag !== "payRequest") return null;
  const callback = typeof record.callback === "string" ? record.callback.trim() : "";
  if (!/^https?:\/\//i.test(callback)) return null;
  const minSendable = Number(record.minSendable);
  const maxSendable = Number(record.maxSendable);
  if (!Number.isFinite(minSendable) || minSendable < 0) return null;
  const commentAllowed = Number(record.commentAllowed);
  return {
    callback,
    minSendable,
    maxSendable: Number.isFinite(maxSendable) && maxSendable > 0 ? maxSendable : Number.MAX_SAFE_INTEGER,
    commentAllowed: Number.isFinite(commentAllowed) ? commentAllowed : 0,
  };
}

export function lnurlCallbackUrl(
  request: LnurlPayRequest,
  amountSats: number,
  comment?: string,
) {
  const msats = Math.round(amountSats) * 1000;
  if (msats < request.minSendable || msats > request.maxSendable) return null;
  const url = new URL(request.callback);
  url.searchParams.set("amount", String(msats));
  if (comment && request.commentAllowed > 0) {
    url.searchParams.set("comment", comment.slice(0, request.commentAllowed));
  }
  return url.toString();
}

export function parseLnurlInvoice(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.status === "string" && record.status.toUpperCase() === "ERROR") {
    return null;
  }
  const bolt11 = String(record.pr ?? record.payment_request ?? "").trim();
  return bolt11.toLowerCase().startsWith("ln") ? bolt11 : null;
}
