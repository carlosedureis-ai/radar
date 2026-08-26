import { loadConfig } from "../config.js";
import { createDatabase } from "../db.js";

const config = loadConfig();
const database = createDatabase({ databaseUrl: config.databaseUrl, ssl: config.databaseSsl });
try {
  const result = await database.query<{ database_name: string; checked_at: Date | string }>(
    "SELECT current_database() AS database_name, now() AS checked_at",
  );
  const row = result.rows[0];
  const checkedAt = row?.checked_at ? new Date(row.checked_at).toISOString() : "unknown";
  console.log(`Database connected: ${row?.database_name ?? "unknown"} at ${checkedAt}`);
} finally {
  await database.end();
}
