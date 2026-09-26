// Common result type for Server Actions and services
export type ActionResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      code:
        | "VALIDATION_ERROR"
        | "UNAUTHENTICATED"
        | "FORBIDDEN"
        | "RATE_LIMITED"
        | "NOT_FOUND"
        | "CONFLICT"
        | "PROVIDER_UNAVAILABLE"
        | "NO_PROVIDERS_FOUND"
        | "INTERNAL_ERROR";
      messageKey: string;
      fieldErrors?: Record<string, string[]>;
      retryAfterSeconds?: number;
    };

// Helper to create success results
export function success<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

// Helper to create error results
export function error<T = never>(
  code: "VALIDATION_ERROR" | "UNAUTHENTICATED" | "FORBIDDEN" | "RATE_LIMITED" | "NOT_FOUND" | "CONFLICT" | "PROVIDER_UNAVAILABLE" | "NO_PROVIDERS_FOUND" | "INTERNAL_ERROR",
  messageKey: string,
  options?: {
    fieldErrors?: Record<string, string[]>;
    retryAfterSeconds?: number;
  }
): ActionResult<T> {
  return {
    ok: false,
    code,
    messageKey,
    ...options,
  };
}
