import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig } from "../config.js";
import { createDatabase } from "../db.js";

const config = loadConfig();
if (config.nodeEnv === "production") throw new Error("db:reset is disabled in production");
if (config.databasePath === ":memory:") throw new Error("Nothing to reset for an in-memory database");

const databasePath = resolve(config.databasePath);
for (const suffix of ["", "-shm", "-wal"]) {
  const target = `${databasePath}${suffix}`;
  if (existsSync(target)) rmSync(target);
}
const database = createDatabase(databasePath);
database.close();
console.log(`Database reset: ${databasePath}`);
