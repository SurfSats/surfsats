import type { Metadata } from "next";
import { SalvadorDeskView } from "@/components/salvador/SalvadorDesk";
import { getSalvadorDesk } from "@/lib/salvador";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Salvador",
  description: "El Salvador strategic reserve. ONBTC balances, the 1 BTC streak, and the stack.",
  path: "/salvador",
});

export default async function SalvadorPage() {
  const desk = await getSalvadorDesk();
  return <SalvadorDeskView desk={desk} />;
}
