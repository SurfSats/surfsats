import {
  formatBtc,
  formatPopulation,
  formatSats,
  formatStreakChip,
  formatSvTime,
  formatUsd,
  mempoolAddressUrl,
  mempoolTxUrl,
  SALVADOR_POPULATION,
  truncateMiddle,
  type SalvadorDesk,
  type StackPoint,
} from "@/lib/salvador";
import { ONBTC_WALLET_URL } from "@/lib/onbtc";

function OutLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} className={className} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function StaleMark() {
  return <span className="salvador-stale">stale</span>;
}

function BtcFigure({ sats }: { sats: number }) {
  const text = formatBtc(sats);
  const dot = text.indexOf(".");
  const whole = dot === -1 ? text : text.slice(0, dot);
  const frac = dot === -1 ? "" : text.slice(dot + 1);
  return (
    <>
      <span className="salvador-whole">{whole}</span>
      {frac ? <span className="salvador-frac">.{frac}</span> : null}
      <span className="salvador-unit">BTC</span>
    </>
  );
}

function StackChart({ points }: { points: StackPoint[] }) {
  if (points.length === 0) return null;
  const width = 640;
  const height = 220;
  const padX = 4;
  const padY = 12;
  let min = 0;
  let max = 0;
  for (const point of points) {
    if (point.balanceSats < min) min = point.balanceSats;
    if (point.balanceSats > max) max = point.balanceSats;
  }
  const span = max - min || 1;
  const first = points[0];
  const last = points[points.length - 1];
  const dt = last.time - first.time || 1;
  const coords = points.map((point) => ({
    x: padX + ((point.time - first.time) / dt) * (width - padX * 2),
    y: height - padY - ((point.balanceSats - min) / span) * (height - padY * 2),
  }));
  const d = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`)
    .join(" ");
  const end = coords[coords.length - 1];
  const label = `Summed balance from ${formatBtc(first.balanceSats)} BTC to ${formatBtc(last.balanceSats)} BTC`;

  return (
    <svg
      className="salvador-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      {end ? <circle cx={end.x} cy={end.y} r="3" fill="currentColor" /> : null}
    </svg>
  );
}

export function SalvadorDeskView({ desk }: { desk: SalvadorDesk }) {
  const chip = formatStreakChip(desk.streakDays, desk.historyStale);
  const chipLive = !desk.historyStale && desk.streakDays !== null;
  const todayHref = desk.latest ? mempoolTxUrl(desk.latest.txid) : null;

  return (
    <div className="salvador-page">
      <div className="salvador-col">
        <header className="salvador-hero">
          <p className="salvador-kicker">Strategic reserve</p>
          <p className="salvador-figure-line">
            {desk.totalSats === null ? (
              <span className="salvador-figure">—</span>
            ) : (
              <OutLink href={ONBTC_WALLET_URL} className="salvador-figure">
                <BtcFigure sats={desk.totalSats} />
              </OutLink>
            )}
            {desk.totalStale ? <StaleMark /> : null}
          </p>
          <p className="salvador-sub">
            {desk.usd === null ? "—" : formatUsd(desk.usd)}
            {desk.priceStale ? <StaleMark /> : null}
          </p>
          <p className="salvador-second">
            {desk.satsPerPerson === null ? "—" : formatSats(desk.satsPerPerson)}
            <span>sats per Salvadoran · {formatPopulation(SALVADOR_POPULATION)}</span>
          </p>
          <p className="salvador-chip" data-state={chipLive ? "live" : "stale"} role="status">
            {chip}
          </p>
        </header>

        <section className="salvador-panel" aria-labelledby="salvador-today">
          <h2 id="salvador-today" className="salvador-panel-label">
            Today
          </h2>
          {desk.latest && todayHref ? (
            <div className="salvador-today">
              <OutLink href={todayHref} className="salvador-today-amt">
                {formatBtc(desk.latest.amountSats)} BTC
              </OutLink>
              <p className="salvador-quiet">
                {desk.latest.time === null ? "Unconfirmed" : formatSvTime(desk.latest.time)}
                {desk.historyStale ? <StaleMark /> : null}
              </p>
              <OutLink href={todayHref} className="salvador-txid">
                {truncateMiddle(desk.latest.txid, 8, 8)}
              </OutLink>
              <OutLink href={todayHref} className="salvador-verify">
                mempool.space
              </OutLink>
            </div>
          ) : (
            <p className="salvador-quiet">
              {desk.historyKnown && !desk.historyStale
                ? "No 1 BTC inflow."
                : "Latest inflow unavailable."}
              {desk.historyStale ? <StaleMark /> : null}
            </p>
          )}
        </section>

        <section className="salvador-panel" aria-labelledby="salvador-addresses">
          <h2 id="salvador-addresses" className="salvador-panel-label">
            Addresses
          </h2>
          <ul className="salvador-rows">
            {desk.addresses.map((row) => {
              const href = mempoolAddressUrl(row.address);
              return (
                <li key={row.address} className="salvador-row">
                  <OutLink href={href} className="salvador-addr">
                    {truncateMiddle(row.address, 6, 6)}
                  </OutLink>
                  {row.balanceSats === null ? (
                    <span className="salvador-bal">
                      —
                      <StaleMark />
                    </span>
                  ) : (
                    <OutLink href={href} className="salvador-bal">
                      {formatBtc(row.balanceSats)} BTC
                      {row.stale ? <StaleMark /> : null}
                    </OutLink>
                  )}
                  <OutLink href={href} className="salvador-verify">
                    Verify
                  </OutLink>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="salvador-panel" aria-labelledby="salvador-stack">
          <h2 id="salvador-stack" className="salvador-panel-label">
            Stack
          </h2>
          {desk.stack.length > 0 ? (
            <OutLink href={ONBTC_WALLET_URL} className="salvador-chart-link">
              <StackChart points={desk.stack} />
              {desk.historyStale ? <StaleMark /> : null}
            </OutLink>
          ) : (
            <p className="salvador-quiet">
              {desk.historyKnown && !desk.historyStale
                ? "No confirmed movement."
                : "Stack unavailable."}
              {desk.historyStale ? <StaleMark /> : null}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
