import { randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { jwtVerify, SignJWT } from "jose";
import type { AppConfig } from "./config.js";
import type { SqliteDatabase } from "./db.js";
import { inTransaction } from "./db.js";
import { AppError } from "./errors.js";
import { hashPassword, hashToken, randomToken, verifyPassword } from "./security.js";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ISSUER = "radar-api";
const AUDIENCE = "radar-app";

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  password_salt: string;
  account_xp: number;
  account_level: number;
  created_at: string;
};

type SessionRow = {
  id: string;
  user_id: string;
  expires_at: string;
  revoked_at: string | null;
};

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  accountXp: number;
  accountLevel: number;
  createdAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

function publicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    accountXp: user.account_xp,
    accountLevel: user.account_level,
    createdAt: user.created_at,
  };
}

async function accessToken(userId: string, config: AppConfig): Promise<string> {
  return new SignJWT({ scope: "user" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(config.jwtSecret);
}

async function createSession(
  database: SqliteDatabase,
  config: AppConfig,
  userId: string,
): Promise<AuthTokens> {
  const refreshToken = randomToken();
  const now = new Date();
  database
    .prepare(`
      INSERT INTO refresh_sessions(id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(
      randomUUID(),
      userId,
      hashToken(refreshToken),
      new Date(now.getTime() + REFRESH_TOKEN_TTL_MS).toISOString(),
      now.toISOString(),
    );
  return {
    accessToken: await accessToken(userId, config),
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

export async function registerUser(
  database: SqliteDatabase,
  config: AppConfig,
  input: { email: string; displayName: string; password: string },
): Promise<{ user: PublicUser; tokens: AuthTokens }> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = database.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) throw new AppError(409, "EMAIL_IN_USE", "Este e-mail já está cadastrado");

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const password = hashPassword(input.password);
  database
    .prepare(`
      INSERT INTO users(id, email, display_name, password_hash, password_salt, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(id, normalizedEmail, input.displayName.trim(), password.hash, password.salt, createdAt);

  const user = getUser(database, id);
  return { user, tokens: await createSession(database, config, id) };
}

export async function loginUser(
  database: SqliteDatabase,
  config: AppConfig,
  input: { email: string; password: string },
): Promise<{ user: PublicUser; tokens: AuthTokens }> {
  const row = database
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(input.email.trim().toLowerCase()) as UserRow | undefined;
  if (!row || !verifyPassword(input.password, row.password_salt, row.password_hash)) {
    throw new AppError(401, "INVALID_CREDENTIALS", "E-mail ou senha inválidos");
  }
  return { user: publicUser(row), tokens: await createSession(database, config, row.id) };
}

export async function rotateRefreshToken(
  database: SqliteDatabase,
  config: AppConfig,
  refreshToken: string,
): Promise<AuthTokens> {
  const tokenHash = hashToken(refreshToken);
  const session = database
    .prepare(`
      SELECT id, user_id, expires_at, revoked_at
      FROM refresh_sessions WHERE token_hash = ?
    `)
    .get(tokenHash) as SessionRow | undefined;
  if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Sessão inválida ou expirada");
  }

  database.prepare("UPDATE refresh_sessions SET revoked_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    session.id,
  );
  return createSession(database, config, session.user_id);
}

export function revokeRefreshToken(database: SqliteDatabase, refreshToken: string): void {
  database
    .prepare("UPDATE refresh_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
    .run(new Date().toISOString(), hashToken(refreshToken));
}

export async function verifyAccessToken(token: string, config: AppConfig): Promise<string> {
  try {
    const verified = await jwtVerify(token, config.jwtSecret, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    if (!verified.payload.sub) throw new Error("Missing subject");
    return verified.payload.sub;
  } catch {
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "Token de acesso inválido ou expirado");
  }
}

export async function requireUser(request: FastifyRequest, config: AppConfig): Promise<string> {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    throw new AppError(401, "AUTH_REQUIRED", "Autenticação necessária");
  }
  return verifyAccessToken(authorization.slice(7), config);
}

export function getUser(database: SqliteDatabase, userId: string): PublicUser {
  const row = database.prepare("SELECT * FROM users WHERE id = ?").get(userId) as
    | UserRow
    | undefined;
  if (!row) throw new AppError(404, "USER_NOT_FOUND", "Usuário não encontrado");
  return publicUser(row);
}

export function revokeAllSessions(database: SqliteDatabase, userId: string): void {
  inTransaction(database, () => {
    database
      .prepare("UPDATE refresh_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
      .run(new Date().toISOString(), userId);
  });
}
