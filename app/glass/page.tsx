import type { Metadata } from "next";
import { WallOfGlass } from "@/components/glass/WallOfGlass";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Wall of Glass",
  description: "21 sats burns a callsign onto the glass. Names are not owned.",
  path: "/glass",
});

export default function GlassPage() {
  return <WallOfGlass />;
}
