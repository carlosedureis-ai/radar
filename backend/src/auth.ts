import type { FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { z } from "zod";
import type { AppConfig } from "./config.js";
import type { Queryable } from "./db.js";
import { AppError } from "./errors.js";

export type AuthIdentity = {
  id: string;
  email: string | null;
  displayName: string;
};

export type TokenVerifier = (token: string) => Promise<AuthIdentity>;

export type PublicUser = {
  id: string;
  email: string | null;
  displayName: string;
  accountXp: number;
  accountLevel: number;
  createdAt: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string;
  account_xp: number;
  account_level: number;
  created_at: Date | string;
};

function metadataDisplayName(metadata: unknown, email: string | null): string {
  if (metadata && typeof metadata === "object") {
    const value = (metadata as Record<string, unknown>).display_name;
    if (typeof value === "string" && value.trim().length >= 2) return value.trim().slice(0, 60);
  }
  const emailPrefix = email?.split("@")[0]?.trim();
  return emailPrefix && emailPrefix.length >= 2 ? emailPrefix.slice(0, 60) : "Ouvinte Radar";
}

function toPublicUser(row: ProfileRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    accountXp: Number(row.account_xp),
    accountLevel: Number(row.account_level),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export function createSupabaseTokenVerifier(
  config: AppConfig,
  verificationKey?: JWTVerifyGetKey,
): TokenVerifier {
  const issuer = `${config.supabaseUrl}/auth/v1`;
  const jwks = verificationKey ?? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  return async (token: string): Promise<AuthIdentity> => {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience: "authenticated",
      });
      const id = z.uuid().parse(payload.sub);
      if (payload.role !== "authenticated") throw new Error("Unexpected role");
      const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : null;
      return {
        id,
        email,
        displayName: metadataDisplayName(payload.user_metadata, email),
      };
    } catch {
      throw new AppError(401, "INVALID_ACCESS_TOKEN", "Token de acesso inválido ou expirado");
    }
  };
}

export async function requireUser(
  request: FastifyRequest,
  verifyToken: TokenVerifier,
): Promise<AuthIdentity> {
  const authorization = request.headers.authorization;
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) throw new AppError(401, "AUTH_REQUIRED", "Autenticação necessária");
  return verifyToken(match[1]);
}

export async function ensureProfile(database: Queryable, identity: AuthIdentity): Promise<void> {
  await database.query(
    `
      INSERT INTO profiles(id, email, display_name)
      VALUES ($1, $2, $3)
      ON CONFLICT(id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, profiles.email),
        display_name = CASE
          WHEN profiles.display_name = '' THEN EXCLUDED.display_name
          ELSE profiles.display_name
        END
    `,
    [identity.id, identity.email, identity.displayName],
  );
}

export async function getUser(database: Queryable, userId: string): Promise<PublicUser> {
  const result = await database.query<ProfileRow>(
    `
      SELECT id, email, display_name, account_xp, account_level, created_at
      FROM profiles WHERE id = $1
    `,
    [userId],
  );
  const row = result.rows[0];
  if (!row) throw new AppError(404, "USER_NOT_FOUND", "Usuário não encontrado");
  return toPublicUser(row);
}
