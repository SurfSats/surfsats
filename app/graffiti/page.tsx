import type { Metadata } from "next";
import { GraffitiApp } from "@/components/graffiti/GraffitiApp";
import { GRAFFITI_PRICE_SATS, GRAFFITI_TTL_HOURS } from "@/lib/graffiti";

export const metadata: Metadata = {
  title: "Graffiti Wall",
  description:
    "Pay 21 sats. Leave a mark for 21 hours. Bitcoin Is Hope stays forever.",
};

export default function GraffitiPage() {
  return (
    <div className="relative">
      <div className="graffiti-hero pointer-events-none">
        <div className="graffiti-hero-scrim" aria-hidden="true" />
        <div className="graffiti-hero-copy">
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone-300/90">
            city wall · no accounts
          </p>
          <h1 className="graffiti-hero-title">Graffiti Wall</h1>
          <p className="graffiti-hero-tagline">
            {GRAFFITI_PRICE_SATS} sats. {GRAFFITI_TTL_HOURS} hours. Then it
            fades. Bitcoin Is Hope does not.
          </p>
        </div>
      </div>
      <GraffitiApp />
    </div>
  );
}
