import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ARCADE_CREDITS_PER_PAY,
  ARCADE_GAME_ID,
  ARCADE_MACHINE_WAVE,
  ARCADE_PRICE_SATS,
  RETRO_GAME_IDS,
  newPlayId,
  parseArcadeMachine,
  type ArcadeGrant,
  type ArcadeHighScore,
  type ArcadeMachine,
  type ArcadePending,
  type ArcadePlay,
  type ArcadePlayer,
  type ArcadeRecentPlay,
} from "@/lib/arcade";
import { arcadeLog, hashRef } from "@/lib/arcade-log";
import { isDatabaseConfigured, sql } from "@/lib/db";

type Store = {
  pending: Record<string, ArcadePending>;
  grants: Record<string, ArcadeGrant>;
  players: Record<string, ArcadePlayer>;
  plays: ArcadePlay[];
};

const emptyStore = (): Store => ({
  pending: {},
  grants: {},
  players: {},
  plays: [],
});

const memory = emptyStore();
let loaded = false;
let writeChain: Promise<void> = Promise.resolve();
let warnedEphemeral = false;
let schemaReady: Promise<void> | null = null;

export function arcadeStoreKind() {
  return isDatabaseConfigured() ? "neon" : "ephemeral";
}

function warnEphemeral() {
  if (warnedEphemeral) return;
  warnedEphemeral = true;
  arcadeLog("warn", "store.ephemeral", {
    detail: "DATABASE_URL missing; arcade credits are not shared across servers",
  });
}

async function ensureNeonSchema() {
  const db = sql();
  if (!schemaReady) {
    schemaReady = (async () => {
      await db`CREATE TABLE IF NOT EXISTS arcade_pending (
        payment_hash TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        alias TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        machine TEXT NOT NULL DEFAULT 'wave',
        game TEXT
      )`;
      await db`CREATE TABLE IF NOT EXISTS arcade_grants (
        payment_hash TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        alias TEXT NOT NULL,
        credits INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        machine TEXT NOT NULL DEFAULT 'wave',
        game TEXT
      )`;
      await db`CREATE TABLE IF NOT EXISTS arcade_players (
        player_id TEXT PRIMARY KEY,
        alias TEXT NOT NULL,
        credits INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await db`CREATE TABLE IF NOT EXISTS arcade_plays (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        alias TEXT NOT NULL,
        game TEXT NOT NULL,
        score INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await db`CREATE INDEX IF NOT EXISTS arcade_plays_created_at
        ON arcade_plays (created_at DESC)`;
      await db`CREATE INDEX IF NOT EXISTS arcade_plays_score
        ON arcade_plays (game, score DESC)`;
      await db`CREATE INDEX IF NOT EXISTS arcade_grants_created_at
        ON arcade_grants (created_at DESC)`;
      await db`ALTER TABLE arcade_pending ADD COLUMN IF NOT EXISTS machine TEXT NOT NULL DEFAULT 'wave'`;
      await db`ALTER TABLE arcade_pending ADD COLUMN IF NOT EXISTS game TEXT`;
      await db`ALTER TABLE arcade_grants ADD COLUMN IF NOT EXISTS machine TEXT NOT NULL DEFAULT 'wave'`;
      await db`ALTER TABLE arcade_grants ADD COLUMN IF NOT EXISTS game TEXT`;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString();
  }
  return "";
}

function int(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function storePaths() {
  return [
    path.join(process.cwd(), "data", "arcade.json"),
    path.join("/tmp", "surfsats-arcade.json"),
  ];
}

async function loadStore() {
  if (loaded) return memory;
  warnEphemeral();
  for (const file of storePaths()) {
    try {
      const raw = await readFile(file, "utf8");
      const parsed = JSON.parse(raw) as Partial<Store>;
      if (parsed.pending && typeof parsed.pending === "object") {
        Object.assign(memory.pending, parsed.pending);
      }
      if (parsed.grants && typeof parsed.grants === "object") {
        Object.assign(memory.grants, parsed.grants);
      }
      if (parsed.players && typeof parsed.players === "object") {
        Object.assign(memory.players, parsed.players);
      }
      if (Array.isArray(parsed.plays)) {
        memory.plays = parsed.plays;
      }
    } catch {
      // missing file
    }
  }
  loaded = true;
  return memory;
}

async function persist() {
  const payload = JSON.stringify(memory, null, 2);
  for (const file of storePaths()) {
    try {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, payload, "utf8");
    } catch {
      // Vercel project dirs are read-only; /tmp usually works
    }
  }
}

function withLock<T>(fn: () => Promise<T>) {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function saveArcadePending(pending: ArcadePending) {
  try {
    if (isDatabaseConfigured()) {
      await ensureNeonSchema();
      const db = sql();
      await db`
        INSERT INTO arcade_pending (payment_hash, player_id, alias, created_at, machine, game)
        VALUES (
          ${pending.paymentHash},
          ${pending.playerId},
          ${pending.alias},
          ${pending.createdAt},
          ${pending.machine ?? ARCADE_MACHINE_WAVE},
          ${pending.game ?? null}
        )
        ON CONFLICT (payment_hash) DO UPDATE SET
          player_id = EXCLUDED.player_id,
          alias = EXCLUDED.alias,
          created_at = EXCLUDED.created_at,
          machine = EXCLUDED.machine,
          game = EXCLUDED.game
      `;
      arcadeLog("info", "pending.saved", {
        hash: hashRef(pending.paymentHash),
        store: "neon",
      });
      return pending;
    }
    return withLock(async () => {
      await loadStore();
      memory.pending[pending.paymentHash] = pending;
      await persist();
      arcadeLog("info", "pending.saved", {
        hash: hashRef(pending.paymentHash),
        store: "ephemeral",
      });
      return pending;
    });
  } catch (error) {
    arcadeLog("error", "pending.save_failed", {
      hash: hashRef(pending.paymentHash),
      store: arcadeStoreKind(),
    });
    throw error;
  }
}

export async function getArcadePending(paymentHash: string) {
  if (isDatabaseConfigured()) {
    await ensureNeonSchema();
    const db = sql();
    const rows = await db`
      SELECT payment_hash, player_id, alias, created_at, machine, game
      FROM arcade_pending
      WHERE payment_hash = ${paymentHash}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      paymentHash: String(row.payment_hash ?? paymentHash),
      playerId: String(row.player_id ?? ""),
      alias: String(row.alias ?? ""),
      createdAt: iso(row.created_at) || new Date().toISOString(),
      machine: parseArcadeMachine(row.machine),
      game: row.game ? String(row.game) : undefined,
    } satisfies ArcadePending;
  }
  await loadStore();
  return memory.pending[paymentHash] ?? null;
}

export async function findArcadeGrant(paymentHash: string) {
  if (isDatabaseConfigured()) {
    await ensureNeonSchema();
    const db = sql();
    const rows = await db`
      SELECT payment_hash, player_id, alias, credits, created_at, machine, game
      FROM arcade_grants
      WHERE payment_hash = ${paymentHash}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      paymentHash: String(row.payment_hash ?? paymentHash),
      playerId: String(row.player_id ?? ""),
      alias: String(row.alias ?? ""),
      credits: int(row.credits),
      createdAt: iso(row.created_at) || new Date().toISOString(),
      machine: parseArcadeMachine(row.machine),
      game: row.game ? String(row.game) : undefined,
    } satisfies ArcadeGrant;
  }
  await loadStore();
  return memory.grants[paymentHash] ?? null;
}

export async function grantArcadeCredits(input: {
  paymentHash: string;
  playerId: string;
  alias: string;
  machine?: ArcadeMachine;
  game?: string;
}) {
  const existing = await findArcadeGrant(input.paymentHash);
  if (existing) {
    const player = await getArcadePlayer(existing.playerId);
    arcadeLog("info", "grant.already", {
      hash: hashRef(input.paymentHash),
      store: arcadeStoreKind(),
    });
    return {
      grant: existing,
      player: player ?? {
        playerId: existing.playerId,
        alias: existing.alias,
        credits: existing.credits,
      },
      already: true as const,
    };
  }

  const createdAt = new Date().toISOString();
  const grant: ArcadeGrant = {
    paymentHash: input.paymentHash,
    playerId: input.playerId,
    alias: input.alias,
    credits: ARCADE_CREDITS_PER_PAY,
    createdAt,
    machine: input.machine ?? ARCADE_MACHINE_WAVE,
    game: input.game,
  };

  try {
    if (isDatabaseConfigured()) {
      await ensureNeonSchema();
      const db = sql();
      await db`
        INSERT INTO arcade_grants (payment_hash, player_id, alias, credits, created_at, machine, game)
        VALUES (
          ${grant.paymentHash},
          ${grant.playerId},
          ${grant.alias},
          ${grant.credits},
          ${grant.createdAt},
          ${grant.machine ?? ARCADE_MACHINE_WAVE},
          ${grant.game ?? null}
        )
        ON CONFLICT (payment_hash) DO NOTHING
      `;
      await db`
        INSERT INTO arcade_players (player_id, alias, credits, updated_at)
        VALUES (
          ${grant.playerId},
          ${grant.alias},
          ${grant.credits},
          ${grant.createdAt}
        )
        ON CONFLICT (player_id) DO UPDATE SET
          alias = EXCLUDED.alias,
          credits = arcade_players.credits + EXCLUDED.credits,
          updated_at = EXCLUDED.updated_at
      `;
      await db`DELETE FROM arcade_pending WHERE payment_hash = ${grant.paymentHash}`;
      const player = await getArcadePlayer(grant.playerId);
      arcadeLog("info", "grant.saved", {
        hash: hashRef(grant.paymentHash),
        credits: player?.credits ?? grant.credits,
        shoutout: true,
        store: "neon",
      });
      return {
        grant,
        player: player ?? {
          playerId: grant.playerId,
          alias: grant.alias,
          credits: grant.credits,
        },
        already: false as const,
      };
    }

    return withLock(async () => {
      await loadStore();
      if (memory.grants[input.paymentHash]) {
        const prior = memory.grants[input.paymentHash];
        return {
          grant: prior,
          player: memory.players[prior.playerId],
          already: true as const,
        };
      }
      memory.grants[input.paymentHash] = grant;
      const current = memory.players[input.playerId];
      memory.players[input.playerId] = {
        playerId: input.playerId,
        alias: input.alias,
        credits: (current?.credits ?? 0) + ARCADE_CREDITS_PER_PAY,
      };
      delete memory.pending[input.paymentHash];
      await persist();
      arcadeLog("info", "grant.saved", {
        hash: hashRef(grant.paymentHash),
        credits: memory.players[input.playerId].credits,
        shoutout: true,
        store: "ephemeral",
      });
      return {
        grant,
        player: memory.players[input.playerId],
        already: false as const,
      };
    });
  } catch (error) {
    arcadeLog("error", "grant.save_failed", {
      hash: hashRef(input.paymentHash),
      store: arcadeStoreKind(),
    });
    throw error;
  }
}

export async function getArcadePlayer(playerId: string) {
  if (isDatabaseConfigured()) {
    await ensureNeonSchema();
    const db = sql();
    const rows = await db`
      SELECT player_id, alias, credits
      FROM arcade_players
      WHERE player_id = ${playerId}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      playerId: String(row.player_id ?? playerId),
      alias: String(row.alias ?? ""),
      credits: Math.max(0, int(row.credits)),
    } satisfies ArcadePlayer;
  }
  await loadStore();
  return memory.players[playerId] ?? null;
}

export async function spendArcadeCredit(
  playerId: string,
  game = ARCADE_GAME_ID,
) {
  try {
    if (isDatabaseConfigured()) {
      await ensureNeonSchema();
      const db = sql();
      const rows = await db`
        UPDATE arcade_players
        SET credits = credits - 1, updated_at = NOW()
        WHERE player_id = ${playerId} AND credits > 0
        RETURNING player_id, alias, credits
      `;
      const row = rows[0];
      if (!row) return { ok: false as const, reason: "insert sats for credits" };
      const player: ArcadePlayer = {
        playerId: String(row.player_id ?? playerId),
        alias: String(row.alias ?? ""),
        credits: Math.max(0, int(row.credits)),
      };
      const play: ArcadePlay = {
        id: newPlayId(),
        playerId: player.playerId,
        alias: player.alias,
        game,
        score: null,
        createdAt: new Date().toISOString(),
      };
      await db`
        INSERT INTO arcade_plays (id, player_id, alias, game, score, created_at)
        VALUES (
          ${play.id},
          ${play.playerId},
          ${play.alias},
          ${play.game},
          ${play.score},
          ${play.createdAt}
        )
      `;
      arcadeLog("info", "play.saved", {
        playId: play.id,
        credits: player.credits,
        store: "neon",
      });
      return { ok: true as const, player, play };
    }

    return withLock(async () => {
      await loadStore();
      const current = memory.players[playerId];
      if (!current || current.credits < 1) {
        return { ok: false as const, reason: "insert sats for credits" };
      }
      current.credits -= 1;
      const play: ArcadePlay = {
        id: newPlayId(),
        playerId,
        alias: current.alias,
        game,
        score: null,
        createdAt: new Date().toISOString(),
      };
      memory.plays.unshift(play);
      memory.plays = memory.plays.slice(0, 200);
      await persist();
      arcadeLog("info", "play.saved", {
        playId: play.id,
        credits: current.credits,
        store: "ephemeral",
      });
      return { ok: true as const, player: current, play };
    });
  } catch (error) {
    arcadeLog("error", "play.save_failed", {
      store: arcadeStoreKind(),
    });
    throw error;
  }
}

export async function submitArcadeScore(input: {
  playerId: string;
  playId?: string;
  score: number;
  game?: string;
}) {
  const score = Math.max(0, Math.min(99_999_999, Math.floor(input.score)));
  const game = input.game || ARCADE_GAME_ID;
  try {
    if (isDatabaseConfigured()) {
      await ensureNeonSchema();
      const db = sql();
      const player = await getArcadePlayer(input.playerId);
      if (!player) return { ok: false as const, reason: "unknown player" };
      if (input.playId) {
        await db`
          UPDATE arcade_plays
          SET score = ${score}
          WHERE id = ${input.playId} AND player_id = ${input.playerId}
        `;
      } else {
        const play: ArcadePlay = {
          id: newPlayId(),
          playerId: player.playerId,
          alias: player.alias,
          game,
          score,
          createdAt: new Date().toISOString(),
        };
        await db`
          INSERT INTO arcade_plays (id, player_id, alias, game, score, created_at)
          VALUES (
            ${play.id},
            ${play.playerId},
            ${play.alias},
            ${play.game},
            ${play.score},
            ${play.createdAt}
          )
        `;
      }
      arcadeLog("info", "score.saved", {
        score,
        game,
        store: "neon",
      });
      return { ok: true as const };
    }

    return withLock(async () => {
      await loadStore();
      const player = memory.players[input.playerId];
      if (!player) return { ok: false as const, reason: "unknown player" };
      if (input.playId) {
        const play = memory.plays.find(
          (item) => item.id === input.playId && item.playerId === input.playerId,
        );
        if (play) {
          play.score = score;
        }
      } else {
        memory.plays.unshift({
          id: newPlayId(),
          playerId: player.playerId,
          alias: player.alias,
          game,
          score,
          createdAt: new Date().toISOString(),
        });
        memory.plays = memory.plays.slice(0, 200);
      }
      await persist();
      arcadeLog("info", "score.saved", {
        score,
        game,
        store: "ephemeral",
      });
      return { ok: true as const };
    });
  } catch (error) {
    arcadeLog("error", "score.save_failed", {
      store: arcadeStoreKind(),
    });
    throw error;
  }
}

function mapHighScoreRows(
  rows: Array<{ alias?: unknown; score?: unknown; created_at?: unknown; game?: unknown }>,
): ArcadeHighScore[] {
  const mapped: ArcadeHighScore[] = [];
  rows.forEach((row, index) => {
    const score = int(row.score);
    const alias = String(row.alias ?? "").trim();
    if (!alias) return;
    const item: ArcadeHighScore = {
      rank: index + 1,
      alias,
      score,
      createdAt: iso(row.created_at),
    };
    if (row.game) item.game = String(row.game);
    mapped.push(item);
  });
  return mapped.map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function getArcadeHighScores(game = ARCADE_GAME_ID) {
  if (isDatabaseConfigured()) {
    await ensureNeonSchema();
    const db = sql();
    const rows = await db`
      SELECT alias, score, created_at, game
      FROM arcade_plays
      WHERE game = ${game} AND score IS NOT NULL
      ORDER BY score DESC, created_at ASC
      LIMIT 10
    `;
    return mapHighScoreRows(rows);
  }
  await loadStore();
  return memory.plays
    .filter((play) => play.game === game && play.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.createdAt.localeCompare(b.createdAt))
    .slice(0, 10)
    .map((play, index) => ({
      rank: index + 1,
      alias: play.alias,
      score: play.score ?? 0,
      createdAt: play.createdAt,
      game: play.game,
    }));
}

export async function getRetroHighScores() {
  const games = new Set<string>(RETRO_GAME_IDS);
  if (isDatabaseConfigured()) {
    await ensureNeonSchema();
    const db = sql();
    const rows = await db`
      SELECT alias, score, created_at, game
      FROM arcade_plays
      WHERE game IN ('pong', 'tetris', 'snake', 'breakout', 'invaders')
        AND score IS NOT NULL
      ORDER BY score DESC, created_at ASC
      LIMIT 10
    `;
    return mapHighScoreRows(rows);
  }
  await loadStore();
  return memory.plays
    .filter((play) => games.has(play.game) && play.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.createdAt.localeCompare(b.createdAt))
    .slice(0, 10)
    .map((play, index) => ({
      rank: index + 1,
      alias: play.alias,
      score: play.score ?? 0,
      createdAt: play.createdAt,
      game: play.game,
    }));
}

export async function getArcadeRecentPlays(machine: ArcadeMachine = ARCADE_MACHINE_WAVE) {
  if (isDatabaseConfigured()) {
    await ensureNeonSchema();
    const db = sql();
    const rows = await db`
      SELECT alias, created_at, machine, game
      FROM arcade_grants
      WHERE COALESCE(machine, ${ARCADE_MACHINE_WAVE}) = ${machine}
      ORDER BY created_at DESC
      LIMIT 10
    `;
    return rows.map((row) => ({
      alias: String(row.alias ?? ""),
      game: String(row.game || (machine === ARCADE_MACHINE_WAVE ? ARCADE_GAME_ID : "retro")),
      sats: ARCADE_PRICE_SATS,
      createdAt: iso(row.created_at),
    })) satisfies ArcadeRecentPlay[];
  }
  await loadStore();
  return Object.values(memory.grants)
    .filter((grant) => (grant.machine ?? ARCADE_MACHINE_WAVE) === machine)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .map((grant) => ({
      alias: grant.alias,
      game:
        grant.game ||
        (machine === ARCADE_MACHINE_WAVE ? ARCADE_GAME_ID : "retro"),
      sats: ARCADE_PRICE_SATS,
      createdAt: grant.createdAt,
    }));
}
