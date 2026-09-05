import type { Metadata } from "next";
import { HydrographicRelayHud } from "@/components/nostr/HydrographicRelayHud";
import { DecryptionShutter } from "@/components/sandbox/DecryptionShutter";
import { HydraulicWaveOscilloscope } from "@/components/sandbox/HydraulicWaveOscilloscope";
import { HexStreamHeader } from "@/components/ui/HexStreamHeader";
import { Container } from "@/components/ui/Container";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Sandbox",
  description:
    "Streaming sats oscilloscope, a 21-sat L402 paywall, and a live Nostr zap HUD. No accounts. Preimage or nothing.",
  path: "/sandbox",
});

export default function SandboxPage() {
  return (
    <div className="bg-void text-salt">
      <HexStreamHeader
        title="SANDBOX"
        telemetryTag="L402 // NOSTR_RELAY"
      />
      <Container className="flex flex-col gap-8 py-8 sm:py-10">
        <p className="max-w-2xl font-mono text-sm leading-relaxed text-zinc-raw">
          Three benches on the floor. Swell telemetry, a classified shutter, and
          a hydrographic Nostr relay HUD on damus / nos.lol / primal.
        </p>
        <HydrographicRelayHud />
        <HydraulicWaveOscilloscope />
        <DecryptionShutter />
      </Container>
    </div>
  );
}
