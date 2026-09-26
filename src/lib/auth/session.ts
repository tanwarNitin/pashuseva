import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import {
  verifySessionToken,
  hashToken,
  SESSION_COOKIE_NAME,
} from "./jwt";
import { AuthenticationError } from "@/lib/errors";

export type AuthUser = {
  id: string;
  phone: string;
  name: string;
  role: "FARMER" | "VET_DOCTOR" | "PARAVET_WORKER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
};

/**
 * Get current session from cookie and verify it
 * Cached per request to avoid multiple database queries
 */
export const getCurrentSession = cache(
  async (): Promise<{ user: AuthUser; sessionId: string } | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    // Verify JWT
    const payload = await verifySessionToken(token);

    if (!payload) {
      return null;
    }

    // Verify session exists in database and is not revoked or expired
    const tokenHash = hashToken(token);
    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          eq(sessions.userId, payload.userId),
          gt(sessions.expiresAt, new Date()),
          isNull(sessions.revokedAt)
        )
      )
      .limit(1);

    if (!session) {
      return null;
    }

    // Get fresh user data from database (authoritative source for role and status)
    const [user] = await db
      .select({
        id: users.id,
        phone: users.phone,
        name: users.name,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      return null;
    }

    // Check account status
    if (user.status !== "ACTIVE") {
      return null;
    }

    return {
      user: user as AuthUser,
      sessionId: session.id,
    };
  }
);

/**
 * Get current session or throw authentication error
 */
export async function requireSession(): Promise<{
  user: AuthUser;
  sessionId: string;
}> {
  const session = await getCurrentSession();

  if (!session) {
    throw new AuthenticationError();
  }

  return session;
}

/**
 * Require specific role(s)
 */
export async function requireRole(
  ...roles: Array<"FARMER" | "VET_DOCTOR" | "PARAVET_WORKER" | "ADMIN">
): Promise<{ user: AuthUser; sessionId: string }> {
  const session = await requireSession();

  if (!roles.includes(session.user.role)) {
    throw new AuthenticationError("Insufficient permissions");
  }

  return session;
}

/**
 * Check if user is a provider (vet or paravet)
 */
export async function requireProvider(): Promise<{
  user: AuthUser;
  sessionId: string;
}> {
  return requireRole("VET_DOCTOR", "PARAVET_WORKER");
}

/**
 * Check if user is a farmer
 */
export async function requireFarmer(): Promise<{
  user: AuthUser;
  sessionId: string;
}> {
  return requireRole("FARMER");
}

/**
 * Check if user is an admin
 */
export async function requireAdmin(): Promise<{
  user: AuthUser;
  sessionId: string;
}> {
  return requireRole("ADMIN");
}
