"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users, vetProfiles } from "@/db";
import { createSession, clearSession } from "@/lib/auth";

// ─── Validation Schemas ─────────────────────────────────────────────────────

const registerSchema = z.object({
  phone: z
    .string()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  pin: z
    .string()
    .regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  role: z.enum(["FARMER", "VET_DOCTOR", "PARAVET_WORKER"], {
    message: "Invalid role",
  }),
});

const loginSchema = z.object({
  phone: z
    .string()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  pin: z
    .string()
    .regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

// ─── Response Type ──────────────────────────────────────────────────────────

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

// ─── Register ───────────────────────────────────────────────────────────────

/**
 * Registers a new user with phone + PIN authentication.
 * On success, sets the session cookie and redirects to the role-based dashboard.
 */
export async function registerUser(
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    phone: formData.get("phone"),
    pin: formData.get("pin"),
    name: formData.get("name"),
    role: formData.get("role"),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validation failed",
    };
  }

  const { phone, pin, name, role } = parsed.data;

  // Check if phone already exists
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  if (existing.length > 0) {
    return {
      success: false,
      error: "This phone number is already registered",
    };
  }

  // Hash PIN with bcrypt
  const pinHash = await bcrypt.hash(pin, 10);

  // Create user
  const [newUser] = await db
    .insert(users)
    .values({ phone, name, role, pinHash })
    .returning({
      id: users.id,
      phone: users.phone,
      role: users.role,
      name: users.name,
    });

  // Set session cookie
  await createSession({
    userId: newUser.id,
    phone: newUser.phone,
    role: newUser.role,
    name: newUser.name,
  });

  // Redirect based on role — called outside try/catch per Next.js docs
  redirectToDashboard(newUser.role);
}

// ─── Login ──────────────────────────────────────────────────────────────────

/**
 * Authenticates a user with phone + PIN.
 * On success, sets the session cookie and redirects to the role-based dashboard.
 */
export async function loginWithPhonePin(
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    phone: formData.get("phone"),
    pin: formData.get("pin"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validation failed",
    };
  }

  const { phone, pin } = parsed.data;

  // Find user by phone
  const [user] = await db
    .select({
      id: users.id,
      phone: users.phone,
      name: users.name,
      role: users.role,
      pinHash: users.pinHash,
    })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  if (!user) {
    return {
      success: false,
      error: "Phone number not found. Please register first.",
    };
  }

  // Verify PIN
  const isValid = await bcrypt.compare(pin, user.pinHash);
  if (!isValid) {
    return {
      success: false,
      error: "Invalid PIN. Please try again.",
    };
  }

  // Set session cookie
  await createSession({
    userId: user.id,
    phone: user.phone,
    role: user.role,
    name: user.name,
  });

  // Redirect based on role — called outside try/catch per Next.js docs
  redirectToDashboard(user.role);
}

// ─── Logout ─────────────────────────────────────────────────────────────────

/**
 * Clears the session cookie and redirects to the login page.
 */
export async function logout(): Promise<void> {
  await clearSession();
  redirect("/login");
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function redirectToDashboard(role: string): never {
  switch (role) {
    case "FARMER":
      redirect("/farmer/dashboard");
    case "VET_DOCTOR":
    case "PARAVET_WORKER":
      redirect("/vet/dashboard");
    default:
      redirect("/");
  }
}
