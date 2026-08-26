import { NextResponse } from "next/server";
import { fetchNowPlayingSnapshot } from "@/lib/jukebox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await fetchNowPlayingSnapshot();
  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "public, s-maxage=12, stale-while-revalidate=15",
    },
  });
}
