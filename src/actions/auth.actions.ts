
"use server";

import { registerUser, loginUser, logoutUser } from "@/services/auth.service";
import { requireSession } from "@/lib/auth/session";
import { success, error, type ActionResult } from "@/lib/result";
import { headers } from "next/headers";
import { isAppError } from "@/lib/errors";
import { z } from "zod";
import { toE164 } from "@/lib/phone";
import { checkAuthRateLimit } from "@/lib/rate-limit";

// Validation schemas
const registerSchema = z.object({
  phone: z.string().min(10).max(15),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  name: z.string().min(2).max(100),
  role: z.enum(["FARMER", "VET_DOCTOR", "PARAVET_WORKER"]),
  confirmPin: z.string(),
}).refine((data) => data.pin === data.confirmPin, {
  message: "PINs do not match",
  path: ["confirmPin"],
});

const loginSchema = z.object({
  phone: z.string().min(10).max(15),
  pin: z.string().regex(/^\d{4}$/),
});

/**
 * Register a new user
 */
export async function registerAction(
  formData: FormData
): Promise<ActionResult<{ userId: string; role: string }>> {
  try {
    // Parse and validate input
    const input = registerSchema.parse({
      phone: formData.get("phone"),
      pin: formData.get("pin"),
      name: formData.get("name"),
      role: formData.get("role"),
      confirmPin: formData.get("confirmPin"),
    });

    // Normalize phone to E.164
    const phone = toE164(input.phone as string);

    // Get headers for rate limiting
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    // Check rate limit for authentication attempts
    // await checkAuthRateLimit(phone, ipAddress, userAgent);

    const user = await registerUser({
      phone,
      pin: input.pin as string,
      name: input.name as string,
      role: input.role as "FARMER" | "VET_DOCTOR" | "PARAVET_WORKER",
    });

    // Auto-login the user
    await loginUser({ phone, pin: input.pin as string }, ipAddress, userAgent);

    return success({ userId: user.userId, role: user.role });
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, err.message);
    }

    if (err instanceof z.ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of err.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(issue.message);
      }
      return error("VALIDATION_ERROR", "errors.VALIDATION_ERROR", {
        fieldErrors,
      });
    }

    console.error("Registration error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}

/**
 * Login user
 */
export async function loginAction(
  formData: FormData
): Promise<ActionResult<{ userId: string; role: string }>> {
  try {
    const validated = loginSchema.parse({
      phone: formData.get("phone"),
      pin: formData.get("pin"),
    });

    // Normalize phone to E.164
    const phone = toE164(validated.phone);

    // Get headers for rate limiting
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    // Check rate limit for authentication attempts
    // await checkAuthRateLimit(phone, ipAddress, userAgent);

    const user = await loginUser({ phone, pin: validated.pin }, ipAddress, userAgent);

    return success(user);
  } catch (err) {
    if (isAppError(err)) {
      return error(err.code as any, `errors.${err.code}`);
    }

    if (err instanceof z.ZodError) {
      return error("VALIDATION_ERROR", "errors.VALIDATION_ERROR");
    }

    console.error("Login error:", err);
    return error("INTERNAL_ERROR", "errors.INTERNAL_ERROR");
  }
}

/**
 * Logout user
 */
export async function logoutAction(): Promise<ActionResult<void>> {
  try {
    const session = await requireSession();
    await logoutUser(session.sessionId);
    return success(undefined);
  } catch (err) {
    console.error("Logout error:", err);
    return success(undefined);
  }
}

/**
 * Get current user session
 */
export async function getCurrentUserAction(): Promise<
  ActionResult<{
    id: string;
    phone: string;
    name: string;
    role: string;
  } | null>
> {
  try {
    const session = await requireSession();

    return success({
      id: session.user.id,
      phone: session.user.phone,
      name: session.user.name,
      role: session.user.role,
    });
  } catch {
    return success(null);
  }
}
