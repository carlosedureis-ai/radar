import { randomUUID } from "node:crypto";
import type { SqliteDatabase } from "./db.js";
import { inTransaction } from "./db.js";
import { AppError } from "./errors.js";
import { randomToken } from "./security.js";

const BASE_LISTEN_XP = 10;
const EMERGING_ARTIST_BONUS = 5;
const DAILY_ARTIST_XP_CAP = 200;
const REPEAT_WINDOW_MS = 30 * 60 * 1000;

type ArtistMappingRow = {
  artist_id: string;
  name: string;
  is_emerging: number;
  eligibility_status: "eligible" | "pending" | "ineligible";
};

type RuleRow = { level: number; name: string; min_xp: number; provisional: number };

export type NormalizedListen = {
  provider: string;
  providerTrackId: string;
  providerArtistId: string;
  playedAt: string;
};

export type ListenResult = {
  status: "awarded" | "duplicate" | "rejected";
  xpAwarded: number;
  reason?: string;
  artistId?: string;
  cardLevel?: number;
  accountLevel?: number;
};

function levelForXp(database: SqliteDatabase, scope: "card" | "account", xp: number): RuleRow {
  const rule = database
    .prepare(`
      SELECT level, name, min_xp, provisional
      FROM progression_rules WHERE scope = ? AND min_xp <= ?
      ORDER BY min_xp DESC LIMIT 1
    `)
    .get(scope, xp) as RuleRow | undefined;
  if (!rule) throw new Error(`Missing ${scope} progression rules`);
  return rule;
}

export function recordListeningEvent(
  database: SqliteDatabase,
  userId: string,
  listen: NormalizedListen,
): ListenResult {
  const playedAt = new Date(listen.playedAt);
  if (Number.isNaN(playedAt.getTime()) || playedAt.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new AppError(400, "INVALID_PLAYED_AT", "Horário da escuta inválido");
  }

  const duplicate = database
    .prepare(`
      SELECT id FROM listening_events
      WHERE user_id = ? AND provider = ? AND provider_track_id = ? AND played_at = ?
    `)
    .get(userId, listen.provider, listen.providerTrackId, playedAt.toISOString());
  if (duplicate) return { status: "duplicate", xpAwarded: 0, reason: "duplicate" };

  const mapping = database
    .prepare(`
      SELECT a.id AS artist_id, a.name, a.is_emerging, a.eligibility_status
      FROM artist_provider_ids p
      JOIN artists a ON a.id = p.artist_id
      WHERE p.provider = ? AND p.provider_artist_id = ?
    `)
    .get(listen.provider, listen.providerArtistId) as ArtistMappingRow | undefined;

  return inTransaction(database, () => {
    const now = new Date().toISOString();
    let xpAwarded = 0;
    let rejectionReason: string | null = null;

    if (!mapping) {
      rejectionReason = "artist-not-in-catalog";
    } else if (mapping.eligibility_status !== "eligible") {
      rejectionReason = `artist-${mapping.eligibility_status}`;
    } else {
      const repeatCutoff = new Date(playedAt.getTime() - REPEAT_WINDOW_MS).toISOString();
      const recentRepeat = database
        .prepare(`
          SELECT id FROM listening_events
          WHERE user_id = ? AND artist_id = ? AND provider_track_id = ?
            AND qualified = 1 AND played_at >= ? AND played_at < ?
          LIMIT 1
        `)
        .get(
          userId,
          mapping.artist_id,
          listen.providerTrackId,
          repeatCutoff,
          playedAt.toISOString(),
        );
      const dailyXp = database
        .prepare(`
          SELECT COALESCE(SUM(xp_awarded), 0) AS total
          FROM listening_events
          WHERE user_id = ? AND artist_id = ? AND date(played_at) = date(?)
        `)
        .get(userId, mapping.artist_id, playedAt.toISOString()) as { total: number };

      if (recentRepeat) {
        rejectionReason = "repeat-too-soon";
      } else if (dailyXp.total >= DAILY_ARTIST_XP_CAP) {
        rejectionReason = "daily-artist-cap";
      } else {
        const proposedXp = BASE_LISTEN_XP + (mapping.is_emerging ? EMERGING_ARTIST_BONUS : 0);
        xpAwarded = Math.min(proposedXp, DAILY_ARTIST_XP_CAP - dailyXp.total);
      }
    }

    const qualified = xpAwarded > 0 ? 1 : 0;
    database
      .prepare(`
        INSERT INTO listening_events(
          id, user_id, provider, provider_track_id, provider_artist_id, artist_id,
          played_at, qualified, xp_awarded, rejection_reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        randomUUID(),
        userId,
        listen.provider,
        listen.providerTrackId,
        listen.providerArtistId,
        mapping?.artist_id ?? null,
        playedAt.toISOString(),
        qualified,
        xpAwarded,
        rejectionReason,
        now,
      );

    if (!mapping || xpAwarded === 0) {
      return {
        status: "rejected" as const,
        xpAwarded: 0,
        reason: rejectionReason ?? "not-qualified",
        ...(mapping ? { artistId: mapping.artist_id } : {}),
      };
    }

    database
      .prepare(`
        INSERT INTO artist_cards(user_id, artist_id, xp, listen_count, level, updated_at)
        VALUES (?, ?, ?, 1, 1, ?)
        ON CONFLICT(user_id, artist_id) DO UPDATE SET
          xp = xp + excluded.xp,
          listen_count = listen_count + 1,
          updated_at = excluded.updated_at
      `)
      .run(userId, mapping.artist_id, xpAwarded, now);

    const card = database
      .prepare("SELECT xp FROM artist_cards WHERE user_id = ? AND artist_id = ?")
      .get(userId, mapping.artist_id) as { xp: number };
    const cardRule = levelForXp(database, "card", card.xp);
    database
      .prepare("UPDATE artist_cards SET level = ? WHERE user_id = ? AND artist_id = ?")
      .run(cardRule.level, userId, mapping.artist_id);

    database.prepare("UPDATE users SET account_xp = account_xp + ? WHERE id = ?").run(
      xpAwarded,
      userId,
    );
    const account = database.prepare("SELECT account_xp FROM users WHERE id = ?").get(userId) as {
      account_xp: number;
    };
    const accountRule = levelForXp(database, "account", account.account_xp);
    database.prepare("UPDATE users SET account_level = ? WHERE id = ?").run(
      accountRule.level,
      userId,
    );

    return {
      status: "awarded" as const,
      xpAwarded,
      artistId: mapping.artist_id,
      cardLevel: cardRule.level,
      accountLevel: accountRule.level,
    };
  });
}

export function listCards(database: SqliteDatabase, userId: string): unknown[] {
  return database
    .prepare(`
      SELECT c.artist_id AS artistId, a.name AS artistName, a.slug, a.is_emerging AS isEmerging,
             c.xp, c.listen_count AS listenCount, c.level, c.updated_at AS updatedAt
      FROM artist_cards c JOIN artists a ON a.id = c.artist_id
      WHERE c.user_id = ? ORDER BY c.xp DESC, a.name ASC
    `)
    .all(userId)
    .map((row) => ({ ...row, isEmerging: Boolean((row as { isEmerging: number }).isEmerging) }));
}

export function getProgression(database: SqliteDatabase, userId: string): unknown {
  const account = database
    .prepare(`
      SELECT id, display_name AS displayName, account_xp AS xp, account_level AS level
      FROM users WHERE id = ?
    `)
    .get(userId);
  if (!account) throw new AppError(404, "USER_NOT_FOUND", "Usuário não encontrado");
  const rules = database
    .prepare(`
      SELECT scope, level, name, min_xp AS minXp, provisional
      FROM progression_rules ORDER BY scope, level
    `)
    .all()
    .map((row) => ({ ...row, provisional: Boolean((row as { provisional: number }).provisional) }));
  return { account, rules };
}

export function createShareCard(
  database: SqliteDatabase,
  userId: string,
  artistId: string,
): { token: string; createdAt: string } {
  const card = database
    .prepare(`
      SELECT c.level, c.xp, u.account_level AS accountLevel
      FROM artist_cards c JOIN users u ON u.id = c.user_id
      WHERE c.user_id = ? AND c.artist_id = ?
    `)
    .get(userId, artistId) as { level: number; xp: number; accountLevel: number } | undefined;
  if (!card) throw new AppError(404, "CARD_NOT_FOUND", "Carta não encontrada");
  const token = randomToken(18);
  const createdAt = new Date().toISOString();
  database
    .prepare(`
      INSERT INTO share_cards(
        id, public_token, user_id, artist_id, card_level, card_xp, account_level, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      randomUUID(),
      token,
      userId,
      artistId,
      card.level,
      card.xp,
      card.accountLevel,
      createdAt,
    );
  return { token, createdAt };
}

export function getPublicShare(database: SqliteDatabase, token: string): unknown {
  const share = database
    .prepare(`
      SELECT s.public_token AS token, a.name AS artistName, a.slug AS artistSlug,
             s.card_level AS cardLevel, s.card_xp AS cardXp,
             s.account_level AS accountLevel, s.created_at AS createdAt
      FROM share_cards s JOIN artists a ON a.id = s.artist_id
      WHERE s.public_token = ?
    `)
    .get(token);
  if (!share) throw new AppError(404, "SHARE_NOT_FOUND", "Compartilhamento não encontrado");
  return share;
}
