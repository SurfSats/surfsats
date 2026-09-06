import type { Metadata } from "next";
import { HomeClose } from "@/components/home/HomeClose";
import { MachineDock } from "@/components/home/MachineDock";
import { RssFeedStrip } from "@/components/home/RssFeedStrip";
import { TerminalHero } from "@/components/home/TerminalHero";
import { HydrographicRelayHud } from "@/components/nostr/HydrographicRelayHud";
import { GlobalJukeboxMini } from "@/components/radio/GlobalJukeboxMini";
import { BathymetricPcbDivider } from "@/components/ui/BathymetricPcbDivider";
import { Container } from "@/components/ui/Container";
import { HexStreamHeader } from "@/components/ui/HexStreamHeader";
import { getLiveFeeds } from "@/lib/feeds";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "SurfSats · no banks, no bosses",
  description:
    "Lightning sandbox. 21 sats. Permissionless ocean intelligence.",
  path: "/",
  absoluteTitle: true,
});

export default async function HomePage() {
  const { items: feedItems } = await getLiveFeeds();

  return (
    <div className="bg-void text-salt">
      <HexStreamHeader
        title="SURFSATS // SOVEREIGN_TERMINAL"
        telemetryTag="L402_CORE // 21_SATS"
      />
      <TerminalHero />
      <BathymetricPcbDivider />
      <section className="bg-void">
        <Container className="py-8 sm:py-10">
          <p className="mb-6 font-mono text-[11px] tracking-telemetry text-zinc-raw uppercase">
            GLOBAL_JUKEBOX // NODERUNNERS_RADIO
          </p>
          <GlobalJukeboxMini />
        </Container>
      </section>
      <BathymetricPcbDivider />
      <MachineDock />
      <BathymetricPcbDivider />
      <section className="bg-void">
        <Container className="py-8 sm:py-10">
          <p className="mb-6 font-mono text-[11px] tracking-telemetry text-zinc-raw uppercase">
            DISPATCHES // SYNDICATION
          </p>
          <RssFeedStrip items={feedItems} />
        </Container>
      </section>
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
