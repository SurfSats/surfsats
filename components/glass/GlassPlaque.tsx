"use client";

import Link from "next/link";
import { Container } from "@/components/ui/Container";
import type { CallsignEtch } from "@/lib/callsign";
import { useGlass } from "@/lib/useGlass";

function formatWhen(iso: string) {
  const parsed = new Date(iso).getTime();
  if (!Number.isFinite(parsed)) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function hashRef(hash: string) {
  return hash.slice(0, 8);
}

export function GlassPlaque({
  name,
  etch,
}: {
  name: string;
  etch: CallsignEtch | null;
}) {
  const { glass } = useGlass();
  const mine = glass?.callsign === name;

  return (
    <div className="glass-wall">
      <div className="glass-wall-bg" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/harbor.jpg" alt="" />
        <div className="glass-wall-scrim" />
      </div>
      <Container className="relative max-w-2xl py-10 sm:py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan">
          {"//"} wall of glass
        </p>
        <p className="mt-3 font-mono text-4xl font-bold uppercase tracking-tight text-[#efe6d4] sm:text-5xl">
          {name}
        </p>
        {etch ? (
          <div className="glass-plaque mt-8 space-y-3 font-mono text-sm uppercase tracking-[0.12em] text-stone-300">
            <p className="text-sats">on the glass</p>
            <p>first machine · {etch.firstMachine}</p>
            {etch.blockHeight != null ? <p>height · {etch.blockHeight}</p> : null}
            <p>first hash · {hashRef(etch.firstPaymentHash)}</p>
            <p>etched · {formatWhen(etch.createdAt)}</p>
            <p>last seen · {formatWhen(etch.lastSeenAt)}</p>
            <p>machines · {etch.machines.join(" · ")}</p>
          </div>
        ) : (
          <p className="mt-8 font-mono text-sm uppercase tracking-[0.12em] text-stone-400">
            not on the glass yet. 21 sats burns it.
          </p>
        )}
        {mine ? (
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-cyan">
            {glass?.etched ? "this browser · on the glass" : "this browser · not etched"}
          </p>
        ) : null}
        <Link href="/glass" className="glass-back">
          back to the wall
        </Link>
      </Container>
    </div>
  );
}
