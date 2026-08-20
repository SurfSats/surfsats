"use client";

import Image from "next/image";
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
      <div className="cab-machine">
        <Image
          src="/arcade-cabinet-cutout.png"
          alt="SurfSats arcade cabinet"
          width={1152}
          height={1712}
          priority
          className="cab-art"
          sizes="(max-width: 900px) 94vw, 50rem"
        />

        <div className="cab-crt-slot">
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
            photoCrt
          />
        </div>

        <button
          type="button"
          className="cab-hit cab-hit-stick"
          onClick={stickAction}
          aria-label={mode === "playing" ? "Hop" : "Play"}
        />
        <button
          type="button"
          className="cab-hit cab-hit-start"
          onClick={stickAction}
          aria-label={mode === "playing" ? "Hop" : "Start"}
        />

        <div className="cab-smoke" aria-hidden="true">
          <span className="cab-joint-smoke" />
          <span className="cab-joint-smoke cab-joint-smoke-b" />
          <span className="cab-joint-smoke cab-joint-smoke-c" />
        </div>

        <div className="cab-coin" id="arcade-coin">
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
          <div className="cab-led">
            <p>CREDITS</p>
            <p className="cab-led-num">{formatCredits(credits)}</p>
          </div>
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

        <p className="cab-coin-note">LIGHTNING · NO FIAT · NO KYC</p>

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
            {invoiceError ? <p className="cab-error">{invoiceError}</p> : null}
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
      </div>
    </div>
  );
}
