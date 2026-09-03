import { NextResponse } from "next/server";
import { MEMPOOL_REST, asTxid, parseLiveTx } from "@/lib/lineup-field";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ txid: string }> },
) {
  const { txid: raw } = await context.params;
  const txid = asTxid(raw);
  if (!txid) {
    return NextResponse.json({ error: "txid" }, { status: 400 });
  }
  try {
    const response = await fetch(`${MEMPOOL_REST}/tx/${txid}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "SurfSats/1.0",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }
    const body: unknown = await response.json();
    const tx = parseLiveTx(body);
    if (!tx) {
      return NextResponse.json({ error: "value" }, { status: 502 });
    }
    return NextResponse.json(tx);
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
