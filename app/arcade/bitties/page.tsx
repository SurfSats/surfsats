import type { Metadata } from "next";
import { BittiesShell } from "@/components/arcade/BittiesShell";
import { ARCADE_PRICE_SATS } from "@/lib/arcade";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "BOUNCING BITTIES",
  description: `BOUNCING BITTIES · ${ARCADE_PRICE_SATS} sats · tap to bounce.`,
  path: "/arcade/bitties",
});

export default function BittiesPage() {
  return <BittiesShell />;
}
