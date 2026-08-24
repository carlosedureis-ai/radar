import { createHash } from "node:crypto";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  DATABASE_PATH: z.string().default("./data/radar.sqlite"),
  CORS_ORIGINS: z.string().default("http://127.0.0.1:5173"),
  TRUST_PROXY_CIDRS: z.string().default(""),
  JWT_SECRET: z.string().min(32).optional(),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_REDIRECT_URI: z
    .string()
    .url()
    .default("http://127.0.0.1:3333/v1/music/spotify/callback"),
  APP_DEEP_LINK: z.string().default("radar://music-connected"),
});

export type AppConfig = {
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  databasePath: string;
  corsOrigins: string[];
  trustedProxies: string[];
  jwtSecret: Uint8Array;
  encryptionKey: Buffer;
  spotifyClientId?: string;
  spotifyRedirectUri: string;
  appDeepLink: string;
};

const developmentJwtSecret = "radar-development-secret-change-before-production";
const developmentEncryptionKey = createHash("sha256")
  .update("radar-development-encryption-key")
  .digest();

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const env = schema.parse(source);

  if (env.NODE_ENV === "production" && (!env.JWT_SECRET || !env.TOKEN_ENCRYPTION_KEY)) {
    throw new Error("JWT_SECRET and TOKEN_ENCRYPTION_KEY are required in production");
  }

  let encryptionKey = developmentEncryptionKey;
  if (env.TOKEN_ENCRYPTION_KEY) {
    encryptionKey = Buffer.from(env.TOKEN_ENCRYPTION_KEY, "base64");
    if (encryptionKey.length !== 32) {
      throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
    }
  }

  const spotifyClientId = env.SPOTIFY_CLIENT_ID?.trim();
  return {
    nodeEnv: env.NODE_ENV,
    host: env.HOST,
    port: env.PORT,
    databasePath: env.DATABASE_PATH,
    corsOrigins: env.CORS_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean),
    trustedProxies: env.TRUST_PROXY_CIDRS.split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    jwtSecret: new TextEncoder().encode(env.JWT_SECRET ?? developmentJwtSecret),
    encryptionKey,
    ...(spotifyClientId ? { spotifyClientId } : {}),
    spotifyRedirectUri: env.SPOTIFY_REDIRECT_URI,
    appDeepLink: env.APP_DEEP_LINK,
  };
}
