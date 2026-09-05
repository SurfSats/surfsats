import type { Metadata } from "next";
import { MachineDock } from "@/components/home/MachineDock";
import { HomeClose } from "@/components/home/HomeClose";
import { TerminalHero } from "@/components/home/TerminalHero";
import { HydrographicRelayHud } from "@/components/nostr/HydrographicRelayHud";
import { BathymetricPcbDivider } from "@/components/ui/BathymetricPcbDivider";
import { Container } from "@/components/ui/Container";
import { HexStreamHeader } from "@/components/ui/HexStreamHeader";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "SurfSats · no banks, no bosses",
  description:
    "Lightning sandbox. 21 sats. Permissionless ocean intelligence.",
  path: "/",
  absoluteTitle: true,
});

export default function HomePage() {
  return (
    <div className="bg-void text-salt">
      <HexStreamHeader
        title="SURFSATS // SOVEREIGN_TERMINAL"
        telemetryTag="L402_CORE // 21_SATS"
      />
      <TerminalHero />
      <BathymetricPcbDivider />
      <MachineDock />
      <BathymetricPcbDivider />
      <section className="bg-void">
        <Container className="py-8 sm:py-10">
          <p className="mb-6 font-mono text-[11px] tracking-telemetry text-zinc-raw uppercase">
            DECENTRALIZED_TRANSMISSION // DAMUS_NOS_PRIMAL
          </p>
          <HydrographicRelayHud />
        </Container>
      </section>
      <BathymetricPcbDivider />
      <HomeClose />
    </div>
  );
}
