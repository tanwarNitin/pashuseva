// import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { serverEnv } from "@/lib/env";

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: serverEnv.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Create Drizzle database instance
export const db = drizzle(pool, { schema });

// Export pool for scripts that need it
export { pool };

// Graceful shutdown
if (typeof process !== "undefined") {
  process.on("SIGTERM", async () => {
    await pool.end();
  });

  process.on("SIGINT", async () => {
    await pool.end();
  });
}

// Export types
export type Database = typeof db;
