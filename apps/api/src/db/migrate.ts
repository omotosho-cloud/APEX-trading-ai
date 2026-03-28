import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigration(url: string, file: string, label: string) {
  const sql = postgres(url, { max: 1, connect_timeout: 10 });
  const migration = readFileSync(join(__dirname, "migrations", file), "utf-8");
  console.log(`Running ${label} migration...`);
  await sql.unsafe(migration);
  await sql.end();
  console.log(`${label} migration complete.`);
}

async function migrate() {
  const pgUrl = process.env.DATABASE_URL;
  if (!pgUrl) throw new Error("DATABASE_URL is required");

  // On Supabase free tier, both candles and app tables go to the same PostgreSQL DB.
  // TimescaleDB extension is not available on Supabase free tier —
  // candles table is created as a regular partitioned table instead.
  await runMigration(pgUrl, "0001_timescale.sql", "Candles (TimescaleDB-compatible)");
  await runMigration(pgUrl, "0002_postgres.sql", "PostgreSQL app tables");

  console.log("All migrations complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
