// import "server-only";
import { z } from "zod";

const envSchema = z.object({
  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Application
  APP_ORIGIN: z.string().url(),

  // Database
  DATABASE_URL: z.string().min(1),
  TEST_DATABASE_URL: z.string().optional(),
  DB_SPATIAL_MODE: z.enum(["auto", "postgis", "haversine"]).default("auto"),

  // Secrets
  SESSION_SECRET: z.string().min(32),
  PIN_PEPPER: z.string().min(32),

  // JWT
  SESSION_ISSUER: z.string().default("pashuseva"),
  SESSION_AUDIENCE: z.string().default("pashuseva-web"),
  SESSION_DURATION: z.coerce.number().default(2592000), // 30 days

  // Security
  TRUST_PROXY_HOPS: z.coerce.number().default(0),

  // Rate limiting
  RATE_LIMIT_WINDOW_AUTH: z.coerce.number().default(900), // 15 minutes
  RATE_LIMIT_WINDOW_API: z.coerce.number().default(60), // 1 minute
  RATE_LIMIT_MAX_AUTH: z.coerce.number().default(5),
  RATE_LIMIT_MAX_API: z.coerce.number().default(100),

  // Demo seed (development only)
  ALLOW_DEMO_SEED: z
    .string()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  DEMO_FARMER_PIN: z.string().optional(),
  DEMO_VET_PIN: z.string().optional(),
  DEMO_PARAVET_PIN: z.string().optional(),

  // Web Push
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().url().default("mailto:admin@pashuseva.local"),
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("PashuSeva"),
  NEXT_PUBLIC_OSM_TILE_URL: z
    .string()
    .url()
    .default("https://tile.openstreetmap.org/{z}/{x}/{y}.png"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1),
});

function validateEnv() {
  const isServer = typeof window === "undefined";

  // Parse server environment
  const serverEnv = isServer
    ? envSchema.safeParse(process.env)
    : { success: true, data: {} as any, error: null };

  if (isServer && !serverEnv.success) {
    console.error("❌ Invalid server environment variables:");
    console.error(serverEnv.error?.flatten().fieldErrors);
    throw new Error("Invalid server environment configuration");
  }

  // Parse public environment
  const publicEnv = publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_OSM_TILE_URL: process.env.NEXT_PUBLIC_OSM_TILE_URL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  if (!publicEnv.success) {
    console.error("❌ Invalid public environment variables:");
    console.error(publicEnv.error.flatten().fieldErrors);
    throw new Error("Invalid public environment configuration");
  }

  // Additional validation
  if (serverEnv.data.NODE_ENV === "production") {
    if (serverEnv.data.ALLOW_DEMO_SEED) {
      throw new Error("ALLOW_DEMO_SEED must be false in production");
    }

    if (
      serverEnv.data.DATABASE_URL.includes("change_me") ||
      serverEnv.data.DATABASE_URL.includes("localhost")
    ) {
      console.warn(
        "⚠️  WARNING: DATABASE_URL appears to contain default or localhost credentials in production"
      );
    }
  }

  // Validate demo seed configuration
  if (serverEnv.data.ALLOW_DEMO_SEED) {
    if (
      !serverEnv.data.DEMO_FARMER_PIN ||
      !serverEnv.data.DEMO_VET_PIN ||
      !serverEnv.data.DEMO_PARAVET_PIN
    ) {
      throw new Error(
        "DEMO_FARMER_PIN, DEMO_VET_PIN, and DEMO_PARAVET_PIN are required when ALLOW_DEMO_SEED=true"
      );
    }

    const pins = [
      serverEnv.data.DEMO_FARMER_PIN,
      serverEnv.data.DEMO_VET_PIN,
      serverEnv.data.DEMO_PARAVET_PIN,
    ];

    for (const pin of pins) {
      if (!/^\d{4}$/.test(pin)) {
        throw new Error("Demo PINs must be exactly 4 digits");
      }
    }
  }

  return {
    server: serverEnv.data,
    public: publicEnv.data,
  };
}

// Validate and export
const env = validateEnv();

export const serverEnv = env.server;
export const publicEnv = env.public;

// Type exports for use across the application
export type ServerEnv = typeof serverEnv;
export type PublicEnv = typeof publicEnv;
