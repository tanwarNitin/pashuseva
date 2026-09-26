// Application error classes with stable codes for translation

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string[]>
  ) {
    super("VALIDATION_ERROR", message, 400);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super("UNAUTHENTICATED", message, 401);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super("FORBIDDEN", message, 403);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super("NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string = "Too many requests",
    public retryAfterSeconds?: number
  ) {
    super("RATE_LIMITED", message, 429);
    this.name = "RateLimitError";
  }
}

// Helper to check if an error is an AppError
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

// Safe error message extraction (never expose raw SQL errors or stack traces)
export function getSafeErrorMessage(error: any): string {
  if (isAppError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    // Log the full error for debugging but return generic message
    console.error("Unexpected error:", error);
    return "An unexpected error occurred";
  }

  console.error("Unknown error type:", error);
  return "An unexpected error occurred";
}

// Convert errors to stable message keys for i18n
export function getErrorMessageKey(error: any): string {
  if (isAppError(error)) {
    return `errors.${error.code}`;
  }
  return "errors.INTERNAL_ERROR";
}
