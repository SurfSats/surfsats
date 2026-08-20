import type { Metadata } from "next";
import Image from "next/image";
import { ArcadeApp } from "@/components/arcade/ArcadeApp";
import { ARCADE_PRICE_SATS } from "@/lib/arcade";

export const metadata: Metadata = {
  title: "Lightning Arcade",
  description: `Bitcoin dive-bar arcade. Insert ${ARCADE_PRICE_SATS} sats. Three credits. No KYC. We don't HODL.`,
};

export default function ArcadePage() {
  return (
    <div className="arcade-shell">
      <div className="arcade-bg" aria-hidden="true">
        <Image
          src="/arcade-bar.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <div className="arcade-bg-veil" />
      </div>
      <ArcadeApp />
    </div>
  );
}
