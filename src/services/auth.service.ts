import "server-only";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPIN, verifyPIN, validatePINFormat } from "@/lib/auth/pin";
import {
  createSessionToken,
  hashToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/jwt";
import { checkAuthRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { toE164, isValidIndianPhone } from "@/lib/phone";
import { cookies } from "next/headers";
import {
  AuthenticationError,
  ValidationError,
  ConflictError,
} from "@/lib/errors";

export type RegisterInput = {
  phone: string;
  pin: string;
  name: string;
  role: "FARMER" | "VET_DOCTOR" | "PARAVET_WORKER" | "ADMIN";
};

export type LoginInput = {
  phone: string;
  pin: string;
};

/**
 * Register a new user
 */
export async function registerUser(
  input: RegisterInput,
  ipAddress?: string,
  userAgent?: string
): Promise<{ userId: string; role: string }> {
  // Validate phone
  if (!isValidIndianPhone(input.phone)) {
    throw new ValidationError("Invalid phone number");
  }

  const phone = toE164(input.phone);

  // Validate PIN
  if (!validatePINFormat(input.pin)) {
    throw new ValidationError("PIN must be exactly 4 digits");
  }

  // Validate name
  if (!input.name || input.name.trim().length < 2) {
    throw new ValidationError("Name must be at least 2 characters");
  }

  // Check rate limit
  await checkAuthRateLimit(phone, ipAddress, userAgent);

  // Check if user already exists
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  if (existingUser) {
    throw new ConflictError("Phone number already registered");
  }

  // Hash PIN
  const pinHash = await hashPIN(input.pin);

  // Create user
  const [user] = await db
    .insert(users)
    .values({
      phone,
      pinHash,
      name: input.name.trim(),
      role: input.role,
      status: "ACTIVE",
    })
    .returning({ id: users.id, role: users.role });

  // Reset rate limit on successful registration
  await resetRateLimit(`auth:${phone}`);

  return { userId: user.id, role: user.role };
}

/**
 * Login user
 */
export async function loginUser(
  input: LoginInput,
  ipAddress?: string,
  userAgent?: string
): Promise<{ userId: string; role: string }> {
  // Validate phone
  if (!isValidIndianPhone(input.phone)) {
    throw new AuthenticationError("Invalid phone number or PIN");
  }

  const phone = toE164(input.phone);

  // Check rate limit
  await checkAuthRateLimit(phone, ipAddress, userAgent);

  // Get user
  const [user] = await db
    .select({
      id: users.id,
      pinHash: users.pinHash,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  if (!user) {
    throw new AuthenticationError("Invalid phone number or PIN");
  }

  // Check account status
  if (user.status !== "ACTIVE") {
    throw new AuthenticationError("Account is not active");
  }

  // Verify PIN
  const pinValid = await verifyPIN(input.pin, user.pinHash);

  if (!pinValid) {
    throw new AuthenticationError("Invalid phone number or PIN");
  }

  // Create session token
  const { token, tokenHash, expiresAt } = await createSessionToken({
    userId: user.id,
    role: user.role,
  });

  // Store session in database
  await db.insert(sessions).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  // Set session cookie
  const cookieStore = await cookies();
  const maxAge = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

  cookieStore.set(
    SESSION_COOKIE_NAME,
    token,
    getSessionCookieOptions(maxAge)
  );

  // Reset rate limit on successful login
  await resetRateLimit(`auth:${phone}`);

  return {
    userId: user.id,
    role: user.role,
  };
}

/**
 * Logout user
 */
export async function logoutUser(sessionId: string): Promise<void> {
  // Revoke session in database
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, sessionId));

  // Clear session cookie
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.userId, userId));
}
