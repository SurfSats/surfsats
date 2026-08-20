import { NextResponse } from "next/server";
import { arcadeLog } from "@/lib/arcade-log";
import { getArcadeHighScores, getArcadeRecentPlays, arcadeStoreKind } from "@/lib/arcade-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [highScores, lastPlayers] = await Promise.all([
      getArcadeHighScores(),
      getArcadeRecentPlays(),
    ]);
    return NextResponse.json(
      { highScores, lastPlayers },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    arcadeLog("error", "public.read_failed", { store: arcadeStoreKind() });
    return NextResponse.json({ error: "board unavailable" }, { status: 500 });
  }
}
