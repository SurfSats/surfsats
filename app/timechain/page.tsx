import type { Metadata } from "next";
import { TidechainApp } from "@/components/timechain/TidechainApp";
import { getTimechainSnapshot } from "@/lib/timechain";

export const revalidate = 20;

export const metadata: Metadata = {
  title: "TideChain",
  description:
    "The chain is the clock. The tide is the schedule. Live Bitcoin time: height, last block, difficulty, halving, supply, hashrate, fees, Moscow Time.",
};

export default async function TimechainPage() {
  const snapshot = await getTimechainSnapshot();

  return (
    <div className="tidechain-page">
      <TidechainApp initial={snapshot} />
    </div>
  );
}
