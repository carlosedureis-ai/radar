import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import {
  getUser,
  loginUser,
  registerUser,
  requireUser,
  revokeRefreshToken,
  rotateRefreshToken,
} from "./auth.js";
import { loadConfig, type AppConfig } from "./config.js";
import { createDatabase, type SqliteDatabase } from "./db.js";
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

const registerSchema = z.object({
  email: z.email().max(254),
  displayName: z.string().trim().min(2).max(60),
  password: z
    .string()
    .min(12)
    .max(128)
    .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
      message: "A senha precisa conter letras e números",
    }),
});
const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(1).max(128) });
const refreshSchema = z.object({ refreshToken: z.string().min(20).max(256) });
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

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  return schema.parse(value);
}

function errorBody(code: string, message: string, requestId: string): unknown {
  return { error: { code, message, requestId } };
}

export type RadarBackend = {
  app: FastifyInstance;
  database: SqliteDatabase;
  config: AppConfig;
};

export async function createApp(options?: {
  config?: AppConfig;
  database?: SqliteDatabase;
}): Promise<RadarBackend> {
  const config = options?.config ?? loadConfig();
  const database = options?.database ?? createDatabase(config.databasePath);
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

  const authenticated = async (request: FastifyRequest): Promise<string> =>
    requireUser(request, config);

  app.get("/health", async () => ({ status: "ok", service: "radar-backend", version: "0.1.0" }));

  app.post(
    "/v1/auth/register",
    { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const result = await registerUser(database, config, parse(registerSchema, request.body));
      return reply.status(201).send(result);
    },
  );
  app.post(
    "/v1/auth/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request) => loginUser(database, config, parse(loginSchema, request.body)),
  );
  app.post(
    "/v1/auth/refresh",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request) => {
      const body = parse(refreshSchema, request.body);
      return { tokens: await rotateRefreshToken(database, config, body.refreshToken) };
    },
  );
  app.post("/v1/auth/logout", async (request, reply) => {
    const body = parse(refreshSchema, request.body);
    revokeRefreshToken(database, body.refreshToken);
    return reply.status(204).send();
  });

  app.get("/v1/me", async (request) => getUser(database, await authenticated(request)));

  app.get("/v1/music/connections", async (request) => ({
    items: listConnections(database, await authenticated(request)),
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
    disconnectProvider(database, await authenticated(request), provider);
    return reply.status(204).send();
  });

  app.get("/v1/listens", async (request) => {
    const userId = await authenticated(request);
    const query = parse(listenQuerySchema, request.query);
    const before = query.before ?? new Date(Date.now() + 60_000).toISOString();
    const items = database
      .prepare(`
        SELECT e.id, e.provider, e.provider_track_id AS providerTrackId,
               e.played_at AS playedAt, e.qualified, e.xp_awarded AS xpAwarded,
               e.rejection_reason AS rejectionReason, a.id AS artistId, a.name AS artistName
        FROM listening_events e LEFT JOIN artists a ON a.id = e.artist_id
        WHERE e.user_id = ? AND e.played_at < ?
        ORDER BY e.played_at DESC LIMIT ?
      `)
      .all(userId, before, query.limit)
      .map((row) => ({ ...row, qualified: Boolean((row as { qualified: number }).qualified) }));
    return { items, nextBefore: (items.at(-1) as { playedAt?: string } | undefined)?.playedAt ?? null };
  });

  app.get("/v1/cards", async (request) => ({
    items: listCards(database, await authenticated(request)),
  }));
  app.get("/v1/progression", async (request) =>
    getProgression(database, await authenticated(request)),
  );
  app.post("/v1/cards/:artistId/share", async (request, reply) => {
    const { artistId } = parse(shareParamsSchema, request.params);
    const share = createShareCard(database, await authenticated(request), artistId);
    return reply.status(201).send(share);
  });
  app.get("/v1/shares/:token", async (request) => {
    const { token } = parse(publicShareParamsSchema, request.params);
    return getPublicShare(database, token);
  });

  app.get("/v1/artists", async (request) => {
    await authenticated(request);
    const items = database
      .prepare(`
        SELECT id, slug, name, is_emerging AS isEmerging, eligibility_status AS eligibilityStatus
        FROM artists WHERE eligibility_status = 'eligible' ORDER BY name
      `)
      .all()
      .map((row) => ({ ...row, isEmerging: Boolean((row as { isEmerging: number }).isEmerging) }));
    return { items };
  });

  app.addHook("onClose", async () => {
    if (!options?.database) database.close();
  });
  return { app, database, config };
}
