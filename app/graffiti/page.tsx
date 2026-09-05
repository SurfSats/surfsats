import type { Metadata } from "next";
import { GraffitiApp } from "@/components/graffiti/GraffitiApp";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Graffiti Wall",
  description:
    "Zap 21 sats. Leave a mark for 21 hours. Bitcoin Is Hope stays forever.",
  path: "/graffiti",
});

export default function GraffitiPage() {
  return <GraffitiApp />;
}
