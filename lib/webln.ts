export type WebLnSendResult = {
  preimage?: string;
};

export type WebLnProvider = {
  enable: () => Promise<void>;
  sendPayment: (bolt11: string) => Promise<WebLnSendResult>;
  makeInvoice?: (args: {
    amount: number;
    defaultMemo?: string;
  }) => Promise<{ paymentRequest: string }>;
};

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
