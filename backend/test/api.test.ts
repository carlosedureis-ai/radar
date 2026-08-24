import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp, type RadarBackend } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import { createDatabase } from "../src/db.js";
import { recordListeningEvent } from "../src/progression.js";

const testConfig: AppConfig = {
  nodeEnv: "test",
  host: "127.0.0.1",
  port: 3333,
  databasePath: ":memory:",
  corsOrigins: ["http://127.0.0.1:5173"],
  trustedProxies: [],
  jwtSecret: new TextEncoder().encode("test-jwt-secret-with-more-than-32-characters"),
  encryptionKey: Buffer.alloc(32, 7),
  spotifyRedirectUri: "http://127.0.0.1:3333/v1/music/spotify/callback",
  appDeepLink: "radar://music-connected",
};

type Registration = {
  user: { id: string; email: string };
  tokens: { accessToken: string; refreshToken: string };
};

describe("Radar API", () => {
  let backend: RadarBackend;

  beforeEach(async () => {
    const database = createDatabase(":memory:");
    backend = await createApp({ config: testConfig, database });
  });

  afterEach(async () => {
    await backend.app.close();
    backend.database.close();
  });

  async function register(email = "ouvinte@example.com"): Promise<Registration> {
    const response = await backend.app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: { email, displayName: "Ouvinte Teste", password: "SenhaSegura123" },
    });
    expect(response.statusCode).toBe(201);
    return response.json<Registration>();
  }

  function auth(token: string): { authorization: string } {
    return { authorization: `Bearer ${token}` };
  }

  function seedEligibleArtist(): { artistId: string; providerArtistId: string } {
    const artistId = randomUUID();
    const providerArtistId = `spotify-${randomUUID()}`;
    backend.database
      .prepare(`
        INSERT INTO artists(id, slug, name, is_emerging, eligibility_status, created_at)
        VALUES (?, ?, 'Artista de Teste', 1, 'eligible', ?)
      `)
      .run(artistId, `artista-${artistId}`, new Date().toISOString());
    backend.database
      .prepare(`
        INSERT INTO artist_provider_ids(provider, provider_artist_id, artist_id)
        VALUES ('spotify', ?, ?)
      `)
      .run(providerArtistId, artistId);
    return { artistId, providerArtistId };
  }

  it("registers, authenticates and protects private routes", async () => {
    const registration = await register();
    const me = await backend.app.inject({
      method: "GET",
      url: "/v1/me",
      headers: auth(registration.tokens.accessToken),
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ email: "ouvinte@example.com", accountXp: 0 });

    const unauthorized = await backend.app.inject({ method: "GET", url: "/v1/cards" });
    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.json()).toMatchObject({ error: { code: "AUTH_REQUIRED" } });
  });

  it("rejects duplicate accounts and invalid credentials without leaking details", async () => {
    await register();
    const duplicate = await backend.app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: "OUVINTE@example.com",
        displayName: "Outro Nome",
        password: "SenhaSegura123",
      },
    });
    expect(duplicate.statusCode).toBe(409);

    const login = await backend.app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "ouvinte@example.com", password: "SenhaErrada999" },
    });
    expect(login.statusCode).toBe(401);
    expect(login.json()).toMatchObject({ error: { code: "INVALID_CREDENTIALS" } });
  });

  it("rotates refresh tokens and rejects reuse", async () => {
    const registration = await register();
    const firstRefresh = await backend.app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refreshToken: registration.tokens.refreshToken },
    });
    expect(firstRefresh.statusCode).toBe(200);
    expect(firstRefresh.json<{ tokens: { refreshToken: string } }>().tokens.refreshToken).not.toBe(
      registration.tokens.refreshToken,
    );

    const reuse = await backend.app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refreshToken: registration.tokens.refreshToken },
    });
    expect(reuse.statusCode).toBe(401);
    expect(reuse.json()).toMatchObject({ error: { code: "INVALID_REFRESH_TOKEN" } });
  });

  it("awards an emerging artist listen once and evolves card and account", async () => {
    const registration = await register();
    const { artistId, providerArtistId } = seedEligibleArtist();
    const listen = {
      provider: "spotify",
      providerTrackId: "track-1",
      providerArtistId,
      playedAt: new Date("2026-08-23T12:00:00.000Z").toISOString(),
    };
    const awarded = recordListeningEvent(backend.database, registration.user.id, listen);
    const duplicate = recordListeningEvent(backend.database, registration.user.id, listen);
    expect(awarded).toMatchObject({ status: "awarded", xpAwarded: 15, artistId });
    expect(duplicate).toMatchObject({ status: "duplicate", xpAwarded: 0 });

    const cards = await backend.app.inject({
      method: "GET",
      url: "/v1/cards",
      headers: auth(registration.tokens.accessToken),
    });
    expect(cards.json()).toMatchObject({
      items: [{ artistId, xp: 15, listenCount: 1, level: 1, isEmerging: true }],
    });
    const me = await backend.app.inject({
      method: "GET",
      url: "/v1/me",
      headers: auth(registration.tokens.accessToken),
    });
    expect(me.json()).toMatchObject({ accountXp: 15, accountLevel: 1 });
  });

  it("rejects rapid repeated tracks while retaining the audit event", async () => {
    const registration = await register();
    const { providerArtistId } = seedEligibleArtist();
    const first = new Date("2026-08-23T12:00:00.000Z");
    recordListeningEvent(backend.database, registration.user.id, {
      provider: "spotify",
      providerTrackId: "same-track",
      providerArtistId,
      playedAt: first.toISOString(),
    });
    const repeated = recordListeningEvent(backend.database, registration.user.id, {
      provider: "spotify",
      providerTrackId: "same-track",
      providerArtistId,
      playedAt: new Date(first.getTime() + 5 * 60 * 1000).toISOString(),
    });
    expect(repeated).toMatchObject({
      status: "rejected",
      xpAwarded: 0,
      reason: "repeat-too-soon",
    });
    const events = backend.database
      .prepare("SELECT qualified, rejection_reason FROM listening_events ORDER BY played_at")
      .all();
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ qualified: 0, rejection_reason: "repeat-too-soon" });
  });

  it("prevents one user from sharing another user's card", async () => {
    const owner = await register("owner@example.com");
    const attacker = await register("attacker@example.com");
    const { artistId, providerArtistId } = seedEligibleArtist();
    recordListeningEvent(backend.database, owner.user.id, {
      provider: "spotify",
      providerTrackId: "owner-track",
      providerArtistId,
      playedAt: "2026-08-23T12:00:00.000Z",
    });

    const forbiddenShare = await backend.app.inject({
      method: "POST",
      url: `/v1/cards/${artistId}/share`,
      headers: auth(attacker.tokens.accessToken),
    });
    expect(forbiddenShare.statusCode).toBe(404);

    const ownerShare = await backend.app.inject({
      method: "POST",
      url: `/v1/cards/${artistId}/share`,
      headers: auth(owner.tokens.accessToken),
    });
    expect(ownerShare.statusCode).toBe(201);
    const token = ownerShare.json<{ token: string }>().token;
    const publicShare = await backend.app.inject({ method: "GET", url: `/v1/shares/${token}` });
    expect(publicShare.statusCode).toBe(200);
    expect(publicShare.json()).toMatchObject({ artistName: "Artista de Teste", cardXp: 15 });
  });

  it("keeps Spotify authorization disabled until credentials exist", async () => {
    const registration = await register();
    const response = await backend.app.inject({
      method: "POST",
      url: "/v1/music/spotify/authorize",
      headers: auth(registration.tokens.accessToken),
    });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: { code: "SPOTIFY_NOT_CONFIGURED" } });
  });
});
