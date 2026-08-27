import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
      "Please add it to your .env.local file."
  );
}

/**
 * postgres.js client — connection pooling is handled automatically.
 * Uses `prepare: false` for compatibility with Supabase/Neon pooled connections.
 */
const client = postgres(process.env.DATABASE_URL, { prepare: false });

/**
 * Drizzle ORM database instance with full schema awareness.
 * Usage: `import { db } from "@/db"`
 */
export const db = drizzle(client, { schema });

// Re-export all schema tables and types for convenience
export * from "./schema";
