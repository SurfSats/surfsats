import { NextResponse } from "next/server";
import { tabLog } from "@/lib/tab-log";
import {
  getTabHighScores,
  getTabRecent,
  tabStoreKind,
} from "@/lib/tab-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [highScores, lastPlayers] = await Promise.all([
      getTabHighScores(),
      getTabRecent(),
    ]);
    return NextResponse.json(
      { highScores, lastPlayers },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    tabLog("error", "public.read_failed", { store: tabStoreKind() });
    return NextResponse.json({ error: "board unavailable" }, { status: 500 });
  }
}
