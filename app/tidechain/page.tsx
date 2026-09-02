import type { Metadata } from "next";
import { ReadoutShell } from "@/components/layout/ReadoutShell";
import { TidechainApp } from "@/components/timechain/TidechainApp";
import { pageMeta } from "@/lib/seo";
import { getTimechainSnapshot } from "@/lib/timechain";

export const revalidate = 20;

export const metadata: Metadata = pageMeta({
  title: "TideChain",
  description:
    "Bitcoin protocol monitor. The chain is the clock. Live height, last block, 24h production, difficulty epoch, and path to the next halving.",
  path: "/tidechain",
});

export default async function TidechainPage() {
  const snapshot = await getTimechainSnapshot();

  return (
    <ReadoutShell
      name="tidechain"
      className="tidechain-page"
      strip={<p>tidechain · the clock · live height</p>}
    >
      <TidechainApp initial={snapshot} />
    </ReadoutShell>
  );
}
