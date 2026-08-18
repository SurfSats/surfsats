import { NextResponse } from "next/server";
import { getTimechainSnapshot } from "@/lib/timechain";

export const revalidate = 20;

export async function GET() {
  const snapshot = await getTimechainSnapshot();
  return NextResponse.json(snapshot);
}
