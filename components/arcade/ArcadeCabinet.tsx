"use client";

import {
  ARCADE_ALIAS_MAX,
  ARCADE_PRICE_SATS,
  formatCredits,
} from "@/lib/arcade";
import {
  ArcadeScreen,
  type ArcadeScreenMode,
} from "@/components/arcade/ArcadeScreen";

export function ArcadeCabinet({
  alias,
  credits,
  mode,
  pending,
  qrSrc,
  paymentRequest,
  waiting,
  invoiceError,
  expired,
  remainLabel,
  copied,
  error,
  onAlias,
  onInsert,
  onPlay,
  onCopy,
  onCancel,
}: {
  alias: string;
  credits: number;
  mode: ArcadeScreenMode;
  pending: boolean;
  qrSrc: string;
  paymentRequest: string;
  waiting: boolean;
  invoiceError: string | null;
  expired: boolean;
  remainLabel: string;
  copied: boolean;
  error: string | null;
  onAlias: (value: string) => void;
  onInsert: () => void;
  onPlay: () => void;
  onCopy: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="cab">
      <aside className="cab-side" aria-hidden="true">
        <p className="cab-side-lightning">LIGHTNING</p>
        <div className="cab-sticker cab-sticker-btc">₿</div>
        <div className="cab-sticker cab-sticker-skull">☠</div>
        <div className="cab-sticker cab-sticker-heart">♥ 21</div>
      </aside>

      <div className="cab-front">
        <div className="cab-marquee">
          <svg className="cab-wave-mark" viewBox="0 0 64 16" aria-hidden="true">
            <path
              d="M2 12c6-10 12-10 18 0s12 10 18 0 12-10 18 0"
              fill="none"
              stroke="#3dfff3"
              strokeWidth="2.4"
            />
          </svg>
          <p className="cab-marquee-brand">SURFSATS</p>
          <p className="cab-marquee-sub">ARCADE</p>
          <svg className="cab-wave-mark" viewBox="0 0 64 16" aria-hidden="true">
            <path
              d="M2 12c6-10 12-10 18 0s12 10 18 0 12-10 18 0"
              fill="none"
              stroke="#3dfff3"
              strokeWidth="2.4"
            />
          </svg>
        </div>

        <div className="cab-bezel">
          <ArcadeScreen
            mode={mode}
            credits={credits}
            qrSrc={qrSrc}
            paymentRequest={paymentRequest}
            waiting={waiting}
            invoiceError={invoiceError}
            expired={expired}
          />
        </div>

        <div className="cab-deck">
          <button
            type="button"
            className="cab-stick"
            onClick={onPlay}
            aria-label="Play"
          >
            <span className="cab-stick-shaft" />
            <span className="cab-stick-ball" />
          </button>
          <div className="cab-buttons">
            <button
              type="button"
              className="cab-btn cab-btn-red"
              onClick={onPlay}
              aria-label="Start"
            />
            <button type="button" className="cab-btn cab-btn-gold" tabIndex={-1} aria-hidden="true" />
            <button type="button" className="cab-btn cab-btn-cyan" tabIndex={-1} aria-hidden="true" />
          </div>
        </div>

        <div className="cab-coin" id="arcade-coin">
          <button
            type="button"
            className="cab-insert"
            disabled={pending}
            onClick={onInsert}
          >
            INSERT
            <span>{ARCADE_PRICE_SATS} SATS</span>
          </button>
          <div className="cab-coin-btc" aria-hidden="true">
            ₿
          </div>
          <div className="cab-led">
            <p>CREDITS</p>
            <p className="cab-led-num">{formatCredits(credits)}</p>
          </div>
          <p className="cab-badge cab-badge-left">
            LIGHTNING
            <br />
            ENABLED
          </p>
          <p className="cab-badge cab-badge-right">
            ⚠ CAUTION
            <br />
            NO FIAT
            <br />
            NO FICTION
          </p>
          <p className="cab-badge cab-badge-sats">₿ SATS ACCEPTED HERE</p>

          <label className="cab-alias">
            <span>CALLSIGN</span>
            <input
              value={alias}
              maxLength={ARCADE_ALIAS_MAX}
              onChange={(event) => onAlias(event.target.value)}
              placeholder="ALIAS"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          {error ? <p className="cab-error">{error}</p> : null}

          {mode === "invoice" ? (
            <div className="cab-pay-actions">
              {expired ? (
                <button type="button" className="cab-mini" onClick={onInsert} disabled={pending}>
                  {pending ? "BUILDING…" : "NEW INVOICE"}
                </button>
              ) : (
                <button type="button" className="cab-mini" onClick={onCopy}>
                  {copied ? "COPIED" : "COPY INVOICE"}
                </button>
              )}
              <button type="button" className="cab-mini cab-mini-ghost" onClick={onCancel}>
                BACK
              </button>
              {remainLabel ? <p className="cab-remain">{remainLabel}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
