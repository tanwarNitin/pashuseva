import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { userRoleEnum, accountStatusEnum } from "./enums";

/**
 * Users table
 * Base authentication and account information for all user types
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Authentication
    phone: text("phone_e164").notNull().unique(), // E.164 format: +91XXXXXXXXXX
    pinHash: text("pin_hash").notNull(), // scrypt hash with salt

    // Profile
    name: text("name").notNull(),
    role: userRoleEnum("role").notNull(),
    preferredLocale: text("preferred_locale").notNull().default("en"), // 'en' or 'hi'

    // Account status
    status: accountStatusEnum("status").notNull().default("ACTIVE"),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }), // Never populated by ordinary Phone + PIN

    // Demo account marker
    isDemo: boolean("is_demo").notNull().default(false),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    phoneIdx: index("users_phone_idx").on(table.phone),
    roleIdx: index("users_role_idx").on(table.role),
    statusIdx: index("users_status_idx").on(table.status),
    isDemoIdx: index("users_is_demo_idx").on(table.isDemo),
  })
);

/**
 * Sessions table
 * JWT session state for revocation support
 * The JWT contains a high-entropy random session token. Store its SHA-256 hash.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // SHA-256 hash of session token (token stored in JWT)
    tokenHash: text("token_hash").notNull().unique(),

    // Session metadata
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
    tokenHashIdx: index("sessions_token_hash_idx").on(table.tokenHash),
    expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
  })
);

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
