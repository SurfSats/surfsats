import type { Metadata } from "next";
import { ShackStage } from "@/components/shack/ShackStage";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "The Shack · not the front door",
  description: "Side door. Not the front door. Not the menu.",
  path: "/lot",
  absoluteTitle: true,
  robots: { index: false, follow: false },
});

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
