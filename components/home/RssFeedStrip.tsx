import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { formatAge } from "@/lib/format";
import type { FeedItem } from "@/lib/types";
import { cn } from "@/lib/cn";
import {
  BRUTALIST_BUTTON_SIZE_CLASS,
  BRUTALIST_BUTTON_VARIANT_CLASS,
} from "@/lib/brutalist-ui";

export const RSS_FEED_STRIP_LIMIT = 3;

type RssFeedStripProps = {
  items: FeedItem[];
};

export function RssFeedStrip({ items }: RssFeedStripProps) {
  const rows = items.slice(0, RSS_FEED_STRIP_LIMIT);

  return (
    <TerminalCard
      title="DISPATCHES // FEED"
      tag="SYNDICATION // RSS"
      status={rows.length ? "live" : "idle"}
    >
      {rows.length === 0 ? (
        <p className="font-mono text-xs tracking-telemetry text-zinc-raw uppercase">
          CARRIER_SILENT // NO_PACKETS
        </p>
      ) : (
        <div className="divide-y divide-zinc-raw/40 font-mono text-xs">
          {rows.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-2 px-1 py-2 transition-colors hover:bg-zinc-raw/10 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                <time
                  className="shrink-0 text-[10px] tracking-telemetry text-zinc-raw uppercase"
                  dateTime={item.date || undefined}
                >
                  {item.date ? formatAge(item.date) : "--"}
                </time>
                <span className="shrink-0 border border-violet/40 bg-violet/10 px-1 text-[9px] tracking-telemetry text-violet uppercase">
                  {item.source}
                </span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-bold text-salt transition-colors hover:text-amber"
                >
                  {item.title}
                </a>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-1 text-[10px] tracking-telemetry text-zinc-raw uppercase hover:text-salt"
              >
                <span>READ</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </div>
      )}
      <Link
        href="/signal"
        className={cn(
          "mt-4 inline-flex items-center justify-center border font-mono font-bold tracking-telemetry uppercase",
          BRUTALIST_BUTTON_SIZE_CLASS.sm,
          BRUTALIST_BUTTON_VARIANT_CLASS.secondary,
        )}
      >
        OPEN SIGNAL -&gt;
      </Link>
    </TerminalCard>
  );
}
