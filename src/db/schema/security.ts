import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Rate limit buckets table
 * PostgreSQL-backed throttling for authentication and API endpoints
 */
export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // SHA-256 hash of rate limit key (e.g., "auth:+919876543210")
    keyHash: text("key_hash").notNull().unique(),

    // Bucket window and count
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),

    // Expiry
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    // Last update
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    keyHashIdx: index("rate_limit_buckets_key_hash_idx").on(table.keyHash),
    expiresAtIdx: index("rate_limit_buckets_expires_at_idx").on(
      table.expiresAt
    ),
  })
);

/**
 * Audit logs table
 * Minimal security audit for sensitive operations
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Event details
    eventType: text("event_type").notNull(), // CREDENTIAL_VERIFIED, CREDENTIAL_REJECTED, PIN_RESET, SESSION_REVOKED, ACCOUNT_SUSPENDED
    eventCategory: text("event_category").notNull(), // AUTH, PROVIDER, SECURITY

    // Actor
    actorUserId: uuid("actor_user_id").references(() => users.id),
    actorReference: text("actor_reference"), // Operator identifier for CLI actions

    // Target
    targetUserId: uuid("target_user_id").references(() => users.id),
    resourceType: text("resource_type"), // USER, PROVIDER, SESSION
    resourceId: text("resource_id"),

    // Minimal metadata (no PINs, tokens, exact GPS, or full health records)
    metadata: text("metadata"), // JSON string, strictly minimized

    // Result
    success: text("success").notNull(), // "true" | "false"
    errorCode: text("error_code"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    actorUserIdIdx: index("audit_logs_actor_user_id_idx").on(
      table.actorUserId
    ),
    targetUserIdIdx: index("audit_logs_target_user_id_idx").on(
      table.targetUserId
    ),
    eventTypeIdx: index("audit_logs_event_type_idx").on(table.eventType),
    eventCategoryIdx: index("audit_logs_event_category_idx").on(
      table.eventCategory
    ),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  })
);

/**
 * Failed login attempts table (removed per Chunk 1 - covered by rate limiting)
 * Security monitoring happens through rate_limit_buckets and audit_logs
 */

// Type exports
export type RateLimitBucket = typeof rateLimitBuckets.$inferSelect;
export type NewRateLimitBucket = typeof rateLimitBuckets.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
