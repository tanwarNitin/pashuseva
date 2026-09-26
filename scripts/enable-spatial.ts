import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function enableSpatial() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }

  console.log("🗺️  Setting up PostGIS spatial extensions...\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Read spatial setup SQL
    const sqlPath = resolve(projectDir, "sql/spatial/001_provider_geography.sql");
    const sql = readFileSync(sqlPath, "utf-8");

    // Execute spatial setup
    await pool.query(sql);

    console.log("\n✅ PostGIS setup completed successfully!");
    console.log("\n📍 Spatial features enabled:");
    console.log("   - Geography columns added to location tables");
    console.log("   - GiST spatial indexes created");
    console.log("   - ST_DWithin queries now available for fast proximity search");
    console.log("\n💡 Discovery will automatically use PostGIS when available");
    console.log("   Set DB_SPATIAL_MODE=postgis to require PostGIS");
    console.log("   Set DB_SPATIAL_MODE=haversine to force SQL fallback\n");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("extension \"postgis\" already exists")) {
      console.log("✅ PostGIS extension already enabled");
    } else if (message.includes("column") && message.includes("already exists")) {
      console.log("✅ Spatial columns already exist");
    } else {
      console.error("\n❌ PostGIS setup failed:");
      console.error(message);
      console.error("\n⚠️  PostGIS may not be available in your PostgreSQL installation");
      console.error("   The application will fall back to Haversine distance calculations");
      console.error("\n💡 To install PostGIS:");
      console.error("   - Using Docker: use postgis/postgis image (already configured)");
      console.error("   - Using native PostgreSQL: install postgis extension package\n");
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

enableSpatial();
