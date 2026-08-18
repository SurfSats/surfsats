import { NextResponse } from "next/server";
import { getLineupSnapshot } from "@/lib/lineup";

export const revalidate = 12;

export async function GET() {
  const snapshot = await getLineupSnapshot();
  return NextResponse.json(snapshot);
}
