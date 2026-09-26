import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { serverEnv } from "@/lib/env";
import { createHash } from "crypto";

// JWT configuration
const JWT_ALGORITHM = "HS256";
const SECRET = new TextEncoder().encode(serverEnv.SESSION_SECRET);

export type SessionPayload = {
  userId: string;
  role: "FARMER" | "VET_DOCTOR" | "PARAVET_WORKER" | "ADMIN";
};

/**
 * Compute SHA-256 hash of a token for storage (matching sessions.tokenHash)
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Create a JWT session token
 */
export async function createSessionToken(
  payload: SessionPayload
): Promise<{ token: string; tokenHash: string; expiresAt: Date }> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((now + serverEnv.SESSION_DURATION) * 1000);

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt(now)
    .setExpirationTime(now + serverEnv.SESSION_DURATION)
    .setIssuer(serverEnv.SESSION_ISSUER)
    .setAudience(serverEnv.SESSION_AUDIENCE)
    .sign(SECRET);

  const tokenHash = hashToken(token);

  return { token, tokenHash, expiresAt };
}

/**
 * Verify and decode a JWT session token
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: serverEnv.SESSION_ISSUER,
      audience: serverEnv.SESSION_AUDIENCE,
    });

    // Extract and validate payload
    const { userId, role } = payload as unknown as SessionPayload;

    if (!userId || !role) {
      return null;
    }

    return { userId, role };
  } catch {
    return null;
  }
}

/**
 * Get session cookie options
 */
export function getSessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: serverEnv.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Session cookie name
 */
export const SESSION_COOKIE_NAME = "session";
