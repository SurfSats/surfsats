import type { NewsLink } from "@/lib/types";
import { formatDate } from "@/lib/format";

export function NewsCard({ item }: { item: NewsLink }) {
  return (
    <article className="panel panel-hover p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        <span className="text-cyan">[{item.source}]</span>
        <span className="text-magenta">/</span>
        <time dateTime={item.date}>{formatDate(item.date)}</time>
      </div>
      <h2 className="mt-3 font-display text-xl font-bold uppercase tracking-tight">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="glitch-hover hover:text-sats"
        >
          {item.title}
        </a>
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">{item.blurb}</p>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex font-mono text-xs uppercase tracking-[0.14em] text-sats glitch-hover hover:text-cyan"
      >
        open_link -&gt;
      </a>
    </article>
  );
}
