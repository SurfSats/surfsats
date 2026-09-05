export type WebLnSendResult = {
  preimage?: string;
};

export type WebLnProvider = {
  enable: () => Promise<void>;
  sendPayment: (bolt11: string) => Promise<WebLnSendResult>;
  isEnabled?: boolean | (() => Promise<boolean>);
  getInfo?: () => Promise<unknown>;
  getBalance?: () => Promise<unknown>;
  makeInvoice?: (args: {
    amount: number;
    defaultMemo?: string;
  }) => Promise<{ paymentRequest: string }>;
};

export const SOVEREIGN_NODE = "SOVEREIGN_NODE";

export function parseWebLnPubkey(value: unknown): string {
  if (value == null || typeof value !== "object") return SOVEREIGN_NODE;
  if (!("node" in value) || value.node == null || typeof value.node !== "object") {
    return SOVEREIGN_NODE;
  }
  if (!("pubkey" in value.node) || typeof value.node.pubkey !== "string") {
    return SOVEREIGN_NODE;
  }
  const pubkey = value.node.pubkey.trim();
  return pubkey || SOVEREIGN_NODE;
}

export function parseWebLnBalance(value: unknown): number | null {
  if (value == null || typeof value !== "object") return null;
  if (!("balance" in value) || typeof value.balance !== "number") return null;
  if (!Number.isFinite(value.balance)) return null;
  return value.balance;
}

export async function webLnIsEnabled(
  provider: WebLnProvider,
): Promise<boolean> {
  if (typeof provider.isEnabled === "function") {
    return provider.isEnabled();
  }
  if (typeof provider.isEnabled === "boolean") return provider.isEnabled;
  return true;
}

export type WebLnHost = {
  webln?: WebLnProvider;
};

export type WebLnPayResult =
  | { ok: true; preimage: string }
  | {
      ok: false;
      reason: "missing" | "rejected" | "failed";
      message: string;
    };

const REJECT_RE = /reject|denied|cancel|abort/i;

export function isWebLnAvailable(
  host: WebLnHost | null | undefined,
): boolean {
  return Boolean(host?.webln);
}

export function isWebLnRejection(error: unknown): boolean {
  if (error == null || typeof error === "boolean") return false;
  if (typeof error === "string") return REJECT_RE.test(error);
  if (typeof error !== "object") return false;

  const record = error as {
    message?: unknown;
    name?: unknown;
    code?: unknown;
  };
  const message = String(record.message ?? "");
  const name = String(record.name ?? "");
  if (REJECT_RE.test(message) || REJECT_RE.test(name)) return true;
  return record.code === 4001;
}

function fail(
  reason: "missing" | "rejected" | "failed",
  message: string,
): WebLnPayResult {
  return { ok: false, reason, message };
}

function fromUnknown(error: unknown): WebLnPayResult {
  if (isWebLnRejection(error)) {
    return fail("rejected", "Zap cancelled");
  }
  return fail("failed", "Wallet could not send the zap");
}

export function weblnToastMessage(result: WebLnPayResult): string | null {
  if (result.ok) return null;
  if (result.reason === "rejected") return "Zap cancelled";
  if (result.reason === "missing") return "No WebLN wallet";
  return "Wallet could not send the zap";
}

export async function payWithWebLn({
  host,
  invoice,
}: {
  host: WebLnHost;
  invoice: string;
}): Promise<WebLnPayResult> {
  const provider = host.webln;
  if (!provider) {
    return fail("missing", "No WebLN wallet");
  }

  const bolt11 = invoice.trim();
  if (!bolt11) {
    return fail("failed", "Wallet could not send the zap");
  }

  try {
    await provider.enable();
  } catch (error) {
    return fromUnknown(error);
  }

  if (typeof provider.sendPayment !== "function") {
    return fail("failed", "Wallet could not send the zap");
  }

  try {
    const paid = await provider.sendPayment(bolt11);
    return { ok: true, preimage: paid?.preimage ?? "" };
  } catch (error) {
    return fromUnknown(error);
  }
}

declare global {
  interface Window {
    webln?: WebLnProvider;
  }
}
