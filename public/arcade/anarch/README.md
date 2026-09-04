# Anarch (vendored web build)

Anarch by drummyfish. CC0 / public domain.
Official Emscripten/web files, copied locally. Do not hotlink gitlab at runtime.

## Files this folder needs

- `anarch.html`
- `anarch.js`
- `anarch.wasm`

## Exact source URLs

- https://drummyfish.gitlab.io/anarch/bin/web/anarch.html
- https://drummyfish.gitlab.io/anarch/bin/web/anarch.js
- https://drummyfish.gitlab.io/anarch/bin/web/anarch.wasm

Repo tree: https://gitlab.com/drummyfish/anarch/-/tree/master/bin/web

If these files are missing, drop them in this folder with those names. The
`/arcade/anarch` shell will boot them after insert.

## Credits on this machine

Anarch shares the Wave Runner Lightning arcade pool. One insert (21 sats) still
grants 3 credits on the same `arcade_players` row. Playing Anarch spends 1
credit via `/api/arcade/play` with `game=anarch`. Anarch does not post scores
to WAVE RUNNER HIGH SCORES.
