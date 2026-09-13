import type { Metadata } from "next";
import { GlassPlaque } from "@/components/glass/GlassPlaque";
import { sanitizeCallsign } from "@/lib/callsign";
import { getCallsignEtch } from "@/lib/callsign-store";
import { pageMeta } from "@/lib/seo";

type GlassNamePageProps = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({
  params,
}: GlassNamePageProps): Promise<Metadata> {
  const { name: raw } = await params;
  const parsed = sanitizeCallsign(decodeURIComponent(raw || ""));
  const name = parsed.ok ? parsed.callsign : "CALLSIGN";
  return pageMeta({
    title: name,
    description: `${name} on the Wall of Glass.`,
    path: `/glass/${name}`,
  });
}

export default async function GlassNamePage({ params }: GlassNamePageProps) {
  const { name: raw } = await params;
  const parsed = sanitizeCallsign(decodeURIComponent(raw || ""));
  const name = parsed.ok ? parsed.callsign : raw.toUpperCase();
  const etch = parsed.ok ? await getCallsignEtch(parsed.callsign) : null;
  return <GlassPlaque name={name} etch={etch} />;
}
