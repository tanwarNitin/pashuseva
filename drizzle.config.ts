import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

// Load environment variables from .env.local
const projectDir = process.cwd();
loadEnvConfig(projectDir);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
  // Do not use push mode - always generate and run migrations
  // This ensures portable, version-controlled migrations
});
