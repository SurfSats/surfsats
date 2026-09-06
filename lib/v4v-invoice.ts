import { createAlbyInvoice } from "./alby";
import {
  lightningAddressToLnurlp,
  lnurlCallbackUrl,
  parseLnurlInvoice,
  parseLnurlPayRequest,
} from "./lnurl-pay";
import { V4V_COMMENT, v4vRecipient } from "./v4v";

export async function fetchV4vBolt11({
  amountSats,
  lud16,
}: {
  amountSats: number;
  lud16?: string | null;
}): Promise<string> {
  const address = v4vRecipient(lud16);
  const lnurlp = lightningAddressToLnurlp(address);

  if (lnurlp) {
    try {
      const payRes = await fetch(lnurlp, {
        headers: {
          Accept: "application/json",
          "User-Agent": "SurfSatsV4V/1.0",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (payRes.ok) {
        const request = parseLnurlPayRequest(await payRes.json());
        const callback = request
          ? lnurlCallbackUrl(request, amountSats, V4V_COMMENT)
          : null;
        if (callback) {
          const invRes = await fetch(callback, {
            headers: {
              Accept: "application/json",
              "User-Agent": "SurfSatsV4V/1.0",
            },
            signal: AbortSignal.timeout(8000),
          });
          if (invRes.ok) {
            const bolt11 = parseLnurlInvoice(await invRes.json());
            if (bolt11) return bolt11;
          }
        }
      }
    } catch {
      // LNURL recipient can be live but unpaid-ready
    }
  }

  const fallback = await createAlbyInvoice({
    amountSats,
    description: `SurfSats V4V boost ${amountSats} sats`,
    metadata: { kind: "v4v_boost", lud16: address },
  });
  const bolt11 = fallback.payment_request ?? "";
  if (!bolt11.toLowerCase().startsWith("ln")) {
    throw new Error("LNURL did not return an invoice");
  }
  return bolt11;
}
