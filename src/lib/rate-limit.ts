import "server-only";
import { db } from "@/db";
import { rateLimitBuckets } from "@/db/schema";
import { eq, lt, and, sql } from "drizzle-orm";
import { RateLimitError } from "@/lib/errors";
import { serverEnv } from "@/lib/env";
import { createHash } from "crypto";

export type RateLimitConfig = {
  windowSeconds: number;
  maxAttempts: number;
};

/**
 * Hash a rate limit key for storage
 */
function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Check rate limit for a given key
 * Returns true if allowed, throws RateLimitError if exceeded
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);
  const keyHash = hashKey(key);
  const expiresAt = new Date(now.getTime() + config.windowSeconds * 2 * 1000);

  // Get or create rate limit record atomically using ON CONFLICT DO UPDATE
  const [record] = await db
    .insert(rateLimitBuckets)
    .values({
      keyHash,
      count: 1,
      windowStart: now,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: rateLimitBuckets.keyHash,
      set: {
        // If window has expired, reset count to 1, else increment
        count: sql`CASE WHEN ${rateLimitBuckets.windowStart} < ${windowStart.toISOString()} THEN 1 ELSE ${rateLimitBuckets.count} + 1 END`,
        windowStart: sql`CASE WHEN ${rateLimitBuckets.windowStart} < ${windowStart.toISOString()} THEN ${now.toISOString()} ELSE ${rateLimitBuckets.windowStart} END`,
        expiresAt: expiresAt,
        updatedAt: now,
      },
    })
    .returning();

  if (record.count > config.maxAttempts) {
    // Rate limit exceeded
    const retryAfterSeconds = Math.ceil(
      (record.windowStart.getTime() + config.windowSeconds * 1000 - now.getTime()) / 1000
    );

    throw new RateLimitError(
      "Too many attempts. Please try again later.",
      Math.max(1, retryAfterSeconds)
    );
  }
}

/**
 * Reset rate limit for a key
 */
export async function resetRateLimit(key: string): Promise<void> {
  const keyHash = hashKey(key);
  await db.delete(rateLimitBuckets).where(eq(rateLimitBuckets.keyHash, keyHash));
}

/**
 * Clean up expired rate limit records (run periodically)
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  const result = await db
    .delete(rateLimitBuckets)
    .where(lt(rateLimitBuckets.expiresAt, new Date()));

  return result.rowCount || 0;
}

/**
 * Rate limit for authentication attempts
 */
export async function checkAuthRateLimit(
  phone: string,
  ipAddress?: string,
  userAgent?: string // Not used for keys to prevent bypass
): Promise<void> {
  // Check phone bucket
  await checkRateLimit(`auth:${phone}`, {
    windowSeconds: serverEnv.RATE_LIMIT_WINDOW_AUTH,
    maxAttempts: serverEnv.RATE_LIMIT_MAX_AUTH,
  });

  // Check IP bucket separately so changing UA/IP doesn't bypass phone limits
  if (ipAddress) {
    await checkRateLimit(`auth_ip:${ipAddress}`, {
      windowSeconds: serverEnv.RATE_LIMIT_WINDOW_AUTH,
      maxAttempts: serverEnv.RATE_LIMIT_MAX_AUTH * 5,
    });
  }
}

/**
 * Rate limit for API requests
 */
export async function checkApiRateLimit(userId: string): Promise<void> {
  return checkRateLimit(`api:${userId}`, {
    windowSeconds: serverEnv.RATE_LIMIT_WINDOW_API,
    maxAttempts: serverEnv.RATE_LIMIT_MAX_API,
  });
}
