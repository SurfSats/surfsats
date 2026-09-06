import type { Metadata } from "next";
import { ReadoutShell } from "@/components/layout/ReadoutShell";
import { MempoolBlockMatrix } from "@/components/telemetry/MempoolBlockMatrix";
import { Container } from "@/components/ui/Container";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Chain",
  description:
    "Bitcoin mainnet telemetry. Tip height and mempool.space recommended fees, polled live.",
  path: "/chain",
});

export default function ChainPage() {
  return (
    <ReadoutShell
      name="chain"
      strip={<p>chain · mempool.space · mainnet consensus</p>}
    >
      <Container className="py-10 sm:py-14">
        <p className="mb-6 font-mono text-[11px] tracking-telemetry text-zinc-raw uppercase">
          TIMECHAIN_TELEMETRY // DIRECT_MEMPOOL
        </p>
        <MempoolBlockMatrix />
      </Container>
    </ReadoutShell>
  );
}
