import type { Metadata } from "next";
import { SwellShell } from "@/components/arcade/SwellShell";
import { ARCADE_PRICE_SATS } from "@/lib/arcade";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "SWELL HOP",
  description: `SWELL HOP · ${ARCADE_PRICE_SATS} sats · tap to hop.`,
  path: "/arcade/swell",
});

export default function SwellPage() {
  return <SwellShell />;
}
