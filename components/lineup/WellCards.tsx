import {
  type LineupSnapshot,
  formatBtcFromSats,
  formatVmb,
} from "@/lib/lineup";
import { formatInteger, formatInterval } from "@/lib/timechain";

export function WellCards({
  snapshot,
  now,
}: {
  snapshot: LineupSnapshot;
  now: number;
}) {
  const eta =
    snapshot.estimatedRetargetDate !== null
      ? formatEta(snapshot.estimatedRetargetDate, now)
      : "—";
  const progress = snapshot.progressPercent;

  return (
    <div className="well-cards">
      <article className="well-card">
        <p className="well-card-kicker">mempool</p>
        <p className="well-card-line">
          <b>
            {snapshot.mempoolCount !== null
              ? formatInteger(snapshot.mempoolCount)
              : "—"}
          </b>{" "}
          tx
          <span>
            {snapshot.mempoolVsize !== null
              ? `${formatVmb(snapshot.mempoolVsize)} vMB`
              : "—"}
          </span>
          <span>
            {snapshot.mempoolTotalFee !== null
              ? formatBtcFromSats(snapshot.mempoolTotalFee)
              : "—"}
          </span>
        </p>
      </article>

      <article className="well-card">
        <p className="well-card-kicker">retarget</p>
        <p className="well-card-line">
          <b>{progress !== null ? `${progress.toFixed(1)}%` : "—"}</b>
          <span>
            {snapshot.remainingBlocks !== null
              ? `${formatInteger(snapshot.remainingBlocks)} left`
              : "—"}
          </span>
          <span>{eta}</span>
          <span>
            {snapshot.timeAvg !== null ? formatInterval(snapshot.timeAvg) : "—"}
          </span>
        </p>
        {progress !== null ? (
          <div
            className="well-progress"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: `${Math.max(2, Math.min(100, progress))}%` }} />
          </div>
        ) : null}
      </article>
    </div>
  );
}

function formatEta(ms: number, now: number) {
  const delta = ms - now;
  if (!Number.isFinite(delta)) return "—";
  const days = delta / 86_400_000;
  const when = new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  if (Math.abs(days) >= 1) {
    const sign = days >= 0 ? "~" : "";
    return `${sign}${Math.abs(days).toFixed(1)}d · ${when}`;
  }
  return `${formatInterval(Math.abs(delta))} · ${when}`;
}
