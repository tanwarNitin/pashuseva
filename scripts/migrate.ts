import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/db";
import { pool } from "@/db";

async function runMigrations() {
  console.log("🔄 Running database migrations...");

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await pool.end().catch(() => {});
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));