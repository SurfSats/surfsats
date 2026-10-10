import {
  formatBtc,
  formatPopulation,
  formatSats,
  formatStreakChip,
  formatSvTime,
  formatUsd,
  mempoolAddressUrl,
  mempoolTxUrl,
  reserveUsd,
  SALVADOR_POPULATION,
  truncateMiddle,
  type BalanceStep,
  type SalvadorDesk,
} from "@/lib/salvador";
import { ONBTC_WALLET_URL } from "@/lib/onbtc";
import { SalvadorStack, type StackViewStep } from "@/components/salvador/SalvadorStack";

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

function signedBtc(sats: number) {
  if (sats > 0) return `+${formatBtc(sats)} BTC`;
  return `${formatBtc(sats)} BTC`;
}

function signedUsd(amount: number) {
  if (amount > 0) return `+${formatUsd(amount)}`;
  return formatUsd(amount);
}

function stackViews(steps: readonly BalanceStep[], priceUsd: number | null): StackViewStep[] {
  return steps.map((step) => ({
    time: step.time,
    balanceSats: step.balanceSats,
    txid: step.txid,
    href: step.txid ? mempoolTxUrl(step.txid) : null,
    label: step.txid ? truncateMiddle(step.txid, 8, 8) : null,
    when: step.txid ? formatSvTime(step.time) : null,
    deltaBtc: step.deltaSats === null ? null : signedBtc(step.deltaSats),
    balanceBtc: `${formatBtc(step.balanceSats)} BTC`,
    deltaUsd:
      step.deltaSats === null || priceUsd === null
        ? null
        : signedUsd(reserveUsd(step.deltaSats, priceUsd)),
    balanceUsd: priceUsd === null ? null : formatUsd(reserveUsd(step.balanceSats, priceUsd)),
    gain: (step.deltaSats ?? 0) > 0,
  }));
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

        <section className="salvador-panel salvador-stack-panel" aria-labelledby="salvador-stack">
          <h2 id="salvador-stack" className="salvador-panel-label">
            Stack
          </h2>
          {desk.steps.length > 1 ? (
            <>
              <SalvadorStack steps={stackViews(desk.steps, desk.priceUsd)} usdReady={desk.priceUsd !== null} />
              {desk.historyStale ? <StaleMark /> : null}
            </>
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
