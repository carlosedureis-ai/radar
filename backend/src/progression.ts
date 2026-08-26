import { randomUUID } from "node:crypto";
import type { DatabasePool, Queryable } from "./db.js";
import { inTransaction, isUniqueViolation } from "./db.js";
import { AppError } from "./errors.js";
import { randomToken } from "./security.js";

const BASE_LISTEN_XP = 10;
const EMERGING_ARTIST_BONUS = 5;
const DAILY_ARTIST_XP_CAP = 200;
const REPEAT_WINDOW_MS = 30 * 60 * 1000;

type ArtistMappingRow = {
  artist_id: string;
  name: string;
  is_emerging: boolean;
  eligibility_status: "eligible" | "pending" | "ineligible";
};

type RuleRow = { level: number; name: string; min_xp: number; provisional: boolean };
type ProgressionRuleRow = RuleRow & { scope: "card" | "account" };

export type NormalizedListen = {
  provider: string;
  providerTrackId: string;
  providerArtistId: string;
  providerArtistName?: string;
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

async function levelForXp(
  database: Queryable,
  scope: "card" | "account",
  xp: number,
): Promise<RuleRow> {
  const result = await database.query<RuleRow>(
    `
      SELECT level, name, min_xp, provisional
      FROM progression_rules WHERE scope = $1 AND min_xp <= $2
      ORDER BY min_xp DESC LIMIT 1
    `,
    [scope, xp],
  );
  const rule = result.rows[0];
  if (!rule) throw new Error(`Missing ${scope} progression rules`);
  return rule;
}

export async function recordListeningEvent(
  database: DatabasePool,
  userId: string,
  listen: NormalizedListen,
): Promise<ListenResult> {
  const playedAt = new Date(listen.playedAt);
  if (Number.isNaN(playedAt.getTime()) || playedAt.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new AppError(400, "INVALID_PLAYED_AT", "Horário da escuta inválido");
  }
  const playedAtIso = playedAt.toISOString();

  try {
    return await inTransaction(database, async (transaction) => {
      const duplicate = await transaction.query(
        `
          SELECT id FROM listening_events
          WHERE user_id = $1 AND provider = $2 AND provider_track_id = $3 AND played_at = $4
        `,
        [userId, listen.provider, listen.providerTrackId, playedAtIso],
      );
      if (duplicate.rows[0]) return { status: "duplicate", xpAwarded: 0, reason: "duplicate" };

      const mappingResult = await transaction.query<ArtistMappingRow>(
        `
          SELECT a.id AS artist_id, a.name, a.is_emerging, a.eligibility_status
          FROM artist_provider_ids p
          JOIN artists a ON a.id = p.artist_id
          WHERE p.provider = $1 AND p.provider_artist_id = $2
        `,
        [listen.provider, listen.providerArtistId],
      );
      const mapping = mappingResult.rows[0];
      let xpAwarded = 0;
      let rejectionReason: string | null = null;

      if (!mapping) {
        rejectionReason = "artist-not-in-catalog";
        await transaction.query(
          `
            INSERT INTO artist_candidates(provider, provider_artist_id, name, updated_at)
            VALUES ($1, $2, $3, now())
            ON CONFLICT(provider, provider_artist_id) DO NOTHING
          `,
          [listen.provider, listen.providerArtistId, listen.providerArtistName ?? null],
        );
        if (listen.providerArtistName) {
          await transaction.query(
            `
              UPDATE artist_candidates SET name = $3, updated_at = now()
              WHERE provider = $1 AND provider_artist_id = $2
            `,
            [listen.provider, listen.providerArtistId, listen.providerArtistName],
          );
        }
      } else if (mapping.eligibility_status !== "eligible") {
        rejectionReason = `artist-${mapping.eligibility_status}`;
      } else {
        const repeatWindowStart = new Date(playedAt.getTime() - REPEAT_WINDOW_MS).toISOString();
        const repeatWindowEnd = new Date(playedAt.getTime() + REPEAT_WINDOW_MS).toISOString();
        const recentRepeat = await transaction.query(
          `
            SELECT id FROM listening_events
            WHERE user_id = $1 AND artist_id = $2 AND provider = $3 AND provider_track_id = $4
              AND qualified = true AND played_at >= $5 AND played_at <= $6 AND played_at <> $7
            LIMIT 1
          `,
          [
            userId,
            mapping.artist_id,
            listen.provider,
            listen.providerTrackId,
            repeatWindowStart,
            repeatWindowEnd,
            playedAtIso,
          ],
        );
        const dailyResult = await transaction.query<{ total: number | string }>(
          `
            SELECT COALESCE(SUM(xp_awarded), 0) AS total
            FROM listening_events
            WHERE user_id = $1 AND artist_id = $2 AND played_at::date = $3::timestamptz::date
          `,
          [userId, mapping.artist_id, playedAtIso],
        );
        const dailyXp = Number(dailyResult.rows[0]?.total ?? 0);

        if (recentRepeat.rows[0]) {
          rejectionReason = "repeat-too-soon";
        } else if (dailyXp >= DAILY_ARTIST_XP_CAP) {
          rejectionReason = "daily-artist-cap";
        } else {
          const proposedXp = BASE_LISTEN_XP + (mapping.is_emerging ? EMERGING_ARTIST_BONUS : 0);
          xpAwarded = Math.min(proposedXp, DAILY_ARTIST_XP_CAP - dailyXp);
        }
      }

      await transaction.query(
        `
          INSERT INTO listening_events(
            id, user_id, provider, provider_track_id, provider_artist_id, artist_id,
            played_at, qualified, xp_awarded, rejection_reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          randomUUID(),
          userId,
          listen.provider,
          listen.providerTrackId,
          listen.providerArtistId,
          mapping?.artist_id ?? null,
          playedAtIso,
          xpAwarded > 0,
          xpAwarded,
          rejectionReason,
        ],
      );

      if (!mapping || xpAwarded === 0) {
        return {
          status: "rejected" as const,
          xpAwarded: 0,
          reason: rejectionReason ?? "not-qualified",
          ...(mapping ? { artistId: mapping.artist_id } : {}),
        };
      }

      const cardResult = await transaction.query<{ xp: number }>(
        `
          INSERT INTO artist_cards(user_id, artist_id, xp, listen_count, level)
          VALUES ($1, $2, $3, 1, 1)
          ON CONFLICT(user_id, artist_id) DO UPDATE SET
            xp = artist_cards.xp + EXCLUDED.xp,
            listen_count = artist_cards.listen_count + 1,
            updated_at = now()
          RETURNING xp
        `,
        [userId, mapping.artist_id, xpAwarded],
      );
      const cardXp = Number(cardResult.rows[0]?.xp ?? 0);
      const cardRule = await levelForXp(transaction, "card", cardXp);
      await transaction.query(
        "UPDATE artist_cards SET level = $1 WHERE user_id = $2 AND artist_id = $3",
        [cardRule.level, userId, mapping.artist_id],
      );

      const accountResult = await transaction.query<{ account_xp: number }>(
        `
          UPDATE profiles SET account_xp = account_xp + $1, updated_at = now()
          WHERE id = $2 RETURNING account_xp
        `,
        [xpAwarded, userId],
      );
      const accountXp = Number(accountResult.rows[0]?.account_xp ?? 0);
      const accountRule = await levelForXp(transaction, "account", accountXp);
      await transaction.query("UPDATE profiles SET account_level = $1 WHERE id = $2", [
        accountRule.level,
        userId,
      ]);

      return {
        status: "awarded" as const,
        xpAwarded,
        artistId: mapping.artist_id,
        cardLevel: cardRule.level,
        accountLevel: accountRule.level,
      };
    });
  } catch (error) {
    if (isUniqueViolation(error, "listening_events_identity_key")) {
      return { status: "duplicate", xpAwarded: 0, reason: "duplicate" };
    }
    throw error;
  }
}

export async function reprocessCatalogedEvents(
  database: DatabasePool,
  provider: string,
  providerArtistId: string,
): Promise<{ reprocessed: number; awarded: number; rejected: number }> {
  const pending = await database.query<{ id: string }>(
    `
      SELECT id FROM listening_events
      WHERE provider = $1 AND provider_artist_id = $2 AND qualified = false
        AND xp_awarded = 0
        AND rejection_reason IN ('artist-not-in-catalog', 'artist-pending', 'artist-ineligible')
      ORDER BY played_at, id
    `,
    [provider, providerArtistId],
  );
  let reprocessed = 0;
  let awarded = 0;

  for (const candidate of pending.rows) {
    const result = await inTransaction(database, async (transaction) => {
      const eventResult = await transaction.query<{
        id: string;
        user_id: string;
        provider_track_id: string;
        played_at: Date | string;
        qualified: boolean;
        xp_awarded: number;
        rejection_reason: string | null;
      }>(
        `
          SELECT id, user_id, provider_track_id, played_at, qualified, xp_awarded,
                 rejection_reason
          FROM listening_events WHERE id = $1 FOR UPDATE
        `,
        [candidate.id],
      );
      const event = eventResult.rows[0];
      if (
        !event ||
        event.qualified ||
        Number(event.xp_awarded) !== 0 ||
        !["artist-not-in-catalog", "artist-pending", "artist-ineligible"].includes(
          event.rejection_reason ?? "",
        )
      ) {
        return "skipped" as const;
      }

      const mappingResult = await transaction.query<ArtistMappingRow>(
        `
          SELECT a.id AS artist_id, a.name, a.is_emerging, a.eligibility_status
          FROM artist_provider_ids p JOIN artists a ON a.id = p.artist_id
          WHERE p.provider = $1 AND p.provider_artist_id = $2
        `,
        [provider, providerArtistId],
      );
      const mapping = mappingResult.rows[0];
      if (!mapping) return "skipped" as const;

      if (mapping.eligibility_status !== "eligible") {
        await transaction.query(
          `
            UPDATE listening_events SET artist_id = $1, rejection_reason = $2
            WHERE id = $3
          `,
          [mapping.artist_id, `artist-${mapping.eligibility_status}`, event.id],
        );
        return "rejected" as const;
      }

      const playedAt = new Date(event.played_at);
      const playedAtIso = playedAt.toISOString();
      const repeatWindowStart = new Date(playedAt.getTime() - REPEAT_WINDOW_MS).toISOString();
      const repeatWindowEnd = new Date(playedAt.getTime() + REPEAT_WINDOW_MS).toISOString();
      const repeated = await transaction.query(
        `
          SELECT id FROM listening_events
          WHERE user_id = $1 AND artist_id = $2 AND provider = $3
            AND provider_track_id = $4 AND qualified = true
            AND played_at >= $5 AND played_at <= $6 AND id <> $7
          LIMIT 1
        `,
        [
          event.user_id,
          mapping.artist_id,
          provider,
          event.provider_track_id,
          repeatWindowStart,
          repeatWindowEnd,
          event.id,
        ],
      );
      const dailyResult = await transaction.query<{ total: number | string }>(
        `
          SELECT COALESCE(SUM(xp_awarded), 0) AS total FROM listening_events
          WHERE user_id = $1 AND artist_id = $2
            AND played_at::date = $3::timestamptz::date
        `,
        [event.user_id, mapping.artist_id, playedAtIso],
      );
      const dailyXp = Number(dailyResult.rows[0]?.total ?? 0);
      if (repeated.rows[0] || dailyXp >= DAILY_ARTIST_XP_CAP) {
        await transaction.query(
          `
            UPDATE listening_events SET artist_id = $1, rejection_reason = $2
            WHERE id = $3
          `,
          [
            mapping.artist_id,
            repeated.rows[0] ? "repeat-too-soon" : "daily-artist-cap",
            event.id,
          ],
        );
        return "rejected" as const;
      }

      const proposedXp = BASE_LISTEN_XP + (mapping.is_emerging ? EMERGING_ARTIST_BONUS : 0);
      const xpAwarded = Math.min(proposedXp, DAILY_ARTIST_XP_CAP - dailyXp);
      await transaction.query(
        `
          UPDATE listening_events SET artist_id = $1, qualified = true,
            xp_awarded = $2, rejection_reason = NULL
          WHERE id = $3
        `,
        [mapping.artist_id, xpAwarded, event.id],
      );
      const cardResult = await transaction.query<{ xp: number }>(
        `
          INSERT INTO artist_cards(user_id, artist_id, xp, listen_count, level)
          VALUES ($1, $2, $3, 1, 1)
          ON CONFLICT(user_id, artist_id) DO UPDATE SET
            xp = artist_cards.xp + EXCLUDED.xp,
            listen_count = artist_cards.listen_count + 1,
            updated_at = now()
          RETURNING xp
        `,
        [event.user_id, mapping.artist_id, xpAwarded],
      );
      const cardXp = Number(cardResult.rows[0]?.xp ?? 0);
      const cardRule = await levelForXp(transaction, "card", cardXp);
      await transaction.query(
        "UPDATE artist_cards SET level = $1 WHERE user_id = $2 AND artist_id = $3",
        [cardRule.level, event.user_id, mapping.artist_id],
      );
      const accountResult = await transaction.query<{ account_xp: number }>(
        `
          UPDATE profiles SET account_xp = account_xp + $1, updated_at = now()
          WHERE id = $2 RETURNING account_xp
        `,
        [xpAwarded, event.user_id],
      );
      const accountXp = Number(accountResult.rows[0]?.account_xp ?? 0);
      const accountRule = await levelForXp(transaction, "account", accountXp);
      await transaction.query("UPDATE profiles SET account_level = $1 WHERE id = $2", [
        accountRule.level,
        event.user_id,
      ]);
      return "awarded" as const;
    });
    if (result === "skipped") continue;
    reprocessed += 1;
    if (result === "awarded") awarded += 1;
  }
  return { reprocessed, awarded, rejected: reprocessed - awarded };
}

export async function listCards(database: Queryable, userId: string): Promise<unknown[]> {
  const result = await database.query<{
    artist_id: string;
    artist_name: string;
    slug: string;
    is_emerging: boolean;
    xp: number;
    listen_count: number;
    level: number;
    updated_at: Date | string;
  }>(
    `
      SELECT c.artist_id, a.name AS artist_name, a.slug, a.is_emerging,
             c.xp, c.listen_count, c.level, c.updated_at
      FROM artist_cards c JOIN artists a ON a.id = c.artist_id
      WHERE c.user_id = $1 ORDER BY c.xp DESC, a.name ASC
    `,
    [userId],
  );
  return result.rows.map((row) => ({
    artistId: row.artist_id,
    artistName: row.artist_name,
    slug: row.slug,
    isEmerging: row.is_emerging,
    xp: Number(row.xp),
    listenCount: Number(row.listen_count),
    level: Number(row.level),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

export async function getProgression(database: Queryable, userId: string): Promise<unknown> {
  const accountResult = await database.query<{
    id: string;
    display_name: string;
    account_xp: number;
    account_level: number;
  }>(
    "SELECT id, display_name, account_xp, account_level FROM profiles WHERE id = $1",
    [userId],
  );
  const account = accountResult.rows[0];
  if (!account) throw new AppError(404, "USER_NOT_FOUND", "Usuário não encontrado");
  const rulesResult = await database.query<ProgressionRuleRow>(
    `
      SELECT scope, level, name, min_xp, provisional
      FROM progression_rules ORDER BY scope, level
    `,
  );
  return {
    account: {
      id: account.id,
      displayName: account.display_name,
      xp: Number(account.account_xp),
      level: Number(account.account_level),
    },
    rules: rulesResult.rows.map((row) => ({
      scope: row.scope,
      level: Number(row.level),
      name: row.name,
      minXp: Number(row.min_xp),
      provisional: row.provisional,
    })),
  };
}

export async function createShareCard(
  database: Queryable,
  userId: string,
  artistId: string,
): Promise<{ token: string; createdAt: string }> {
  const cardResult = await database.query<{ level: number; xp: number; account_level: number }>(
    `
      SELECT c.level, c.xp, p.account_level
      FROM artist_cards c JOIN profiles p ON p.id = c.user_id
      WHERE c.user_id = $1 AND c.artist_id = $2
    `,
    [userId, artistId],
  );
  const card = cardResult.rows[0];
  if (!card) throw new AppError(404, "CARD_NOT_FOUND", "Carta não encontrada");
  const token = randomToken(18);
  const createdAt = new Date().toISOString();
  await database.query(
    `
      INSERT INTO share_cards(
        id, public_token, user_id, artist_id, card_level, card_xp, account_level, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [randomUUID(), token, userId, artistId, card.level, card.xp, card.account_level, createdAt],
  );
  return { token, createdAt };
}

export async function getPublicShare(database: Queryable, token: string): Promise<unknown> {
  const result = await database.query<{
    public_token: string;
    artist_name: string;
    artist_slug: string;
    card_level: number;
    card_xp: number;
    account_level: number;
    created_at: Date | string;
  }>(
    `
      SELECT s.public_token, a.name AS artist_name, a.slug AS artist_slug,
             s.card_level, s.card_xp, s.account_level, s.created_at
      FROM share_cards s JOIN artists a ON a.id = s.artist_id
      WHERE s.public_token = $1
    `,
    [token],
  );
  const share = result.rows[0];
  if (!share) throw new AppError(404, "SHARE_NOT_FOUND", "Compartilhamento não encontrado");
  return {
    token: share.public_token,
    artistName: share.artist_name,
    artistSlug: share.artist_slug,
    cardLevel: Number(share.card_level),
    cardXp: Number(share.card_xp),
    accountLevel: Number(share.account_level),
    createdAt: new Date(share.created_at).toISOString(),
  };
}
