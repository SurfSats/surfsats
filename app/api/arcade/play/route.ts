import { NextResponse } from "next/server";
import { ARCADE_GAME_ID, isPlayerId, normalizePlayGame } from "@/lib/arcade";
import { arcadeLog } from "@/lib/arcade-log";
import { arcadeStoreKind, spendArcadeCredit } from "@/lib/arcade-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const playerId = String(record.playerId || record.player_id || "").trim();
  const game = normalizePlayGame(String(record.game || ARCADE_GAME_ID));
  if (!isPlayerId(playerId)) {
    return NextResponse.json({ error: "missing player" }, { status: 400 });
  }
  if (!game) {
    return NextResponse.json({ error: "unknown game" }, { status: 400 });
  }

  try {
    const result = await spendArcadeCredit(playerId, game);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      playId: result.play.id,
      credits: result.player.credits,
      alias: result.player.alias,
      play: result.play,
    });
  } catch {
    arcadeLog("error", "play.failed", { store: arcadeStoreKind() });
    return NextResponse.json({ error: "cabinet jammed. try again" }, { status: 500 });
  }
}
