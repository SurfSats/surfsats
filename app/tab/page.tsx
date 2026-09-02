import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { TabHarbor } from "@/components/tab/TabHarbor";
import { parseBarTree } from "@/lib/bar-tree";
import { pageMeta } from "@/lib/seo";
import { TAB_CREDITS_PER_PAY, TAB_PRICE_SATS } from "@/lib/tab";

export const metadata: Metadata = pageMeta({
  title: "THE TAB",
  description: `${TAB_PRICE_SATS} sats. ${TAB_CREDITS_PER_PAY} credits. One sitting. No KYC. We don't HODL.`,
  path: "/tab",
});

async function readTree() {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "public", "tab", "bar-tree.json"),
      "utf8",
    );
    return parseBarTree(JSON.parse(raw));
  } catch {
    return null;
  }
}

export default async function TabPage() {
  const tree = await readTree();
  return <TabHarbor initialTree={tree} />;
}
