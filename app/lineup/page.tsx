import type { Metadata } from "next";
import { WellApp } from "@/components/lineup/WellApp";
import { getLineupSnapshot } from "@/lib/lineup";

export const revalidate = 20;

export const metadata: Metadata = {
  title: "The Well",
  description: "High fees fall in first. Everything else waits.",
};

export default async function LineupPage() {
  const snapshot = await getLineupSnapshot();

  return <WellApp initial={snapshot} />;
}
