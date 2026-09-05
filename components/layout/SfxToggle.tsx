"use client";

import { useEffect, useState } from "react";
import { SFX_EVENT, isSfxMuted, setSfxMuted } from "@/lib/sfx";

export function SfxToggle() {
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMuted(isSfxMuted());
    setReady(true);
    function onChange(event: Event) {
      const detail = (event as CustomEvent<{ muted?: boolean }>).detail;
      if (typeof detail?.muted === "boolean") setMuted(detail.muted);
      else setMuted(isSfxMuted());
    }
    window.addEventListener(SFX_EVENT, onChange);
    return () => window.removeEventListener(SFX_EVENT, onChange);
  }, []);

  return (
    <button
      type="button"
      className="sfx-toggle"
      aria-pressed={muted}
      aria-label={muted ? "Unmute settlement sounds" : "Mute settlement sounds"}
      title={muted ? "sound off" : "sound on"}
      onClick={() => {
        const next = !muted;
        setSfxMuted(next);
        setMuted(next);
      }}
    >
      <span className="sr-only">{ready && muted ? "sfx off" : "sfx on"}</span>
      {muted ? (
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <path
            d="M4 10v4h3l5 4V6L7 10H4zM16 9l5 6M21 9l-5 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="square"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <path
            d="M4 10v4h3l5 4V6L7 10H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8 8 0 0 1 0 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="square"
          />
        </svg>
      )}
    </button>
  );
}
