"use client";

import { FormEvent, useState } from "react";
import { JUKEBOX_PRICE_SATS } from "@/lib/jukebox";

export function AddSongCard() {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="border border-sats/50 bg-sats/8 p-5 shadow-[4px_4px_0_var(--color-magenta)] sm:p-7">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sats">
        {"//"} request_track
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight">
        Pay {JUKEBOX_PRICE_SATS} sats to add a song
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Lightning invoices will plug in here. For now this is a preview of the
        request flow — no payment is sent.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.16em] text-cyan">
            &gt; song_title
          </span>
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Better Days"
            className="input-terminal"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.16em] text-cyan">
            &gt; artist
          </span>
          <input
            required
            value={artist}
            onChange={(event) => setArtist(event.target.value)}
            placeholder="Stick Figure"
            className="input-terminal"
          />
        </label>
        <button type="submit" className="btn w-full">
          [ pay_{JUKEBOX_PRICE_SATS}_sats ]
        </button>
      </form>

      {submitted ? (
        <p className="mt-4 border border-cyan/40 bg-cyan/8 px-4 py-3 font-mono text-xs text-cyan">
          request queued locally. lightning payments will be added later — this
          is the hook where an invoice will appear.
        </p>
      ) : null}
    </section>
  );
}
