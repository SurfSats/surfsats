import Image from "next/image";
import type { HandpickedItem } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

function LightningMark() {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center border border-sats/45 bg-sats/10 text-sats sm:h-11 sm:w-11"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M13.2 2 4 13.6h6.4L9.2 22 20 10.2h-6.6L13.2 2Z" />
      </svg>
    </div>
  );
}

function CardMeta({ item }: { item: HandpickedItem }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
      <span className="text-sats">hand_picked</span>
      <span className="text-magenta">/</span>
      <span className="text-cyan">[{item.source}]</span>
      <span className="text-magenta">/</span>
      <time dateTime={item.date}>{formatDate(item.date)}</time>
    </div>
  );
}

export function HandpickedCard({
  item,
  variant = "latest",
}: {
  item: HandpickedItem;
  variant?: "latest" | "standing";
}) {
  const latest = variant === "latest";
  const hasImage = Boolean(item.image);

  return (
    <article
      className={cn(
        "panel panel-hover",
        latest ? "border-sats/40 p-5 sm:p-7" : "p-4 sm:p-5",
      )}
    >
      <div
        className={cn(
          latest && "flex gap-4",
          latest && hasImage && "flex-col sm:flex-row sm:items-start sm:gap-6",
          latest && !hasImage && "flex-row items-start",
        )}
      >
        {latest && item.image ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="relative aspect-video w-full shrink-0 overflow-hidden border border-cyan/20 sm:w-60"
          >
            <Image
              src={item.image}
              alt=""
              fill
              className="object-cover"
              sizes="(min-width: 640px) 15rem, 100vw"
            />
          </a>
        ) : latest ? (
          <LightningMark />
        ) : null}

        <div className="min-w-0 flex-1">
          <CardMeta item={item} />
          <h3
            className={cn(
              "font-display font-bold uppercase tracking-tight",
              latest ? "mt-3 text-2xl sm:mt-4 sm:text-3xl" : "mt-2.5 text-lg",
            )}
          >
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="glitch-hover hover:text-sats"
            >
              {item.title}
            </a>
          </h3>
          <p
            className={cn(
              "leading-relaxed text-muted",
              latest ? "mt-3 text-sm" : "mt-2 text-[13px]",
            )}
          >
            {item.blurb}
          </p>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex font-mono text-xs uppercase tracking-[0.14em] text-sats glitch-hover hover:text-cyan",
              latest ? "mt-5" : "mt-3",
            )}
          >
            open_signal -&gt;
          </a>
        </div>
      </div>
    </article>
  );
}
