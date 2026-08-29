import { NextResponse } from "next/server";
import { ARCADE_MACHINE_RETRO, ARCADE_MACHINE_TAB } from "@/lib/arcade";
import { arcadeLog } from "@/lib/arcade-log";
import {
  arcadeStoreKind,
  getArcadeHighScores,
  getArcadeRecentPlays,
  getRetroHighScores,
  getTabHighScores,
} from "@/lib/arcade-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const machine = new URL(request.url).searchParams.get("machine");
  try {
    const tab = machine === ARCADE_MACHINE_TAB;
    const retro = machine === ARCADE_MACHINE_RETRO;
    const [highScores, lastPlayers] = await Promise.all([
      tab
        ? getTabHighScores()
        : retro
          ? getRetroHighScores()
          : getArcadeHighScores(),
      getArcadeRecentPlays(
        tab
          ? ARCADE_MACHINE_TAB
          : retro
            ? ARCADE_MACHINE_RETRO
            : undefined,
      ),
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
