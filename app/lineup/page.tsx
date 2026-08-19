import type { Metadata } from "next";
import { LineupApp } from "@/components/lineup/LineupApp";
import { getLineupSnapshot } from "@/lib/lineup";

export const revalidate = 12;

export const metadata: Metadata = {
  title: "The Lineup",
  description:
    "Watch the next Bitcoin block being assembled. Unconfirmed transactions flow into a next-block template rail, sorted by fee density.",
};

export default async function LineupPage() {
  const snapshot = await getLineupSnapshot();

  return (
    <div className="lineup-page">
      <LineupApp initial={snapshot} />
    </div>
  );
}
