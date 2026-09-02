import type { Metadata } from "next";
import { ShackStage } from "@/components/shack/ShackStage";

export const metadata: Metadata = {
  title: { absolute: "The Shack · not the front door" },
  description: "Side door. Not the front door. Not the menu.",
};

type LotQuery = {
  cam?: string;
  focus?: string;
  debug?: string;
};

export default async function LotPage({
  searchParams,
}: {
  searchParams: Promise<LotQuery>;
}) {
  const q = await searchParams;
  return (
    <ShackStage
      cam={q.cam}
      focus={q.focus}
      debug={q.debug !== undefined}
    />
  );
}
