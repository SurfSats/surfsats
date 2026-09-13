"use client";

import { useEffect, useRef, useState } from "react";
import { CALLSIGN_MAX } from "@/lib/callsign";
import { useGlass } from "@/lib/useGlass";
import { cn } from "@/lib/cn";

export function CallsignField({
  className,
  disabled = false,
  label = "CALLSIGN",
  placeholder = "HOPE",
}: {
  className?: string;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}) {
  const { glass, setCallsign, ready } = useGlass();
  const [draft, setDraft] = useState("");
  const focused = useRef(false);

  useEffect(() => {
    if (!ready || focused.current) return;
    setDraft(glass?.callsign ?? "");
  }, [glass?.callsign, ready]);

  return (
    <label className={cn(className)}>
      <span>{label}</span>
      <input
        value={draft}
        maxLength={CALLSIGN_MAX}
        onChange={(event) => {
          const next = event.target.value.toUpperCase();
          setDraft(next);
          setCallsign(next);
        }}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
        }}
        placeholder={placeholder}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled || !ready}
      />
    </label>
  );
}
