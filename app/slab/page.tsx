import type { Metadata } from "next";
import { SlabApp } from "@/components/slab/SlabApp";
import { pageMeta } from "@/lib/seo";
import { SLAB_COPY } from "@/lib/slab";

export const metadata: Metadata = pageMeta({
  title: SLAB_COPY.title,
  description: `${SLAB_COPY.clock}. ${SLAB_COPY.swell}. ${SLAB_COPY.reef}.`,
  path: "/slab",
});

export default function SlabPage() {
  return <SlabApp />;
}
