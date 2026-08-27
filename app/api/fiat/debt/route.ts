import { NextResponse } from "next/server";
import { FIAT_CACHE_MS, getFiatDebt } from "@/lib/fiat";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getFiatDebt();
  if (!snapshot) {
    return NextResponse.json(
      { error: "treasury silent" },
      { status: 502 },
    );
  }

  const seconds = Math.max(1, Math.round(FIAT_CACHE_MS / 1000));
  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=120`,
    },
  });
}
