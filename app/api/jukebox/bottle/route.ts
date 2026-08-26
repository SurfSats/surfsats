import { NextResponse } from "next/server";
import { BOTTLE_RECENT } from "@/lib/bottle";
import { getRecentBottlePulls } from "@/lib/bottle-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const pulls = await getRecentBottlePulls(BOTTLE_RECENT);
  return NextResponse.json(
    { pulls },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
