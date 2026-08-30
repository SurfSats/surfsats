import type { Metadata } from "next";
import { ReadoutShell } from "@/components/layout/ReadoutShell";
import { WellApp } from "@/components/lineup/WellApp";
import { getLineupSnapshot } from "@/lib/lineup";

export const revalidate = 20;

export const metadata: Metadata = {
  title: "The Well",
  description: "High fees fall in first. Everything else waits.",
};

export default async function LineupPage() {
  const snapshot = await getLineupSnapshot();

  return (
    <ReadoutShell
      name="lineup"
      strip={<p>lineup · the well · next block</p>}
    >
      <WellApp initial={snapshot} />
    </ReadoutShell>
  );
}
