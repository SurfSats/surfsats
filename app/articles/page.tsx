import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Signal",
  description:
    "Hand-picked Bitcoin + surf culture signal, SurfSats articles, and underground pleb feeds.",
  path: "/signal",
});

export default function ArticlesRedirect() {
  redirect("/signal#articles");
}
