import type { HandpickedItem } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export function HandpickedCard({
  item,
  variant = "latest",
}: {
  item: HandpickedItem;
  variant?: "latest" | "standing";
}) {
  const latest = variant === "latest";

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "signal-card",
        latest ? "panel panel-hover is-latest" : "is-standing",
      )}
    >
      <p className="signal-card-meta">
        <span>{item.source}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={item.date}>{formatDate(item.date)}</time>
      </p>
      <h3 className="signal-card-title">{item.title}</h3>
      {latest ? <p className="signal-card-blurb">{item.blurb}</p> : null}
      <span className="signal-card-verb">OPEN_SIGNAL</span>
    </a>
  );
}
