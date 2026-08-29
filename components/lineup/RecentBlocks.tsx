import { type LineupSnapshot, formatSatVb } from "@/lib/lineup";
import { formatBlockAge, formatInteger } from "@/lib/timechain";

export function RecentBlocks({
  snapshot,
  now,
}: {
  snapshot: LineupSnapshot;
  now: number;
}) {
  if (snapshot.recent.length === 0) {
    return <p className="well-empty">recent blocks missed</p>;
  }

  return (
    <section className="well-blocks" aria-label="Recent mined blocks">
      <p className="well-blocks-kicker">recent blocks</p>
      <ol>
        {snapshot.recent.map((block) => {
          const ago = formatBlockAge(
            Math.max(0, now / 1000 - block.timestamp),
          );
          return (
            <li key={block.hash}>
              <a
                href={`https://mempool.space/block/${block.hash}`}
                target="_blank"
                rel="noreferrer"
              >
                <span className="well-block-height">
                  {formatInteger(block.height)}
                </span>
                <span className="well-block-pool">
                  {block.pool ?? "unknown"}
                </span>
                <span className="well-block-tx">
                  {formatInteger(block.txCount)} tx
                </span>
                <span className="well-block-fee">
                  {block.medianFee !== null
                    ? `${formatSatVb(block.medianFee)} sat/vB`
                    : "—"}
                </span>
                <span className="well-block-ago">{ago}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
