import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { DataType, newDb } from "pg-mem";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp, sanitizeRequestUrl, type RadarBackend } from "../src/app.js";
import {
  createSupabaseTokenVerifier,
  type AuthIdentity,
  type TokenVerifier,
} from "../src/auth.js";
import { loadConfig, type AppConfig } from "../src/config.js";
import type { DatabasePool } from "../src/db.js";
import { AppError } from "../src/errors.js";
import { recordListeningEvent } from "../src/progression.js";

const testConfig: AppConfig = {
  nodeEnv: "test",
  host: "127.0.0.1",
  port: 3333,
  databaseUrl: "postgresql://test.invalid/radar",
  databaseSsl: false,
  corsOrigins: ["http://127.0.0.1:5173"],
  trustedProxies: [],
  supabaseUrl: "https://fxhvbmidhgdmrdyrywqw.supabase.co",
  encryptionKey: Buffer.alloc(32, 7),
  spotifyRedirectUri: "http://127.0.0.1:3333/v1/music/spotify/callback",
  appDeepLink: "radar://music-connected",
};

type TestUser = {
  id: string;
  email: string;
  accessToken: string;
};

async function createTestDatabase(): Promise<DatabasePool> {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  memory.public.registerFunction({
    name: "char_length",
    args: [DataType.text],
    returns: DataType.integer,
    implementation: (value: string) => value.length,
  });
  memory.public.none("CREATE SCHEMA auth");
  memory.public.none("CREATE TABLE auth.users(id uuid PRIMARY KEY, email text UNIQUE)");
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool() as unknown as DatabasePool;
  const migrationPath = fileURLToPath(
    new URL("../../supabase/migrations/202608260001_radar_core.sql", import.meta.url),
  );
  const migration = readFileSync(migrationPath, "utf8").replace(
    /-- TEST_UNSUPPORTED_BEGIN[\s\S]*?-- TEST_UNSUPPORTED_END/g,
    "",
  );
  await pool.query(migration);
  return pool;
}

describe("Radar API with Supabase Auth and PostgreSQL", () => {
  let backend: RadarBackend;
  let identities: Map<string, AuthIdentity>;

  beforeEach(async () => {
    const database = await createTestDatabase();
    identities = new Map();
    const tokenVerifier: TokenVerifier = async (token) => {
      const identity = identities.get(token);
      if (!identity) throw new AppError(401, "INVALID_ACCESS_TOKEN", "Token inválido");
      return identity;
    };
    backend = await createApp({ config: testConfig, database, tokenVerifier });
  });

  afterEach(async () => {
    if (backend) {
      await backend.app.close();
      await backend.database.end();
    }
  });

  async function createUser(email = "ouvinte@example.com"): Promise<TestUser> {
    const id = randomUUID();
    const accessToken = `test-token-${randomUUID()}`;
    await backend.database.query("INSERT INTO auth.users(id, email) VALUES ($1, $2)", [id, email]);
    identities.set(accessToken, { id, email, displayName: "Ouvinte Teste" });
    return { id, email, accessToken };
  }

  function auth(token: string): { authorization: string } {
    return { authorization: `Bearer ${token}` };
  }

  async function seedEligibleArtist(): Promise<{ artistId: string; providerArtistId: string }> {
    const artistId = randomUUID();
    const providerArtistId = `spotify-${randomUUID()}`;
    await backend.database.query(
      `
        INSERT INTO artists(id, slug, name, is_emerging, eligibility_status)
        VALUES ($1, $2, 'Artista de Teste', true, 'eligible')
      `,
      [artistId, `artista-${artistId}`],
    );
    await backend.database.query(
      `
        INSERT INTO artist_provider_ids(provider, provider_artist_id, artist_id)
        VALUES ('spotify', $1, $2)
      `,
      [providerArtistId, artistId],
    );
    return { artistId, providerArtistId };
  }

  async function activateProfile(user: TestUser): Promise<void> {
    const response = await backend.app.inject({
      method: "GET",
      url: "/v1/me",
      headers: auth(user.accessToken),
    });
    expect(response.statusCode).toBe(200);
  }

  it("creates a profile from a verified Supabase identity and protects private routes", async () => {
    const user = await createUser();
    const me = await backend.app.inject({
      method: "GET",
      url: "/v1/me",
      headers: auth(user.accessToken),
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({
      id: user.id,
      email: "ouvinte@example.com",
      displayName: "Ouvinte Teste",
      accountXp: 0,
    });

    const unauthorized = await backend.app.inject({ method: "GET", url: "/v1/cards" });
    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.json()).toMatchObject({ error: { code: "AUTH_REQUIRED" } });
  });

  it("creates one profile when a new account loads private routes concurrently", async () => {
    const user = await createUser("primeiro-login@example.com");
    const routes = [
      "/v1/me",
      "/v1/progression",
      "/v1/music/connections",
      "/v1/cards",
      "/v1/listens",
    ];
    const responses = await Promise.all(
      routes.map((url) =>
        backend.app.inject({
          method: "GET",
          url,
          headers: auth(user.accessToken),
        }),
      ),
    );

    expect(responses.map((response) => response.statusCode)).toEqual([200, 200, 200, 200, 200]);
    const profiles = await backend.database.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM profiles WHERE id = $1",
      [user.id],
    );
    expect(profiles.rows[0]?.count).toBe(1);
  });

  it("rejects an unknown Supabase access token", async () => {
    const response = await backend.app.inject({
      method: "GET",
      url: "/v1/me",
      headers: auth("unknown-token"),
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: "INVALID_ACCESS_TOKEN" } });
  });

  it("rejects a valid token whose Supabase user was removed", async () => {
    const id = randomUUID();
    const accessToken = `stale-token-${randomUUID()}`;
    identities.set(accessToken, {
      id,
      email: "removido@example.com",
      displayName: "Usuário removido",
    });

    const response = await backend.app.inject({
      method: "GET",
      url: "/v1/me",
      headers: auth(accessToken),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: {
        code: "AUTH_USER_NOT_FOUND",
        message: "Sua sessão não é mais válida; entre novamente",
      },
    });
  });

  it("verifies Supabase issuer, audience, role and asymmetric signature", async () => {
    const userId = randomUUID();
    const { privateKey, publicKey } = await generateKeyPair("ES256");
    const publicJwk = await exportJWK(publicKey);
    const verifier = createSupabaseTokenVerifier(
      testConfig,
      createLocalJWKSet({ keys: [{ ...publicJwk, kid: "test-key", alg: "ES256" }] }),
    );
    const validToken = await new SignJWT({
      role: "authenticated",
      email: "jwt@example.com",
      user_metadata: { display_name: "JWT Teste" },
    })
      .setProtectedHeader({ alg: "ES256", kid: "test-key" })
      .setIssuer(`${testConfig.supabaseUrl}/auth/v1`)
      .setAudience("authenticated")
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    await expect(verifier(validToken)).resolves.toEqual({
      id: userId,
      email: "jwt@example.com",
      displayName: "JWT Teste",
    });

    const wrongAudience = await new SignJWT({ role: "authenticated" })
      .setProtectedHeader({ alg: "ES256", kid: "test-key" })
      .setIssuer(`${testConfig.supabaseUrl}/auth/v1`)
      .setAudience("service_role")
      .setSubject(userId)
      .setExpirationTime("5m")
      .sign(privateKey);
    await expect(verifier(wrongAudience)).rejects.toMatchObject({
      code: "INVALID_ACCESS_TOKEN",
    });
  });

  it("awards an emerging artist listen once and evolves card and account", async () => {
    const user = await createUser();
    await activateProfile(user);
    const { artistId, providerArtistId } = await seedEligibleArtist();
    const listen = {
      provider: "spotify",
      providerTrackId: "track-1",
      providerArtistId,
      playedAt: "2026-08-23T12:00:00.000Z",
    };
    const awarded = await recordListeningEvent(backend.database, user.id, listen);
    const duplicate = await recordListeningEvent(backend.database, user.id, listen);
    expect(awarded).toMatchObject({ status: "awarded", xpAwarded: 15, artistId });
    expect(duplicate).toMatchObject({ status: "duplicate", xpAwarded: 0 });

    const cards = await backend.app.inject({
      method: "GET",
      url: "/v1/cards",
      headers: auth(user.accessToken),
    });
    expect(cards.json()).toMatchObject({
      items: [{ artistId, xp: 15, listenCount: 1, level: 1, isEmerging: true }],
    });
    const me = await backend.app.inject({
      method: "GET",
      url: "/v1/me",
      headers: auth(user.accessToken),
    });
    expect(me.json()).toMatchObject({ accountXp: 15, accountLevel: 1 });
  });

  it("rejects rapid repeated tracks while retaining the audit event", async () => {
    const user = await createUser();
    await activateProfile(user);
    const { providerArtistId } = await seedEligibleArtist();
    await recordListeningEvent(backend.database, user.id, {
      provider: "spotify",
      providerTrackId: "same-track",
      providerArtistId,
      playedAt: "2026-08-23T12:00:00.000Z",
    });
    const repeated = await recordListeningEvent(backend.database, user.id, {
      provider: "spotify",
      providerTrackId: "same-track",
      providerArtistId,
      playedAt: "2026-08-23T12:05:00.000Z",
    });
    expect(repeated).toMatchObject({
      status: "rejected",
      xpAwarded: 0,
      reason: "repeat-too-soon",
    });
    const events = await backend.database.query<{ qualified: boolean; rejection_reason: string }>(
      "SELECT qualified, rejection_reason FROM listening_events ORDER BY played_at",
    );
    expect(events.rows).toHaveLength(2);
    expect(events.rows[1]).toMatchObject({ qualified: false, rejection_reason: "repeat-too-soon" });
  });

  it("rejects rapid repeated tracks even when events arrive newest first", async () => {
    const user = await createUser();
    await activateProfile(user);
    const { providerArtistId } = await seedEligibleArtist();
    const newer = await recordListeningEvent(backend.database, user.id, {
      provider: "spotify",
      providerTrackId: "reverse-track",
      providerArtistId,
      playedAt: "2026-08-23T12:05:00.000Z",
    });
    const older = await recordListeningEvent(backend.database, user.id, {
      provider: "spotify",
      providerTrackId: "reverse-track",
      providerArtistId,
      playedAt: "2026-08-23T12:00:00.000Z",
    });
    expect(newer).toMatchObject({ status: "awarded", xpAwarded: 15 });
    expect(older).toMatchObject({ status: "rejected", xpAwarded: 0, reason: "repeat-too-soon" });
  });

  it("prevents one provider identity from connecting to multiple Radar accounts", async () => {
    const first = await createUser("provider-owner-1@example.com");
    const second = await createUser("provider-owner-2@example.com");
    await activateProfile(first);
    await activateProfile(second);
    const now = new Date().toISOString();
    await backend.database.query(
      `
        INSERT INTO music_connections(
          id, user_id, provider, provider_user_id, access_token_encrypted,
          refresh_token_encrypted, token_expires_at, scopes
        ) VALUES ($1, $2, 'spotify', 'same-provider-user', 'encrypted', 'encrypted', $3, '')
      `,
      [randomUUID(), first.id, now],
    );
    await expect(
      backend.database.query(
        `
          INSERT INTO music_connections(
            id, user_id, provider, provider_user_id, access_token_encrypted,
            refresh_token_encrypted, token_expires_at, scopes
          ) VALUES ($1, $2, 'spotify', 'same-provider-user', 'encrypted', 'encrypted', $3, '')
        `,
        [randomUUID(), second.id, now],
      ),
    ).rejects.toThrow(/unique/i);
  });

  it("prevents one user from sharing another user's card", async () => {
    const owner = await createUser("owner@example.com");
    const attacker = await createUser("attacker@example.com");
    await activateProfile(owner);
    await activateProfile(attacker);
    const { artistId, providerArtistId } = await seedEligibleArtist();
    await recordListeningEvent(backend.database, owner.id, {
      provider: "spotify",
      providerTrackId: "owner-track",
      providerArtistId,
      playedAt: "2026-08-23T12:00:00.000Z",
    });

    const forbiddenShare = await backend.app.inject({
      method: "POST",
      url: `/v1/cards/${artistId}/share`,
      headers: auth(attacker.accessToken),
    });
    expect(forbiddenShare.statusCode).toBe(404);

    const ownerShare = await backend.app.inject({
      method: "POST",
      url: `/v1/cards/${artistId}/share`,
      headers: auth(owner.accessToken),
    });
    expect(ownerShare.statusCode).toBe(201);
    const token = ownerShare.json<{ token: string }>().token;
    const publicShare = await backend.app.inject({ method: "GET", url: `/v1/shares/${token}` });
    expect(publicShare.statusCode).toBe(200);
    expect(publicShare.json()).toMatchObject({ artistName: "Artista de Teste", cardXp: 15 });
  });

  it("keeps Spotify authorization disabled until credentials exist", async () => {
    const user = await createUser();
    const response = await backend.app.inject({
      method: "POST",
      url: "/v1/music/spotify/authorize",
      headers: auth(user.accessToken),
    });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: { code: "SPOTIFY_NOT_CONFIGURED" } });
  });

  it("removes query secrets from request URLs before logging", () => {
    expect(
      sanitizeRequestUrl("/v1/music/spotify/callback?code=secret-code&state=secret-state"),
    ).toBe("/v1/music/spotify/callback");
  });

  it("requires a database URL and explicit encryption secrets outside loopback", () => {
    expect(() => loadConfig({ NODE_ENV: "development", HOST: "127.0.0.1" })).toThrow(
      /DATABASE_URL is required/,
    );
    expect(() =>
      loadConfig({
        NODE_ENV: "development",
        HOST: "0.0.0.0",
        DATABASE_URL: "postgresql://example.invalid/radar",
      }),
    ).toThrow(/TOKEN_ENCRYPTION_KEY is required/);
  });
});
