import { randomUUID } from "node:crypto";
import type { AppConfig } from "./config.js";
import type { SqliteDatabase } from "./db.js";
import { inTransaction } from "./db.js";
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
  expires_at: string;
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
  token_expires_at: string;
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

export function createSpotifyAuthorization(
  database: SqliteDatabase,
  config: AppConfig,
  userId: string,
): { authorizationUrl: string; state: string } {
  const clientId = requireSpotifyConfig(config);
  const state = randomToken(24);
  const verifier = randomToken(64);
  const now = new Date();
  database
    .prepare(`
      INSERT INTO oauth_states(
        state, user_id, provider, code_verifier_encrypted, expires_at, created_at
      ) VALUES (?, ?, 'spotify', ?, ?, ?)
    `)
    .run(
      state,
      userId,
      encryptSecret(verifier, config.encryptionKey),
      new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
      now.toISOString(),
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
  database: SqliteDatabase,
  config: AppConfig,
  code: string,
  state: string,
): Promise<{ userId: string; provider: "spotify" }> {
  const clientId = requireSpotifyConfig(config);
  const oauthState = database
    .prepare(`
      SELECT user_id, code_verifier_encrypted, expires_at
      FROM oauth_states WHERE state = ? AND provider = 'spotify'
    `)
    .get(state) as OAuthStateRow | undefined;
  if (!oauthState || new Date(oauthState.expires_at).getTime() <= Date.now()) {
    throw new AppError(400, "INVALID_OAUTH_STATE", "A tentativa de conexão expirou ou é inválida");
  }
  database.prepare("DELETE FROM oauth_states WHERE state = ?").run(state);

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
  inTransaction(database, () => {
    const existingOwner = database
      .prepare(`
        SELECT user_id FROM music_connections
        WHERE provider = 'spotify' AND provider_user_id = ? AND user_id <> ?
      `)
      .get(profile.id, oauthState.user_id);
    if (existingOwner) {
      throw new AppError(
        409,
        "PROVIDER_ACCOUNT_IN_USE",
        "Esta conta Spotify já está conectada a outra conta Radar",
      );
    }

    database
      .prepare(`
        INSERT INTO music_connections(
          id, user_id, provider, provider_user_id, access_token_encrypted,
          refresh_token_encrypted, token_expires_at, scopes, status, created_at, updated_at
        ) VALUES (?, ?, 'spotify', ?, ?, ?, ?, ?, 'active', ?, ?)
        ON CONFLICT(user_id, provider) DO UPDATE SET
          provider_user_id = excluded.provider_user_id,
          access_token_encrypted = excluded.access_token_encrypted,
          refresh_token_encrypted = excluded.refresh_token_encrypted,
          token_expires_at = excluded.token_expires_at,
          scopes = excluded.scopes,
          status = 'active',
          updated_at = excluded.updated_at
      `)
      .run(
        randomUUID(),
        oauthState.user_id,
        profile.id,
        encryptSecret(token.access_token, config.encryptionKey),
        encryptSecret(providerRefreshToken, config.encryptionKey),
        new Date(now.getTime() + token.expires_in * 1000).toISOString(),
        token.scope,
        now.toISOString(),
        now.toISOString(),
      );
  });
  return { userId: oauthState.user_id, provider: "spotify" };
}

async function validAccessToken(
  database: SqliteDatabase,
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
  database
    .prepare(`
      UPDATE music_connections SET access_token_encrypted = ?, refresh_token_encrypted = ?,
        token_expires_at = ?, scopes = ?, updated_at = ? WHERE id = ?
    `)
    .run(
      encryptSecret(token.access_token, config.encryptionKey),
      refreshToken,
      expiresAt,
      token.scope,
      new Date().toISOString(),
      connection.id,
    );
  return token.access_token;
}

export async function syncSpotify(
  database: SqliteDatabase,
  config: AppConfig,
  userId: string,
): Promise<{ processed: number; awarded: number; rejected: number; duplicate: number }> {
  const connection = database
    .prepare(`
      SELECT id, access_token_encrypted, refresh_token_encrypted, token_expires_at, last_cursor
      FROM music_connections WHERE user_id = ? AND provider = 'spotify' AND status = 'active'
    `)
    .get(userId) as ConnectionRow | undefined;
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
      recordListeningEvent(database, userId, {
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
    database
      .prepare("UPDATE music_connections SET last_cursor = ?, updated_at = ? WHERE id = ?")
      .run(cursorValue, new Date().toISOString(), connection.id);
  }
  return {
    processed: results.length,
    awarded: results.filter((result) => result.status === "awarded").length,
    rejected: results.filter((result) => result.status === "rejected").length,
    duplicate: results.filter((result) => result.status === "duplicate").length,
  };
}

export function listConnections(database: SqliteDatabase, userId: string): unknown[] {
  return database
    .prepare(`
      SELECT provider, provider_user_id AS providerUserId, scopes, status,
             last_cursor AS lastCursor, created_at AS createdAt, updated_at AS updatedAt
      FROM music_connections WHERE user_id = ? ORDER BY provider
    `)
    .all(userId);
}

export function disconnectProvider(
  database: SqliteDatabase,
  userId: string,
  provider: string,
): void {
  const result = database
    .prepare("DELETE FROM music_connections WHERE user_id = ? AND provider = ?")
    .run(userId, provider);
  if (result.changes === 0) {
    throw new AppError(404, "CONNECTION_NOT_FOUND", "Conexão musical não encontrada");
  }
}
