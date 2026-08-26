import { createHash } from "node:crypto";
import { z } from "zod";

const optionalEnvironmentValue = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional(),
);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  DATABASE_URL: optionalEnvironmentValue,
  DATABASE_SSL: z.enum(["true", "false"]).default("true"),
  CORS_ORIGINS: z.string().default("http://127.0.0.1:5174"),
  TRUST_PROXY_CIDRS: z.string().default(""),
  SUPABASE_URL: z.string().url().default("https://fxhvbmidhgdmrdyrywqw.supabase.co"),
  TOKEN_ENCRYPTION_KEY: optionalEnvironmentValue,
  SPOTIFY_CLIENT_ID: optionalEnvironmentValue,
  SPOTIFY_REDIRECT_URI: z
    .string()
    .url()
    .default("http://127.0.0.1:3333/v1/music/spotify/callback"),
  APP_DEEP_LINK: z.string().default("http://127.0.0.1:5174/conexoes"),
});

export type AppConfig = {
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  databaseUrl: string;
  databaseSsl: boolean;
  corsOrigins: string[];
  trustedProxies: string[];
  supabaseUrl: string;
  encryptionKey: Buffer;
  spotifyClientId?: string;
  spotifyRedirectUri: string;
  appDeepLink: string;
};

const developmentEncryptionKey = createHash("sha256")
  .update("radar-development-encryption-key")
  .digest();

function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host.toLowerCase() === "localhost";
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const env = schema.parse(source);
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required; use the Supabase connection string");
  }
  if (env.NODE_ENV === "production" && !env.TOKEN_ENCRYPTION_KEY) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required in production");
  }
  if (!isLoopbackHost(env.HOST) && !env.TOKEN_ENCRYPTION_KEY) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required when HOST is not loopback");
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
    databaseUrl: env.DATABASE_URL,
    databaseSsl: env.DATABASE_SSL === "true",
    corsOrigins: env.CORS_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean),
    trustedProxies: env.TRUST_PROXY_CIDRS.split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    supabaseUrl: env.SUPABASE_URL.replace(/\/$/, ""),
    encryptionKey,
    ...(spotifyClientId ? { spotifyClientId } : {}),
    spotifyRedirectUri: env.SPOTIFY_REDIRECT_URI,
    appDeepLink: env.APP_DEEP_LINK,
  };
}
