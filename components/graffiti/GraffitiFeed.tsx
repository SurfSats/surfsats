import { graffitiStyles, type GraffitiMark } from "@/lib/graffiti";
import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";

export function GraffitiFeed({
  marks,
  highlightId,
  now,
  onSelect,
}: {
  marks: GraffitiMark[];
  highlightId?: string | null;
  now: number;
  onSelect: (id: string) => void;
}) {
  const rows = [...marks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (!rows.length) {
    return (
      <p className="graffiti-feed-empty">
        {COPY.emptyFeed}
      </p>
    );
  }

  return (
    <ol className="graffiti-feed">
      {rows.map((mark) => {
        const style =
          graffitiStyles.find((item) => item.id === mark.style)?.label ??
          mark.style;
        return (
          <li key={mark.id}>
            <button
              type="button"
              className={cn(
                "graffiti-feed-row",
                highlightId === mark.id && "is-on",
              )}
              onClick={() => onSelect(mark.id)}
            >
              <span className="graffiti-feed-msg">{mark.text}</span>
              <span className="graffiti-feed-meta">
                {style} · {ageLabel(mark.createdAt, now)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function ageLabel(iso: string, now: number) {
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? "1h ago" : `${hrs}h ago`;
}
