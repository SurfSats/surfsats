import Link from "next/link";
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
      <article className="well-glass well-card">
        <p className="well-card-kicker">mempool</p>
        <dl>
          <div>
            <dt>unconfirmed</dt>
            <dd>
              {snapshot.mempoolCount !== null
                ? formatInteger(snapshot.mempoolCount)
                : "—"}
            </dd>
          </div>
          <div>
            <dt>vsize</dt>
            <dd>
              {snapshot.mempoolVsize !== null
                ? `${formatVmb(snapshot.mempoolVsize)} vMB`
                : "—"}
            </dd>
          </div>
          <div>
            <dt>total fee</dt>
            <dd>
              {snapshot.mempoolTotalFee !== null
                ? formatBtcFromSats(snapshot.mempoolTotalFee)
                : "—"}
            </dd>
          </div>
        </dl>
      </article>

      <article className="well-glass well-card">
        <p className="well-card-kicker">retarget</p>
        <dl>
          <div>
            <dt>progress</dt>
            <dd>
              {progress !== null ? `${progress.toFixed(1)}%` : "—"}
              {snapshot.remainingBlocks !== null
                ? ` · ${formatInteger(snapshot.remainingBlocks)} left`
                : ""}
            </dd>
          </div>
          <div>
            <dt>eta</dt>
            <dd>{eta}</dd>
          </div>
          <div>
            <dt>avg block</dt>
            <dd>
              {snapshot.timeAvg !== null
                ? formatInterval(snapshot.timeAvg)
                : "—"}
            </dd>
          </div>
        </dl>
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
        <Link href="/tidechain" className="well-readout">
          readout -&gt; height / hashrate / moscow
        </Link>
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
