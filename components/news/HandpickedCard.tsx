import type { HandpickedItem } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export function HandpickedCard({
  item,
  featured = false,
}: {
  item: HandpickedItem;
  featured?: boolean;
}) {
  return (
    <article
      className={cn(
        "panel panel-hover flex h-full flex-col p-5 sm:p-6",
        featured && "border-sats/40 sm:p-8",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        <span className="text-sats">hand_picked</span>
        <span className="text-magenta">/</span>
        <span className="text-cyan">[{item.source}]</span>
        <span className="text-magenta">/</span>
        <time dateTime={item.date}>{formatDate(item.date)}</time>
      </div>
      <h3
        className={cn(
          "mt-4 font-display font-bold uppercase tracking-tight",
          featured ? "text-2xl sm:text-3xl" : "text-xl",
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
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{item.blurb}</p>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex font-mono text-xs uppercase tracking-[0.14em] text-sats glitch-hover hover:text-cyan"
      >
        open_signal -&gt;
      </a>
    </article>
  );
}
