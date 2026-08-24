import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type SqliteDatabase = DatabaseSync;

export function createDatabase(databasePath: string): SqliteDatabase {
  if (databasePath !== ":memory:") {
    const absolutePath = resolve(databasePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
  }

  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec("PRAGMA busy_timeout = 5000;");
  if (databasePath !== ":memory:") database.exec("PRAGMA journal_mode = WAL;");
  migrate(database);
  return database;
}

export function migrate(database: SqliteDatabase): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      account_xp INTEGER NOT NULL DEFAULT 0 CHECK (account_xp >= 0),
      account_level INTEGER NOT NULL DEFAULT 1 CHECK (account_level >= 1),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refresh_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS refresh_sessions_user_idx ON refresh_sessions(user_id);

    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      code_verifier_encrypted TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS music_connections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_user_id TEXT,
      access_token_encrypted TEXT NOT NULL,
      refresh_token_encrypted TEXT NOT NULL,
      token_expires_at TEXT NOT NULL,
      scopes TEXT NOT NULL,
      last_cursor TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, provider)
    );

    CREATE TABLE IF NOT EXISTS artists (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      is_emerging INTEGER NOT NULL DEFAULT 0 CHECK (is_emerging IN (0, 1)),
      eligibility_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (eligibility_status IN ('eligible', 'pending', 'ineligible')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artist_provider_ids (
      provider TEXT NOT NULL,
      provider_artist_id TEXT NOT NULL,
      artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      PRIMARY KEY(provider, provider_artist_id)
    );

    CREATE TABLE IF NOT EXISTS listening_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_track_id TEXT NOT NULL,
      provider_artist_id TEXT NOT NULL,
      artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL,
      played_at TEXT NOT NULL,
      qualified INTEGER NOT NULL CHECK (qualified IN (0, 1)),
      xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
      rejection_reason TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, provider, provider_track_id, played_at)
    );
    CREATE INDEX IF NOT EXISTS listening_events_user_time_idx
      ON listening_events(user_id, played_at DESC);
    CREATE INDEX IF NOT EXISTS listening_events_user_artist_idx
      ON listening_events(user_id, artist_id, played_at DESC);

    CREATE TABLE IF NOT EXISTS artist_cards (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
      listen_count INTEGER NOT NULL DEFAULT 0 CHECK (listen_count >= 0),
      level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
      updated_at TEXT NOT NULL,
      PRIMARY KEY(user_id, artist_id)
    );

    CREATE TABLE IF NOT EXISTS progression_rules (
      scope TEXT NOT NULL CHECK (scope IN ('card', 'account')),
      level INTEGER NOT NULL,
      name TEXT NOT NULL,
      min_xp INTEGER NOT NULL CHECK (min_xp >= 0),
      provisional INTEGER NOT NULL DEFAULT 1 CHECK (provisional IN (0, 1)),
      PRIMARY KEY(scope, level),
      UNIQUE(scope, min_xp)
    );

    CREATE TABLE IF NOT EXISTS share_cards (
      id TEXT PRIMARY KEY,
      public_token TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      card_level INTEGER NOT NULL,
      card_xp INTEGER NOT NULL,
      account_level INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const insertRule = database.prepare(`
    INSERT OR IGNORE INTO progression_rules(scope, level, name, min_xp, provisional)
    VALUES (?, ?, ?, ?, 1)
  `);
  const cardRules = [
    [1, "Descoberta", 0],
    [2, "Ouvinte", 100],
    [3, "Fã", 500],
    [4, "Especialista", 1500],
    [5, "Lenda", 10000],
  ] as const;
  const accountRules = [
    [1, "Explorador", 0],
    [2, "Descobridor", 250],
    [3, "Curador", 1000],
    [4, "Referência", 3000],
    [5, "Radar Vivo", 10000],
  ] as const;
  for (const [level, name, minXp] of cardRules) insertRule.run("card", level, name, minXp);
  for (const [level, name, minXp] of accountRules) {
    insertRule.run("account", level, name, minXp);
  }
}

export function inTransaction<T>(database: SqliteDatabase, operation: () => T): T {
  database.exec("BEGIN IMMEDIATE;");
  try {
    const result = operation();
    database.exec("COMMIT;");
    return result;
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}
