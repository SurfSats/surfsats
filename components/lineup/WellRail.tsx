"use client";

import { formatInteger } from "@/lib/timechain";
import {
  feeBandColor,
  formatVmb,
  type LineupSnapshot,
} from "@/lib/lineup";

function dash(value: string | number | null | undefined, suffix = "") {
  if (value === null || value === undefined || value === "") return "—";
  return `${value}${suffix}`;
}

export function WellRail({
  snapshot,
  status,
}: {
  snapshot: LineupSnapshot;
  status: "live" | "loading" | "error";
}) {
  const waiting =
    snapshot.mempoolVsize !== null
      ? formatVmb(snapshot.mempoolVsize)
      : null;
  const maxCount = Math.max(1, ...snapshot.bands.map((band) => band.count));

  return (
    <aside className="well-rail" aria-label="Mempool numbers">
      <p className="well-rail-kicker">
        <i data-live={status === "live"} />
        {status === "live" ? "live" : status}
      </p>

      <dl className="well-rail-stats">
        <Stat
          label="tx count"
          value={
            snapshot.mempoolCount !== null
              ? formatInteger(snapshot.mempoolCount)
              : "—"
          }
        />
        <Stat label="vMB waiting" value={dash(waiting)} />
        <Stat
          label="block height"
          value={
            snapshot.blockHeight !== null
              ? formatInteger(snapshot.blockHeight)
              : "—"
          }
        />
        <Stat
          label="next block"
          value={
            snapshot.nextBlockVsize !== null
              ? `${formatVmb(snapshot.nextBlockVsize)} vMB`
              : "—"
          }
          hint={
            snapshot.nextBlockNtx !== null
              ? `${formatInteger(snapshot.nextBlockNtx)} tx`
              : undefined
          }
        />
      </dl>

      <section className="well-rail-fees">
        <h2>sat/vB</h2>
        <ul>
          <FeeRow label="fastest" value={snapshot.fastestFee} hot />
          <FeeRow label="half hour" value={snapshot.halfHourFee} />
          <FeeRow label="hour" value={snapshot.hourFee} />
          <FeeRow label="economy" value={snapshot.economyFee} />
        </ul>
      </section>

      <section className="well-rail-hist">
        <h2>histogram</h2>
        <table>
          <thead>
            <tr>
              <th>sat/vB</th>
              <th>tx</th>
              <th>vMB</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.bands.map((band) => (
              <tr key={band.id}>
                <td>
                  <i style={{ background: feeBandColor(band.min) }} />
                  {band.label}
                </td>
                <td>{formatInteger(band.count)}</td>
                <td>
                  <span
                    className="well-hist-bar"
                    style={{
                      width: `${Math.max(4, (band.count / maxCount) * 100)}%`,
                      background: feeBandColor(band.min),
                    }}
                  />
                  {formatVmb(band.vsize)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="well-rail-source">
        source{" "}
        <a href="https://mempool.space" target="_blank" rel="noreferrer">
          mempool.space
        </a>
      </p>
    </aside>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {value}
        {hint ? <span>{hint}</span> : null}
      </dd>
    </div>
  );
}

function FeeRow({
  label,
  value,
  hot = false,
}: {
  label: string;
  value: number | null;
  hot?: boolean;
}) {
  return (
    <li data-hot={hot || undefined}>
      <span>{label}</span>
      <b>{value !== null ? value.toFixed(0) : "—"}</b>
    </li>
  );
}
