import type { FeedItem, FeedSourceStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";

export function FeedWire({
  items,
  sources,
}: {
  items: FeedItem[];
  sources: FeedSourceStatus[];
}) {
  const live = sources.filter((source) => source.ok).map((source) => source.name);
  const silent = sources.filter((source) => !source.ok).map((source) => source.name);

  return (
    <section>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
            {"//"} underground_signal
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
            Pleb feeds
          </h2>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          cypherpunk · independent · no desks
        </p>
      </div>

      {items.length > 0 ? (
        <ol className="panel mt-5 divide-y divide-cyan/15 overflow-hidden">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col gap-1 px-4 py-3 hover:bg-cyan/5 sm:flex-row sm:items-baseline sm:gap-4"
              >
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-sats">
                  [{item.source}]
                </span>
                <span className="min-w-0 flex-1 text-sm text-foreground glitch-hover">
                  {item.title}
                </span>
                {item.date ? (
                  <time
                    dateTime={item.date}
                    className="shrink-0 font-mono text-[11px] uppercase text-muted"
                  >
                    {formatDate(item.date)}
                  </time>
                ) : null}
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <div className="panel mt-5 px-4 py-6 font-mono text-sm text-muted">
          wire silent · no headlines came back. the curated signal above still stands.
        </div>
      )}

      <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted">
        {live.length > 0 ? `tuned: ${live.join(" · ")}` : "no live sources"}
        {silent.length > 0 ? ` · silent: ${silent.join(" · ")}` : ""}
      </p>
    </section>
  );
}
