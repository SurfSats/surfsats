"use client";

import { useState } from "react";
import {
  ARCADE_ALIAS_MAX,
  ARCADE_PRICE_SATS,
  sanitizeAlias,
} from "@/lib/arcade";

export function AnarchShell() {
  const [alias, setAlias] = useState("");
  const aliasOk = sanitizeAlias(alias).ok;

  return (
    <div className="anarch-shell">
      <div className="anarch-stage">
        <p className="anarch-kicker">ANARCH</p>
        <p className="anarch-copy">CC0 · drummyfish · insert lands next pass</p>
      </div>
      <div className="anarch-till">
        <label className="cab-alias">
          <span>CALLSIGN · REQUIRED</span>
          <input
            value={alias}
            maxLength={ARCADE_ALIAS_MAX}
            onChange={(event) => setAlias(event.target.value)}
            placeholder="YOUR ALIAS"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button
          type="button"
          className="cab-insert cab-insert-primary"
          disabled
        >
          INSERT {ARCADE_PRICE_SATS} SATS
          <span>{aliasOk ? "NEXT PASS" : "CALLSIGN FIRST"}</span>
        </button>
      </div>
    </div>
  );
}
