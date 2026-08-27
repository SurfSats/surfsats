import type { Metadata } from "next";
import { FiatApp } from "@/components/fiat/FiatApp";
import { getFiatDebt } from "@/lib/fiat";
import { getTimechainSnapshot } from "@/lib/timechain";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "DIRTY FIAT",
  description: "The printer does not sleep. Bitcoin does not print.",
};

export default async function FiatPage() {
  const [debt, chain] = await Promise.all([
    getFiatDebt(),
    getTimechainSnapshot(),
  ]);

  return <FiatApp initialDebt={debt} initialChain={chain} />;
}
