import { NextResponse } from "next/server";
import { ARCADE_MACHINE_RETRO } from "@/lib/arcade";
import { arcadeLog } from "@/lib/arcade-log";
import {
  arcadeStoreKind,
  getArcadeHighScores,
  getArcadeRecentPlays,
  getRetroHighScores,
} from "@/lib/arcade-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const machine = new URL(request.url).searchParams.get("machine");
  try {
    const retro = machine === ARCADE_MACHINE_RETRO;
    const [highScores, lastPlayers] = await Promise.all([
      retro ? getRetroHighScores() : getArcadeHighScores(),
      getArcadeRecentPlays(retro ? ARCADE_MACHINE_RETRO : undefined),
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
