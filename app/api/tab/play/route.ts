import { NextResponse } from "next/server";
import { isPlayerId } from "@/lib/tab";
import { tabLog } from "@/lib/tab-log";
import { spendTabCredit, tabStoreKind } from "@/lib/tab-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const playerId = String(record.playerId || record.player_id || "").trim();
  if (!isPlayerId(playerId)) {
    return NextResponse.json({ error: "missing player" }, { status: 400 });
  }

  try {
    const result = await spendTabCredit(playerId);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      playId: result.play.id,
      credits: result.player.credits,
      alias: result.player.alias,
    });
  } catch {
    tabLog("error", "play.failed", { store: tabStoreKind() });
    return NextResponse.json(
      { error: "stool jammed. try again" },
      { status: 500 },
    );
  }
}
