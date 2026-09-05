import {
  createAlbyInvoice,
  getAlbyInvoice,
  invoiceAmountSats,
  invoicePaymentHash,
  invoicePreimage,
  isInvoiceSettled,
} from "@/lib/alby";
import {
  SANDBOX_META_KIND,
  SANDBOX_PRICE_SATS,
  parseSandboxDocumentId,
} from "@/lib/sandbox";

export async function createSandboxInvoice(documentId: string) {
  const id = parseSandboxDocumentId(documentId);
  if (!id) {
    throw Object.assign(new Error("invalid document"), { status: 400 });
  }

  const invoice = await createAlbyInvoice({
    amountSats: SANDBOX_PRICE_SATS,
    description: `SurfSats paywall ${id}`,
    metadata: { kind: SANDBOX_META_KIND, documentId: id },
  });

  const paymentHash = invoicePaymentHash(invoice);
  const paymentRequest = invoice.payment_request ?? "";
  if (!paymentHash || !paymentRequest.toLowerCase().startsWith("ln")) {
    throw Object.assign(new Error("could not create invoice. try again"), {
      status: 502,
    });
  }

  return {
    paymentRequest,
    paymentHash,
    amountSats: SANDBOX_PRICE_SATS,
    expiresAt: invoice.expires_at ?? null,
  };
}

export async function checkSandboxPayment(paymentHash: string) {
  const hash = paymentHash.trim();
  if (!hash) {
    throw Object.assign(new Error("missing invoice"), { status: 400 });
  }

  const invoice = await getAlbyInvoice(hash);
  const paid =
    isInvoiceSettled(invoice) &&
    invoiceAmountSats(invoice) === SANDBOX_PRICE_SATS;

  return {
    paid,
    preimage: paid ? invoicePreimage(invoice) : "",
  };
}
