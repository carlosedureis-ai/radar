import { randomUUID } from "node:crypto";
import type { DatabasePool, Queryable } from "./db.js";
import { inTransaction } from "./db.js";
import { AppError } from "./errors.js";
import { reprocessCatalogedEvents } from "./progression.js";

export type ArtistEligibilityStatus = "eligible" | "pending" | "ineligible";

type CandidateRow = {
  provider: string;
  provider_artist_id: string;
  candidate_name: string | null;
  image_url: string | null;
  followers: number | null;
  popularity: number | null;
  metadata_refreshed_at: Date | string | null;
  artist_id: string | null;
  artist_name: string | null;
  is_emerging: boolean | null;
  eligibility_status: ArtistEligibilityStatus | null;
  listen_count: number | string;
  waiting_count: number | string;
  first_seen_at: Date | string;
  last_seen_at: Date | string;
};

function slugify(value: string): string {
  const base = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54);
  return base || "artista";
}

export async function requireAdmin(database: Queryable, userId: string): Promise<void> {
  const result = await database.query<{ is_admin: boolean }>(
    "SELECT is_admin FROM profiles WHERE id = $1",
    [userId],
  );
  if (!result.rows[0]?.is_admin) {
    throw new AppError(403, "ADMIN_REQUIRED", "Esta área é exclusiva da curadoria Radar");
  }
}

export async function listArtistCandidates(database: Queryable): Promise<{
  items: unknown[];
  summary: { total: number; waiting: number; cataloged: number; listensWaiting: number };
}> {
  const result = await database.query<CandidateRow>(
    `
      SELECT e.provider, e.provider_artist_id,
             c.name AS candidate_name, c.image_url, c.followers, c.popularity,
             c.metadata_refreshed_at,
             a.id AS artist_id, a.name AS artist_name, a.is_emerging,
             a.eligibility_status,
             e.listen_count, e.waiting_count, e.first_seen_at, e.last_seen_at
      FROM (
        SELECT provider, provider_artist_id, COUNT(*) AS listen_count,
               SUM(CASE WHEN rejection_reason = 'artist-not-in-catalog' THEN 1 ELSE 0 END)
                 AS waiting_count,
               MIN(played_at) AS first_seen_at,
               MAX(played_at) AS last_seen_at
        FROM listening_events
        GROUP BY provider, provider_artist_id
      ) e
      LEFT JOIN artist_candidates c
        ON c.provider = e.provider AND c.provider_artist_id = e.provider_artist_id
      LEFT JOIN artist_provider_ids p
        ON p.provider = e.provider AND p.provider_artist_id = e.provider_artist_id
      LEFT JOIN artists a ON a.id = p.artist_id
      ORDER BY
        CASE WHEN a.id IS NULL THEN 0 WHEN a.eligibility_status = 'pending' THEN 1 ELSE 2 END,
        e.last_seen_at DESC
    `,
  );
  const items = result.rows.map((row) => ({
    provider: row.provider,
    providerArtistId: row.provider_artist_id,
    name: row.artist_name ?? row.candidate_name,
    imageUrl: row.image_url,
    followers: row.followers === null ? null : Number(row.followers),
    popularity: row.popularity === null ? null : Number(row.popularity),
    metadataRefreshedAt: row.metadata_refreshed_at
      ? new Date(row.metadata_refreshed_at).toISOString()
      : null,
    artistId: row.artist_id,
    isEmerging: row.is_emerging ?? false,
    eligibilityStatus: row.eligibility_status ?? "uncataloged",
    listenCount: Number(row.listen_count),
    waitingCount: Number(row.waiting_count),
    firstSeenAt: new Date(row.first_seen_at).toISOString(),
    lastSeenAt: new Date(row.last_seen_at).toISOString(),
  }));
  return {
    items,
    summary: {
      total: items.length,
      waiting: items.filter((item) => item.eligibilityStatus === "uncataloged").length,
      cataloged: items.filter((item) => item.eligibilityStatus !== "uncataloged").length,
      listensWaiting: items.reduce((total, item) => total + item.waitingCount, 0),
    },
  };
}

export async function catalogArtist(
  database: DatabasePool,
  input: {
    provider: string;
    providerArtistId: string;
    name: string;
    isEmerging: boolean;
    eligibilityStatus: ArtistEligibilityStatus;
  },
): Promise<{ artistId: string; reprocessed: number; awarded: number; rejected: number }> {
  const artistId = await inTransaction(database, async (transaction) => {
    const mapping = await transaction.query<{ artist_id: string }>(
      `
        SELECT artist_id FROM artist_provider_ids
        WHERE provider = $1 AND provider_artist_id = $2
      `,
      [input.provider, input.providerArtistId],
    );
    const existingArtistId = mapping.rows[0]?.artist_id;
    if (existingArtistId) {
      if (input.eligibilityStatus === "ineligible") {
        const awarded = await transaction.query(
          "SELECT 1 FROM listening_events WHERE artist_id = $1 AND qualified = true LIMIT 1",
          [existingArtistId],
        );
        if (awarded.rows[0]) {
          throw new AppError(
            409,
            "ARTIST_HAS_PROGRESS",
            "Este artista já gerou progresso e não pode ser tornado inelegível",
          );
        }
      }
      await transaction.query(
        `
          UPDATE artists SET name = $1, is_emerging = $2, eligibility_status = $3
          WHERE id = $4
        `,
        [input.name, input.isEmerging, input.eligibilityStatus, existingArtistId],
      );
      return existingArtistId;
    }

    const id = randomUUID();
    const slug = `${slugify(input.name)}-${id.slice(0, 8)}`;
    await transaction.query(
      `
        INSERT INTO artists(id, slug, name, is_emerging, eligibility_status)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [id, slug, input.name, input.isEmerging, input.eligibilityStatus],
    );
    await transaction.query(
      `
        INSERT INTO artist_provider_ids(provider, provider_artist_id, artist_id)
        VALUES ($1, $2, $3)
      `,
      [input.provider, input.providerArtistId, id],
    );
    await transaction.query(
      `
        INSERT INTO artist_candidates(provider, provider_artist_id, name, updated_at)
        VALUES ($1, $2, $3, now())
        ON CONFLICT(provider, provider_artist_id) DO UPDATE SET
          name = EXCLUDED.name, updated_at = now()
      `,
      [input.provider, input.providerArtistId, input.name],
    );
    return id;
  });

  const reprocessing = await reprocessCatalogedEvents(
    database,
    input.provider,
    input.providerArtistId,
  );
  return { artistId, ...reprocessing };
}
