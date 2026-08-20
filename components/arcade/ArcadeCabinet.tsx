"use client";

import {
  ARCADE_ALIAS_MAX,
  ARCADE_PRICE_SATS,
  formatCredits,
} from "@/lib/arcade";
import type { RefObject } from "react";
import {
  ArcadeScreen,
  type ArcadeScreenMode,
} from "@/components/arcade/ArcadeScreen";
import type { WaveRunnerHandle } from "@/components/arcade/WaveRunner";

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
  lastScore,
  gameRef,
  onAlias,
  onInsert,
  onPlay,
  onHop,
  onWipeout,
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
  lastScore: number | null;
  gameRef: RefObject<WaveRunnerHandle | null>;
  onAlias: (value: string) => void;
  onInsert: () => void;
  onPlay: () => void;
  onHop: () => void;
  onWipeout: (score: number) => void;
  onCopy: () => void;
  onCancel: () => void;
}) {
  const stickAction = mode === "playing" ? onHop : onPlay;
  const paying = mode === "invoice";
  const liveInvoice =
    Boolean(paymentRequest) && paymentRequest.toLowerCase().startsWith("ln");

  return (
    <div className="cab-wrap">
      <div className="cab-pint" aria-hidden="true">
        <div className="cab-pint-glass">
          <span className="cab-pint-beer" />
          <span className="cab-pint-foam" />
          <span className="cab-pint-shine" />
          <span className="cab-pint-drip" />
        </div>
      </div>

      <div className="cab">
        <div className="cab-front">
          <div className="cab-wear" aria-hidden="true" />

          <div className="cab-marquee">
            <p className="cab-marquee-brand">SURFSATS</p>
            <p className="cab-marquee-sub">ARCADE</p>
          </div>

          <div className="cab-bezel">
            <span className="cab-bezel-grime" aria-hidden="true" />
            <ArcadeScreen
              mode={mode}
              credits={credits}
              waiting={waiting}
              invoiceError={invoiceError}
              expired={expired}
              lastScore={lastScore}
              gameRef={gameRef}
              onPlay={onPlay}
              onWipeout={onWipeout}
            />
          </div>

          <div className="cab-deck">
            <div className="cab-controls">
              <button
                type="button"
                className="cab-btn cab-btn-red"
                onClick={stickAction}
                aria-label={mode === "playing" ? "Hop" : "Start"}
              />
              <button
                type="button"
                className="cab-stick"
                onClick={stickAction}
                aria-label={mode === "playing" ? "Hop" : "Play"}
              >
                <span className="cab-stick-shaft" />
                <span className="cab-stick-ball" />
              </button>
              <button
                type="button"
                className="cab-btn cab-btn-gold"
                tabIndex={-1}
                aria-hidden="true"
              />
              <button
                type="button"
                className="cab-btn cab-btn-cyan"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>

            <div className="cab-ash" aria-hidden="true">
              <div className="cab-ash-tray">
                <span className="cab-ash-butt" />
                <span className="cab-ash-dust" />
              </div>
              <div className="cab-joint">
                <span className="cab-joint-paper" />
                <span className="cab-joint-filter" />
                <span className="cab-joint-ember" />
                <span className="cab-joint-smoke" />
                <span className="cab-joint-smoke cab-joint-smoke-b" />
                <span className="cab-joint-smoke cab-joint-smoke-c" />
              </div>
            </div>
          </div>

          <div className="cab-belly">
            <div className="cab-coin" id="arcade-coin">
              <span className="cab-coin-grime" aria-hidden="true" />
              <div className="cab-coin-top">
                <button
                  type="button"
                  className="cab-insert"
                  disabled={pending || paying || mode === "playing"}
                  onClick={onInsert}
                >
                  INSERT
                  <span>{ARCADE_PRICE_SATS} SATS</span>
                </button>
                <div className="cab-coin-btc" aria-hidden="true">
                  ₿
                </div>
              </div>

              <div className="cab-led">
                <p>CREDITS</p>
                <p className="cab-led-num">{formatCredits(credits)}</p>
              </div>

              <label className="cab-alias">
                <span>CALLSIGN</span>
                <input
                  value={alias}
                  maxLength={ARCADE_ALIAS_MAX}
                  onChange={(event) => onAlias(event.target.value)}
                  placeholder="YOUR ALIAS"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={paying}
                />
              </label>

              <div className="cab-sticker-row">
                <p className="cab-badge">LIGHTNING ENABLED</p>
                <p className="cab-badge cab-badge-sats">₿ SATS ACCEPTED HERE</p>
                <p className="cab-badge cab-badge-warn">NO FIAT · NO FICTION</p>
              </div>

              {error ? <p className="cab-error">{error}</p> : null}

              {paying && liveInvoice ? (
                <div className="cab-invoice">
                  {qrSrc ? (
                    // data: URL from the live BOLT11 — next/image cannot optimize it
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrSrc}
                      alt="Lightning invoice QR"
                      className="cab-invoice-qr"
                    />
                  ) : (
                    <div className="cab-invoice-qr cab-invoice-qr-wait">
                      building qr
                    </div>
                  )}
                  <p className="cab-invoice-kicker">
                    {expired
                      ? "invoice expired"
                      : waiting
                        ? `waiting for ${ARCADE_PRICE_SATS} sats`
                        : "scan or copy the bolt11"}
                  </p>
                  <p className="cab-invoice-bolt">{paymentRequest}</p>
                  {invoiceError ? (
                    <p className="cab-error">{invoiceError}</p>
                  ) : null}
                  {remainLabel ? <p className="cab-remain">{remainLabel}</p> : null}
                  <div className="cab-pay-actions">
                    {expired ? (
                      <button
                        type="button"
                        className="cab-mini"
                        onClick={onInsert}
                        disabled={pending}
                      >
                        {pending ? "BUILDING…" : "NEW INVOICE"}
                      </button>
                    ) : (
                      <>
                        <button type="button" className="cab-mini" onClick={onCopy}>
                          {copied ? "COPIED" : "COPY INVOICE"}
                        </button>
                        <a
                          className="cab-mini cab-mini-link"
                          href={`lightning:${paymentRequest}`}
                        >
                          OPEN WALLET
                        </a>
                      </>
                    )}
                    <button
                      type="button"
                      className="cab-mini cab-mini-ghost"
                      onClick={onCancel}
                    >
                      BACK
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <p className="cab-decal cab-decal-wipe" aria-hidden="true">
              WIPE OUT
            </p>
            <p className="cab-decal cab-decal-btc" aria-hidden="true">
              ₿
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
