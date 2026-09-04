import type { Metadata } from "next";
import { AnarchShell } from "@/components/arcade/AnarchShell";
import { ARCADE_PRICE_SATS } from "@/lib/arcade";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "ANARCH",
  description: `ANARCH · CC0 · drummyfish · ${ARCADE_PRICE_SATS} sats to boot.`,
  path: "/arcade/anarch",
});

export default function AnarchPage() {
  return <AnarchShell />;
}
