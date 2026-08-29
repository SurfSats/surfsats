import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDatabaseConfigured, sql } from "@/lib/db";
import {
  TAB_CREDITS_PER_PAY,
  TAB_ENDING_GAMES,
  TAB_GAME_ID,
  TAB_PRICE_SATS,
  newTabPlayId,
  type TabGrant,
  type TabHighScore,
  type TabPending,
  type TabPlay,
  type TabPlayer,
  type TabRecent,
} from "@/lib/tab";
import { hashRef, tabLog } from "@/lib/tab-log";

type Store = {
  pending: Record<string, TabPending>;
  grants: Record<string, TabGrant>;
  players: Record<string, TabPlayer>;
  plays: TabPlay[];
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

export function tabStoreKind() {
  return isDatabaseConfigured() ? "neon" : "ephemeral";
}

function warnEphemeral() {
  if (warnedEphemeral) return;
  warnedEphemeral = true;
  tabLog("warn", "store.ephemeral", {
    detail: "DATABASE_URL missing; tab credits are not shared across servers",
  });
}

async function ensureNeonSchema() {
  const db = sql();
  if (!schemaReady) {
    schemaReady = (async () => {
      await db`CREATE TABLE IF NOT EXISTS tab_pending (
        payment_hash TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        alias TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await db`CREATE TABLE IF NOT EXISTS tab_grants (
        payment_hash TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        alias TEXT NOT NULL,
        credits INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await db`CREATE TABLE IF NOT EXISTS tab_players (
        player_id TEXT PRIMARY KEY,
        alias TEXT NOT NULL,
        credits INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await db`CREATE TABLE IF NOT EXISTS tab_plays (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        alias TEXT NOT NULL,
        game TEXT NOT NULL,
        score INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await db`CREATE INDEX IF NOT EXISTS tab_plays_created_at
        ON tab_plays (created_at DESC)`;
      await db`CREATE INDEX IF NOT EXISTS tab_plays_score
        ON tab_plays (game, score DESC)`;
      await db`CREATE INDEX IF NOT EXISTS tab_grants_created_at
        ON tab_grants (created_at DESC)`;
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
    path.join(process.cwd(), "data", "tab.json"),
    path.join("/tmp", "surfsats-tab.json"),
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
      if (Array.isArray(parsed.plays)) memory.plays = parsed.plays;
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
      // /tmp usually works
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

export async function saveTabPending(pending: TabPending) {
  try {
    if (isDatabaseConfigured()) {
      await ensureNeonSchema();
      const db = sql();
      await db`
        INSERT INTO tab_pending (payment_hash, player_id, alias, created_at)
        VALUES (
          ${pending.paymentHash},
          ${pending.playerId},
          ${pending.alias},
          ${pending.createdAt}
        )
        ON CONFLICT (payment_hash) DO UPDATE SET
          player_id = EXCLUDED.player_id,
          alias = EXCLUDED.alias,
          created_at = EXCLUDED.created_at
      `;
      tabLog("info", "pending.saved", {
        hash: hashRef(pending.paymentHash),
        store: "neon",
      });
      return pending;
    }
    return withLock(async () => {
      await loadStore();
      memory.pending[pending.paymentHash] = pending;
      await persist();
      tabLog("info", "pending.saved", {
        hash: hashRef(pending.paymentHash),
        store: "ephemeral",
      });
      return pending;
    });
  } catch (error) {
    tabLog("error", "pending.save_failed", {
      hash: hashRef(pending.paymentHash),
      store: tabStoreKind(),
    });
    throw error;
  }
}

export async function getTabPending(paymentHash: string) {
  if (isDatabaseConfigured()) {
    await ensureNeonSchema();
    const db = sql();
    const rows = await db`
      SELECT payment_hash, player_id, alias, created_at
      FROM tab_pending
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
    } satisfies TabPending;
  }
  await loadStore();
  return memory.pending[paymentHash] ?? null;
}

export async function findTabGrant(paymentHash: string) {
  if (isDatabaseConfigured()) {
    await ensureNeonSchema();
    const db = sql();
    const rows = await db`
      SELECT payment_hash, player_id, alias, credits, created_at
      FROM tab_grants
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
    } satisfies TabGrant;
  }
  await loadStore();
  return memory.grants[paymentHash] ?? null;
}

export async function grantTabCredits(input: {
  paymentHash: string;
  playerId: string;
  alias: string;
}) {
  const existing = await findTabGrant(input.paymentHash);
  if (existing) {
    const player = await getTabPlayer(existing.playerId);
    tabLog("info", "grant.already", {
      hash: hashRef(input.paymentHash),
      store: tabStoreKind(),
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
  const grant: TabGrant = {
    paymentHash: input.paymentHash,
    playerId: input.playerId,
    alias: input.alias,
    credits: TAB_CREDITS_PER_PAY,
    createdAt,
  };

  try {
    if (isDatabaseConfigured()) {
      await ensureNeonSchema();
      const db = sql();
      await db`
        INSERT INTO tab_grants (payment_hash, player_id, alias, credits, created_at)
        VALUES (
          ${grant.paymentHash},
          ${grant.playerId},
          ${grant.alias},
          ${grant.credits},
          ${grant.createdAt}
        )
        ON CONFLICT (payment_hash) DO NOTHING
      `;
      await db`
        INSERT INTO tab_players (player_id, alias, credits, updated_at)
        VALUES (
          ${grant.playerId},
          ${grant.alias},
          ${grant.credits},
          ${grant.createdAt}
        )
        ON CONFLICT (player_id) DO UPDATE SET
          alias = EXCLUDED.alias,
          credits = tab_players.credits + EXCLUDED.credits,
          updated_at = EXCLUDED.updated_at
      `;
      await db`DELETE FROM tab_pending WHERE payment_hash = ${grant.paymentHash}`;
      const player = await getTabPlayer(grant.playerId);
      tabLog("info", "grant.saved", {
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
        credits: (current?.credits ?? 0) + TAB_CREDITS_PER_PAY,
      };
      delete memory.pending[input.paymentHash];
      await persist();
      tabLog("info", "grant.saved", {
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
    tabLog("error", "grant.save_failed", {
      hash: hashRef(input.paymentHash),
      store: tabStoreKind(),
    });
    throw error;
  }
}

export async function getTabPlayer(playerId: string) {
  if (isDatabaseConfigured()) {
    await ensureNeonSchema();
    const db = sql();
    const rows = await db`
      SELECT player_id, alias, credits
      FROM tab_players
      WHERE player_id = ${playerId}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      playerId: String(row.player_id ?? playerId),
      alias: String(row.alias ?? ""),
      credits: Math.max(0, int(row.credits)),
    } satisfies TabPlayer;
  }
  await loadStore();
  return memory.players[playerId] ?? null;
}

export async function spendTabCredit(playerId: string) {
  try {
    if (isDatabaseConfigured()) {
      await ensureNeonSchema();
      const db = sql();
      const rows = await db`
        UPDATE tab_players
        SET credits = credits - 1, updated_at = NOW()
        WHERE player_id = ${playerId} AND credits > 0
        RETURNING player_id, alias, credits
      `;
      const row = rows[0];
      if (!row) return { ok: false as const, reason: "insert sats for credits" };
      const player: TabPlayer = {
        playerId: String(row.player_id ?? playerId),
        alias: String(row.alias ?? ""),
        credits: Math.max(0, int(row.credits)),
      };
      const play: TabPlay = {
        id: newTabPlayId(),
        playerId: player.playerId,
        alias: player.alias,
        game: TAB_GAME_ID,
        score: null,
        createdAt: new Date().toISOString(),
      };
      await db`
        INSERT INTO tab_plays (id, player_id, alias, game, score, created_at)
        VALUES (
          ${play.id},
          ${play.playerId},
          ${play.alias},
          ${play.game},
          ${play.score},
          ${play.createdAt}
        )
      `;
      tabLog("info", "play.saved", {
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
      const play: TabPlay = {
        id: newTabPlayId(),
        playerId,
        alias: current.alias,
        game: TAB_GAME_ID,
        score: null,
        createdAt: new Date().toISOString(),
      };
      memory.plays.unshift(play);
      memory.plays = memory.plays.slice(0, 200);
      await persist();
      tabLog("info", "play.saved", {
        playId: play.id,
        credits: current.credits,
        store: "ephemeral",
      });
      return { ok: true as const, player: current, play };
    });
  } catch (error) {
    tabLog("error", "play.save_failed", { store: tabStoreKind() });
    throw error;
  }
}

export async function submitTabScore(input: {
  playerId: string;
  playId?: string;
  score: number;
  game: string;
}) {
  const score = Math.max(0, Math.min(99, Math.floor(input.score)));
  const game = input.game;
  try {
    if (isDatabaseConfigured()) {
      await ensureNeonSchema();
      const db = sql();
      const player = await getTabPlayer(input.playerId);
      if (!player) return { ok: false as const, reason: "unknown player" };
      if (input.playId) {
        await db`
          UPDATE tab_plays
          SET score = ${score}, game = ${game}
          WHERE id = ${input.playId} AND player_id = ${input.playerId}
        `;
      } else {
        const play: TabPlay = {
          id: newTabPlayId(),
          playerId: player.playerId,
          alias: player.alias,
          game,
          score,
          createdAt: new Date().toISOString(),
        };
        await db`
          INSERT INTO tab_plays (id, player_id, alias, game, score, created_at)
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
      tabLog("info", "score.saved", { score, game, store: "neon" });
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
          play.game = game;
        }
      } else {
        memory.plays.unshift({
          id: newTabPlayId(),
          playerId: player.playerId,
          alias: player.alias,
          game,
          score,
          createdAt: new Date().toISOString(),
        });
        memory.plays = memory.plays.slice(0, 200);
      }
      await persist();
      tabLog("info", "score.saved", { score, game, store: "ephemeral" });
      return { ok: true as const };
    });
  } catch (error) {
    tabLog("error", "score.save_failed", { store: tabStoreKind() });
    throw error;
  }
}

export async function getTabHighScores(): Promise<TabHighScore[]> {
  const games = new Set<string>(TAB_ENDING_GAMES);
  if (isDatabaseConfigured()) {
    await ensureNeonSchema();
    const db = sql();
    const rows = await db`
      SELECT alias, score, created_at, game
      FROM tab_plays
      WHERE game IN ('tab-settled', 'tab-thrown', 'tab-converted')
        AND score IS NOT NULL
      ORDER BY score DESC, created_at ASC
      LIMIT 10
    `;
    return rows.flatMap((row, index) => {
      const alias = String(row.alias ?? "").trim();
      if (!alias) return [];
      return [
        {
          rank: index + 1,
          alias,
          score: int(row.score),
          createdAt: iso(row.created_at),
          game: row.game ? String(row.game) : undefined,
        },
      ];
    });
  }
  await loadStore();
  return memory.plays
    .filter((play) => games.has(play.game) && play.score != null)
    .sort(
      (a, b) =>
        (b.score ?? 0) - (a.score ?? 0) || a.createdAt.localeCompare(b.createdAt),
    )
    .slice(0, 10)
    .map((play, index) => ({
      rank: index + 1,
      alias: play.alias,
      score: play.score ?? 0,
      createdAt: play.createdAt,
      game: play.game,
    }));
}

export async function getTabRecent(): Promise<TabRecent[]> {
  if (isDatabaseConfigured()) {
    await ensureNeonSchema();
    const db = sql();
    const rows = await db`
      SELECT alias, created_at
      FROM tab_grants
      ORDER BY created_at DESC
      LIMIT 10
    `;
    return rows.map((row) => ({
      alias: String(row.alias ?? ""),
      sats: TAB_PRICE_SATS,
      createdAt: iso(row.created_at),
    }));
  }
  await loadStore();
  return Object.values(memory.grants)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .map((grant) => ({
      alias: grant.alias,
      sats: TAB_PRICE_SATS,
      createdAt: grant.createdAt,
    }));
}
