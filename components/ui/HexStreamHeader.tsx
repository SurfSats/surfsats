"use client";

import { Radio, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import {
  HEX_STREAM_DEFAULT_TAG,
  randomHexSnippet,
} from "@/lib/brutalist-ui";

type HexStreamHeaderProps = {
  title: string;
  telemetryTag?: string;
  className?: string;
};

export function HexStreamHeader({
  title,
  telemetryTag = HEX_STREAM_DEFAULT_TAG,
  className,
}: HexStreamHeaderProps) {
  const [hexSnippet, setHexSnippet] = useState("0x00000000");

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHexSnippet(randomHexSnippet());
    }, 120);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <header
      className={cn("w-full border-b border-zinc-raw bg-void p-4", className)}
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Terminal className="h-5 w-5 text-violet" />
          <h1 className="font-display text-2xl font-black tracking-brutalist text-salt uppercase md:text-3xl">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs">
          <div className="flex items-center gap-2 border border-zinc-raw bg-void px-2 py-1">
            <Radio className="h-3.5 w-3.5 animate-pulse text-terminal-green" />
            <span className="font-bold text-salt">{hexSnippet}</span>
          </div>
          <span className="hidden text-zinc-raw sm:inline">{telemetryTag}</span>
        </div>
      </div>
    </header>
  );
}
