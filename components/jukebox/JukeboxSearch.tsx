"use client";

import { useState, type FormEvent } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  JUKEBOX_LIVE_URL,
  JUKEBOX_PRICE_SATS,
  JUKEBOX_SEARCH_QUERY_MAX,
  WAVLAKE_REQUEST_SATS,
  type JukeboxSearchHit,
} from "@/lib/jukebox";

export function JukeboxSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<JukeboxSearchHit[] | null>(null);
  const [pending, setPending] = useState(false);
  const [offline, setOffline] = useState(false);

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOffline(false);
      return;
    }
    setPending(true);
    setOffline(false);
    try {
      const response = await fetch(
        `/api/jukebox/search?q=${encodeURIComponent(q)}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        results?: JukeboxSearchHit[];
        error?: string;
      };
      if (!response.ok) {
        setOffline(true);
        setResults([]);
        return;
      }
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setOffline(true);
      setResults([]);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
            {"//"} ship_library
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight">
            Search the ship
          </h2>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          {JUKEBOX_PRICE_SATS} library · {WAVLAKE_REQUEST_SATS} wavlake
        </p>
      </div>

      <form
        className="panel mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch"
        onSubmit={(event) => void runSearch(event)}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search tracks</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={JUKEBOX_SEARCH_QUERY_MAX}
            placeholder="title or artist"
            autoComplete="off"
            spellCheck={false}
            className="w-full border border-cyan/25 bg-background px-3 py-3 font-mono text-sm text-foreground outline-none placeholder:text-muted focus:border-sats"
          />
        </label>
        <button
          type="submit"
          className="btn px-6 py-3 sm:w-auto"
          disabled={pending}
        >
          {pending ? "SEARCHING…" : "SEARCH"}
        </button>
      </form>

      {offline ? (
        <p className="panel mt-4 px-4 py-6 text-sm text-muted">
          Search offline — open{" "}
          <a
            href={JUKEBOX_LIVE_URL}
            target="_blank"
            rel="noreferrer"
            className="text-sats glitch-hover hover:text-cyan"
          >
            noderunnersradio.com
          </a>
        </p>
      ) : null}

      {results && !offline && results.length === 0 ? (
        <p className="panel mt-4 px-4 py-6 text-sm text-muted">
          No tracks. Try a shorter title.
        </p>
      ) : null}

      {results && results.length > 0 ? (
        <ol className="panel mt-4 divide-y divide-cyan/15 overflow-hidden">
          {results.map((hit, index) => (
            <li
              key={`${hit.source}-${hit.guid ?? hit.title}-${index}`}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{hit.title}</p>
                <p className="truncate font-mono text-xs text-muted">
                  {hit.artist}
                  {hit.album ? ` — ${hit.album}` : ""}
                </p>
                <p
                  className={
                    hit.source === "wavlake"
                      ? "mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-cyan"
                      : "mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-sats"
                  }
                >
                  {hit.source === "wavlake"
                    ? `WAVLAKE V4V · ${hit.sats} SATS`
                    : `SHIP LIBRARY · ${hit.sats} SATS`}
                </p>
              </div>
              <ButtonLink
                href={JUKEBOX_LIVE_URL}
                external
                className="w-full shrink-0 px-4 py-3 text-xs sm:w-auto"
              >
                REQUEST ON THE SHIP
              </ButtonLink>
            </li>
          ))}
        </ol>
      ) : null}

      {results && results.length > 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Open their Jukebox tab, search the same title, zap the QR. We don&apos;t
          invoice this.
        </p>
      ) : null}
    </section>
  );
}
