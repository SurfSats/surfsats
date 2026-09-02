import type { Metadata } from "next";
import { ReadoutShell } from "@/components/layout/ReadoutShell";
import { FieldApp } from "@/components/lineup/FieldApp";
import { getLineupSnapshot } from "@/lib/lineup";
import { pageMeta } from "@/lib/seo";

export const revalidate = 20;

export const metadata: Metadata = pageMeta({
  title: "Lineup",
  description: "Value on the wire. Live Bitcoin transactions as squares.",
  path: "/lineup",
});

export default async function LineupPage() {
  const snapshot = await getLineupSnapshot();

  return (
    <ReadoutShell
      name="lineup"
      strip={<p>lineup · value on the wire</p>}
    >
      <FieldApp initial={snapshot} />
    </ReadoutShell>
  );
}
