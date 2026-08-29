import {
  type LineupSnapshot,
  formatBtcFromSats,
  formatSatVb,
} from "@/lib/lineup";
import { formatBlockAge, formatInteger } from "@/lib/timechain";

export function RecentBlocks({
  snapshot,
  now,
}: {
  snapshot: LineupSnapshot;
  now: number;
}) {
  if (snapshot.recent.length === 0) {
    return (
      <div className="well-glass well-empty">
        <p>recent blocks missed · readout via mempool.space API</p>
      </div>
    );
  }

  return (
    <div className="well-blocks" aria-label="Recent mined blocks">
      {snapshot.recent.map((block) => {
        const ago = formatBlockAge(Math.max(0, now / 1000 - block.timestamp));
        return (
          <a
            key={block.hash}
            className="well-glass well-block"
            href={`https://mempool.space/block/${block.hash}`}
            target="_blank"
            rel="noreferrer"
          >
            <span className="well-block-height">
              {formatInteger(block.height)}
            </span>
            <span className="well-block-meta">
              {formatInteger(block.txCount)} tx
              {block.medianFee !== null
                ? ` · ${formatSatVb(block.medianFee)} sat/vB`
                : ""}
            </span>
            <span className="well-block-fees">
              {block.totalFees !== null
                ? formatBtcFromSats(block.totalFees)
                : "—"}
            </span>
            <span className="well-block-pool">{block.pool ?? "unknown"}</span>
            <span className="well-block-ago">{ago}</span>
          </a>
        );
      })}
    </div>
  );
}
