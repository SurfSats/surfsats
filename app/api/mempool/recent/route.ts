import { NextResponse } from "next/server";
import {
  MEMPOOL_REST,
  parseLiveTx,
  parseLiveTxList,
  pendingTxids,
  type LiveTx,
} from "@/lib/lineup-field";

export const dynamic = "force-dynamic";

const UPSTREAM = `${MEMPOOL_REST}/mempool/recent`;
const SEED_DETAIL_CAP = 8;

export async function GET() {
  try {
    const response = await fetch(UPSTREAM, {
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
    const txs = parseLiveTxList(body);
    const need = pendingTxids(body).slice(0, SEED_DETAIL_CAP);
    if (need.length > 0) {
      const extra = await Promise.all(need.map(fetchTxValue));
      for (const tx of extra) {
        if (tx) txs.push(tx);
      }
    }
    return NextResponse.json(txs);
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}

async function fetchTxValue(txid: string): Promise<LiveTx | null> {
  try {
    const response = await fetch(`${MEMPOOL_REST}/tx/${txid}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "SurfSats/1.0",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return parseLiveTx(body);
  } catch {
    return null;
  }
}
