import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function resetDb() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log("Dropping all tables...");
  const result = await client.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename != 'spatial_ref_sys';
  `);

  for (const row of result.rows) {
    console.log(`Dropping ${row.tablename}...`);
    await client.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE;`);
  }

  // Also drop types
  const typesResult = await client.query(`
    SELECT typname 
    FROM pg_type 
    JOIN pg_namespace ON pg_type.typnamespace = pg_namespace.oid 
    WHERE pg_namespace.nspname = 'public' AND typtype = 'e';
  `);
  for (const row of typesResult.rows) {
    console.log(`Dropping type ${row.typname}...`);
    await client.query(`DROP TYPE IF EXISTS "${row.typname}" CASCADE;`);
  }

  await client.end();
  console.log("Database reset complete.");
}

resetDb().catch(console.error);
