import type { Metadata } from "next";
import { GraffitiApp } from "@/components/graffiti/GraffitiApp";
import { GRAFFITI_PRICE_SATS } from "@/lib/graffiti";

export const metadata: Metadata = {
  title: "Graffiti Wall",
  description:
    "Pay 21 sats. Leave a mark for 24 hours. Bitcoin Is Hope stays forever.",
};

export default function GraffitiPage() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-5 py-8 sm:px-8 sm:py-10">
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone-300/80">
          city wall · no accounts
        </p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight text-[#efe6d4] sm:text-6xl">
          Graffiti Wall
        </h1>
        <p className="mt-3 max-w-md text-sm text-stone-300 sm:text-base">
          {GRAFFITI_PRICE_SATS} sats. 24 hours. Then it fades. Bitcoin Is Hope
          does not.
        </p>
      </div>
      <GraffitiApp />
    </div>
  );
}
