import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

export type Queryable = {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
};

export type DatabasePool = Queryable & {
  connect(): Promise<PoolClient>;
  end(): Promise<void>;
};

export function createDatabase(options: {
  databaseUrl: string;
  ssl: boolean;
}): DatabasePool {
  return new Pool({
    connectionString: options.databaseUrl,
    ssl: options.ssl ? { rejectUnauthorized: true } : false,
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: true,
  });
}

export async function inTransaction<T>(
  database: DatabasePool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; constraint?: unknown; message?: unknown };
  if (candidate.code !== "23505" && !String(candidate.message ?? "").includes("duplicate key")) {
    return false;
  }
  return constraint ? candidate.constraint === constraint : true;
}
