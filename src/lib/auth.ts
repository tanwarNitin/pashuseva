import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// ─── Constants ──────────────────────────────────────────────────────────────

const COOKIE_NAME = "pashu_session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Session payload stored inside the JWT.
 */
export interface SessionPayload {
  userId: string;
  phone: string;
  role: "FARMER" | "VET_DOCTOR" | "PARAVET_WORKER";
  name: string;
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is not set. " +
        "Please add it to your .env.local file."
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Signs a JWT containing the session payload.
 */
async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

/**
 * Verifies a JWT and returns the decoded session payload.
 * Returns `null` if the token is invalid or expired.
 */
async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Creates an authenticated session by signing a JWT and setting it
 * as an HTTP-only cookie. Call this after successful login/register.
 */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signToken(payload);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

/**
 * Clears the session cookie (logout).
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Reads the session cookie and verifies the JWT.
 * Returns the active session payload, or `null` if unauthenticated.
 *
 * Safe to call from Server Components, Server Actions, and Route Handlers.
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  return verifyToken(sessionCookie.value);
}
