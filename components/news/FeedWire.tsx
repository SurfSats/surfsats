import type { FeedItem, FeedSourceStatus } from "@/lib/types";
import { formatAge } from "@/lib/format";

export function FeedWire({
  items,
  sources,
}: {
  items: FeedItem[];
  sources: FeedSourceStatus[];
}) {
  const silent = sources.filter((source) => !source.ok);
  const empty = items.length === 0;

  return (
    <section className="signal-wire" aria-label="Pleb feeds">
      <p className="signal-band-label">pleb feeds</p>
      {empty ? (
        <p className="signal-quiet">
          wire silent. curated signal above still stands.
        </p>
      ) : (
        <ol className="signal-wire-list">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="signal-wire-row"
              >
                <span className="signal-wire-source">{item.source}</span>
                <span className="signal-wire-title">{item.title}</span>
                <time className="signal-wire-age" dateTime={item.date || undefined}>
                  {item.date ? formatAge(item.date) : "—"}
                </time>
              </a>
            </li>
          ))}
        </ol>
      )}
      {silent.length > 0 ? (
        <p className="signal-quiet">
          silent · {silent.map((source) => source.name).join(" · ")}
        </p>
      ) : null}
    </section>
  );
}
