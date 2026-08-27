import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  schemaFilter: ["public"],
  tablesFilter: ["users", "vet_profiles", "cattle_records", "emergency_requests"],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
