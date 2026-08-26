import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import {
  createSupabaseTokenVerifier,
  ensureProfile,
  getUser,
  requireUser,
  type TokenVerifier,
} from "./auth.js";
import { loadConfig, type AppConfig } from "./config.js";
import { createDatabase, type DatabasePool } from "./db.js";
import { AppError } from "./errors.js";
import {
  createShareCard,
  getProgression,
  getPublicShare,
  listCards,
} from "./progression.js";
import {
  completeSpotifyAuthorization,
  createSpotifyAuthorization,
  disconnectProvider,
  listConnections,
  syncSpotify,
} from "./spotify.js";

const oauthCallbackSchema = z.object({
  code: z.string().min(1).max(2048),
  state: z.string().min(20).max(256),
});
const shareParamsSchema = z.object({ artistId: z.uuid() });
const publicShareParamsSchema = z.object({ token: z.string().min(10).max(128) });
const providerParamsSchema = z.object({ provider: z.enum(["spotify", "apple", "lastfm"]) });
const listenQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  before: z.iso.datetime().optional(),
});

export function sanitizeRequestUrl(url: string): string {
  const queryStart = url.indexOf("?");
  return queryStart === -1 ? url : url.slice(0, queryStart);
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  return schema.parse(value);
}

function errorBody(code: string, message: string, requestId: string): unknown {
  return { error: { code, message, requestId } };
}

export type RadarBackend = {
  app: FastifyInstance;
  database: DatabasePool;
  config: AppConfig;
};

export async function createApp(options?: {
  config?: AppConfig;
  database?: DatabasePool;
  tokenVerifier?: TokenVerifier;
}): Promise<RadarBackend> {
  const config = options?.config ?? loadConfig();
  const database =
    options?.database ??
    createDatabase({ databaseUrl: config.databaseUrl, ssl: config.databaseSsl });
  const tokenVerifier = options?.tokenVerifier ?? createSupabaseTokenVerifier(config);
  const app = Fastify({
    logger:
      config.nodeEnv === "test"
        ? false
        : {
            level: config.nodeEnv === "production" ? "info" : "debug",
            redact: [
              "req.headers.authorization",
              "req.body.password",
              "req.body.refreshToken",
              "res.headers.set-cookie",
            ],
            serializers: {
              req(request: FastifyRequest) {
                return {
                  method: request.method,
                  url: sanitizeRequestUrl(request.url),
                  host: request.hostname,
                  remoteAddress: request.ip,
                };
              },
            },
          },
    bodyLimit: 32 * 1024,
    genReqId: () => randomUUID(),
    trustProxy: config.trustedProxies.length > 0 ? config.trustedProxies : false,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" },
  });
  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-Request-ID"],
    credentials: false,
    maxAge: 600,
  });
  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: "1 minute",
    keyGenerator: (request) => request.ip,
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply
        .status(400)
        .send(errorBody("VALIDATION_ERROR", error.issues[0]?.message ?? "Dados inválidos", request.id));
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(errorBody(error.code, error.message, request.id));
    }
    request.log.error({ err: error }, "unhandled request error");
    return reply
      .status(500)
      .send(errorBody("INTERNAL_ERROR", "Erro interno inesperado", request.id));
  });

  const authenticated = async (request: FastifyRequest): Promise<string> => {
    const identity = await requireUser(request, tokenVerifier);
    await ensureProfile(database, identity);
    return identity.id;
  };

  app.get("/health", async () => {
    await database.query("SELECT 1");
    return { status: "ok", service: "radar-backend", version: "0.2.0", database: "postgresql" };
  });

  app.get("/v1/me", async (request) => getUser(database, await authenticated(request)));

  app.get("/v1/music/connections", async (request) => ({
    items: await listConnections(database, await authenticated(request)),
  }));
  app.post("/v1/music/spotify/authorize", async (request) =>
    createSpotifyAuthorization(database, config, await authenticated(request)),
  );
  app.get("/v1/music/spotify/callback", async (request, reply) => {
    const query = parse(oauthCallbackSchema, request.query);
    await completeSpotifyAuthorization(database, config, query.code, query.state);
    const separator = config.appDeepLink.includes("?") ? "&" : "?";
    return reply.redirect(`${config.appDeepLink}${separator}provider=spotify&status=connected`);
  });
  app.post(
    "/v1/music/spotify/sync",
    { config: { rateLimit: { max: 6, timeWindow: "1 minute" } } },
    async (request) => ({
      result: await syncSpotify(database, config, await authenticated(request)),
    }),
  );
  app.delete("/v1/music/connections/:provider", async (request, reply) => {
    const { provider } = parse(providerParamsSchema, request.params);
    await disconnectProvider(database, await authenticated(request), provider);
    return reply.status(204).send();
  });

  app.get("/v1/listens", async (request) => {
    const userId = await authenticated(request);
    const query = parse(listenQuerySchema, request.query);
    const before = query.before ?? new Date(Date.now() + 60_000).toISOString();
    const result = await database.query<{
      id: string;
      provider: string;
      provider_track_id: string;
      played_at: Date | string;
      qualified: boolean;
      xp_awarded: number;
      rejection_reason: string | null;
      artist_id: string | null;
      artist_name: string | null;
    }>(
      `
        SELECT e.id, e.provider, e.provider_track_id, e.played_at, e.qualified,
               e.xp_awarded, e.rejection_reason, a.id AS artist_id, a.name AS artist_name
        FROM listening_events e LEFT JOIN artists a ON a.id = e.artist_id
        WHERE e.user_id = $1 AND e.played_at < $2
        ORDER BY e.played_at DESC LIMIT $3
      `,
      [userId, before, query.limit],
    );
    const items = result.rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      providerTrackId: row.provider_track_id,
      playedAt: new Date(row.played_at).toISOString(),
      qualified: row.qualified,
      xpAwarded: Number(row.xp_awarded),
      rejectionReason: row.rejection_reason,
      artistId: row.artist_id,
      artistName: row.artist_name,
    }));
    return { items, nextBefore: items.at(-1)?.playedAt ?? null };
  });

  app.get("/v1/cards", async (request) => ({
    items: await listCards(database, await authenticated(request)),
  }));
  app.get("/v1/progression", async (request) =>
    getProgression(database, await authenticated(request)),
  );
  app.post("/v1/cards/:artistId/share", async (request, reply) => {
    const { artistId } = parse(shareParamsSchema, request.params);
    const share = await createShareCard(database, await authenticated(request), artistId);
    return reply.status(201).send(share);
  });
  app.get("/v1/shares/:token", async (request) => {
    const { token } = parse(publicShareParamsSchema, request.params);
    return getPublicShare(database, token);
  });

  app.get("/v1/artists", async (request) => {
    await authenticated(request);
    const result = await database.query<{
      id: string;
      slug: string;
      name: string;
      is_emerging: boolean;
      eligibility_status: string;
    }>(
      `
        SELECT id, slug, name, is_emerging, eligibility_status
        FROM artists WHERE eligibility_status = 'eligible' ORDER BY name
      `,
    );
    return {
      items: result.rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        isEmerging: row.is_emerging,
        eligibilityStatus: row.eligibility_status,
      })),
    };
  });

  app.addHook("onClose", async () => {
    if (!options?.database) await database.end();
  });
  return { app, database, config };
}
