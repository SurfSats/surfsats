import { NextResponse } from "next/server";
import { liveGraffitiMarks } from "@/lib/graffiti-payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const marks = await liveGraffitiMarks();
  return NextResponse.json({ marks });
}
