import { randomUUID } from "node:crypto";
import type { AppConfig } from "./config.js";
import type { DatabasePool, Queryable } from "./db.js";
import { inTransaction, isUniqueViolation } from "./db.js";
import { AppError } from "./errors.js";
import { recordListeningEvent, type ListenResult } from "./progression.js";
import {
  decryptSecret,
  encryptSecret,
  pkceChallenge,
  randomToken,
} from "./security.js";

const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";
const SPOTIFY_SCOPES = ["user-read-private", "user-read-recently-played"];

type OAuthStateRow = {
  user_id: string;
  code_verifier_encrypted: string;
  expires_at: Date | string;
};

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

type ConnectionRow = {
  id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: Date | string;
  last_cursor: string | null;
};

type RecentlyPlayedResponse = {
  items: Array<{
    played_at: string;
    track: { id: string | null; artists: Array<{ id: string | null }> };
  }>;
  cursors?: { after?: string };
};

function requireSpotifyConfig(config: AppConfig): string {
  if (!config.spotifyClientId) {
    throw new AppError(
      503,
      "SPOTIFY_NOT_CONFIGURED",
      "A conexão Spotify ainda não foi configurada neste ambiente",
    );
  }
  return config.spotifyClientId;
}

export async function createSpotifyAuthorization(
  database: Queryable,
  config: AppConfig,
  userId: string,
): Promise<{ authorizationUrl: string; state: string }> {
  const clientId = requireSpotifyConfig(config);
  const state = randomToken(24);
  const verifier = randomToken(64);
  const now = new Date();
  await database.query(
    `
      INSERT INTO oauth_states(
        state, user_id, provider, code_verifier_encrypted, expires_at, created_at
      ) VALUES ($1, $2, 'spotify', $3, $4, $5)
    `,
    [
      state,
      userId,
      encryptSecret(verifier, config.encryptionKey),
      new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
      now.toISOString(),
    ],
  );

  const url = new URL(SPOTIFY_AUTHORIZE_URL);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: config.spotifyRedirectUri,
    scope: SPOTIFY_SCOPES.join(" "),
    state,
    code_challenge_method: "S256",
    code_challenge: pkceChallenge(verifier),
  }).toString();
  return { authorizationUrl: url.toString(), state };
}

async function requestToken(body: URLSearchParams): Promise<SpotifyTokenResponse> {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new AppError(502, "SPOTIFY_TOKEN_FAILED", "O Spotify recusou a troca de credenciais");
  }
  return (await response.json()) as SpotifyTokenResponse;
}

async function spotifyGet<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${SPOTIFY_API_URL}${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    if (response.status === 429) {
      throw new AppError(
        429,
        "SPOTIFY_RATE_LIMITED",
        `O Spotify limitou a sincronização${retryAfter ? `; tente após ${retryAfter}s` : ""}`,
      );
    }
    throw new AppError(502, "SPOTIFY_API_FAILED", "Não foi possível consultar o Spotify");
  }
  return (await response.json()) as T;
}

export async function completeSpotifyAuthorization(
  database: DatabasePool,
  config: AppConfig,
  code: string,
  state: string,
): Promise<{ userId: string; provider: "spotify" }> {
  const clientId = requireSpotifyConfig(config);
  const stateResult = await database.query<OAuthStateRow>(
    `
      DELETE FROM oauth_states
      WHERE state = $1 AND provider = 'spotify' AND expires_at > now()
      RETURNING user_id, code_verifier_encrypted, expires_at
    `,
    [state],
  );
  const oauthState = stateResult.rows[0];
  if (!oauthState) {
    throw new AppError(400, "INVALID_OAUTH_STATE", "A tentativa de conexão expirou ou é inválida");
  }

  const token = await requestToken(
    new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: config.spotifyRedirectUri,
      code_verifier: decryptSecret(oauthState.code_verifier_encrypted, config.encryptionKey),
    }),
  );
  const providerRefreshToken = token.refresh_token;
  if (!providerRefreshToken) {
    throw new AppError(502, "SPOTIFY_REFRESH_MISSING", "Spotify não forneceu sessão renovável");
  }
  const profile = await spotifyGet<{ id: string }>("/me", token.access_token);
  const now = new Date();

  try {
    await inTransaction(database, async (transaction) => {
      const existingOwner = await transaction.query(
        `
          SELECT user_id FROM music_connections
          WHERE provider = 'spotify' AND provider_user_id = $1 AND user_id <> $2
        `,
        [profile.id, oauthState.user_id],
      );
      if (existingOwner.rows[0]) {
        throw new AppError(
          409,
          "PROVIDER_ACCOUNT_IN_USE",
          "Esta conta Spotify já está conectada a outra conta Radar",
        );
      }

      await transaction.query(
        `
          INSERT INTO music_connections(
            id, user_id, provider, provider_user_id, access_token_encrypted,
            refresh_token_encrypted, token_expires_at, scopes, status, created_at, updated_at
          ) VALUES ($1, $2, 'spotify', $3, $4, $5, $6, $7, 'active', $8, $8)
          ON CONFLICT(user_id, provider) DO UPDATE SET
            provider_user_id = EXCLUDED.provider_user_id,
            access_token_encrypted = EXCLUDED.access_token_encrypted,
            refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
            token_expires_at = EXCLUDED.token_expires_at,
            scopes = EXCLUDED.scopes,
            status = 'active',
            updated_at = EXCLUDED.updated_at
        `,
        [
          randomUUID(),
          oauthState.user_id,
          profile.id,
          encryptSecret(token.access_token, config.encryptionKey),
          encryptSecret(providerRefreshToken, config.encryptionKey),
          new Date(now.getTime() + token.expires_in * 1000).toISOString(),
          token.scope,
          now.toISOString(),
        ],
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(
        409,
        "PROVIDER_ACCOUNT_IN_USE",
        "Esta conta Spotify já está conectada a outra conta Radar",
      );
    }
    throw error;
  }
  return { userId: oauthState.user_id, provider: "spotify" };
}

async function validAccessToken(
  database: Queryable,
  config: AppConfig,
  connection: ConnectionRow,
): Promise<string> {
  if (new Date(connection.token_expires_at).getTime() > Date.now() + 60_000) {
    return decryptSecret(connection.access_token_encrypted, config.encryptionKey);
  }
  const clientId = requireSpotifyConfig(config);
  const token = await requestToken(
    new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: decryptSecret(connection.refresh_token_encrypted, config.encryptionKey),
    }),
  );
  const refreshToken = token.refresh_token
    ? encryptSecret(token.refresh_token, config.encryptionKey)
    : connection.refresh_token_encrypted;
  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();
  await database.query(
    `
      UPDATE music_connections SET access_token_encrypted = $1, refresh_token_encrypted = $2,
        token_expires_at = $3, scopes = $4, updated_at = now() WHERE id = $5
    `,
    [
      encryptSecret(token.access_token, config.encryptionKey),
      refreshToken,
      expiresAt,
      token.scope,
      connection.id,
    ],
  );
  return token.access_token;
}

export async function syncSpotify(
  database: DatabasePool,
  config: AppConfig,
  userId: string,
): Promise<{ processed: number; awarded: number; rejected: number; duplicate: number }> {
  const connectionResult = await database.query<ConnectionRow>(
    `
      SELECT id, access_token_encrypted, refresh_token_encrypted, token_expires_at, last_cursor
      FROM music_connections WHERE user_id = $1 AND provider = 'spotify' AND status = 'active'
    `,
    [userId],
  );
  const connection = connectionResult.rows[0];
  if (!connection) throw new AppError(409, "SPOTIFY_NOT_CONNECTED", "Spotify não está conectado");

  const token = await validAccessToken(database, config, connection);
  const params = new URLSearchParams({ limit: "50" });
  if (connection.last_cursor) params.set("after", connection.last_cursor);
  const recent = await spotifyGet<RecentlyPlayedResponse>(
    `/me/player/recently-played?${params.toString()}`,
    token,
  );
  const results: ListenResult[] = [];
  const chronologicalItems = [...recent.items].sort(
    (left, right) => new Date(left.played_at).getTime() - new Date(right.played_at).getTime(),
  );
  for (const item of chronologicalItems) {
    const artistId = item.track.artists[0]?.id;
    if (!item.track.id || !artistId) continue;
    results.push(
      await recordListeningEvent(database, userId, {
        provider: "spotify",
        providerTrackId: item.track.id,
        providerArtistId: artistId,
        playedAt: item.played_at,
      }),
    );
  }
  const cursor = recent.cursors?.after ?? chronologicalItems.at(-1)?.played_at;
  if (cursor) {
    const cursorValue = /^\d+$/.test(cursor) ? cursor : String(new Date(cursor).getTime());
    await database.query(
      "UPDATE music_connections SET last_cursor = $1, updated_at = now() WHERE id = $2",
      [cursorValue, connection.id],
    );
  }
  return {
    processed: results.length,
    awarded: results.filter((result) => result.status === "awarded").length,
    rejected: results.filter((result) => result.status === "rejected").length,
    duplicate: results.filter((result) => result.status === "duplicate").length,
  };
}

export async function listConnections(database: Queryable, userId: string): Promise<unknown[]> {
  const result = await database.query<{
    provider: string;
    provider_user_id: string | null;
    scopes: string;
    status: string;
    last_cursor: string | null;
    created_at: Date | string;
    updated_at: Date | string;
  }>(
    `
      SELECT provider, provider_user_id, scopes, status, last_cursor, created_at, updated_at
      FROM music_connections WHERE user_id = $1 ORDER BY provider
    `,
    [userId],
  );
  return result.rows.map((row) => ({
    provider: row.provider,
    providerUserId: row.provider_user_id,
    scopes: row.scopes,
    status: row.status,
    lastCursor: row.last_cursor,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

export async function disconnectProvider(
  database: Queryable,
  userId: string,
  provider: string,
): Promise<void> {
  const result = await database.query(
    "DELETE FROM music_connections WHERE user_id = $1 AND provider = $2",
    [userId, provider],
  );
  if (result.rowCount === 0) {
    throw new AppError(404, "CONNECTION_NOT_FOUND", "Conexão musical não encontrada");
  }
}
