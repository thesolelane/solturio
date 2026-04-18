/**
 * Phase 3: Standardized Error Responses
 * - Consistent error format across all endpoints
 * - HTTP status codes
 * - Error tracking
 */
import { env } from "./env";
import { getErrorMessage } from "./http-types";

export interface StandardError {
  success: false;
  error: string;
  code: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

export interface StandardSuccess<T> {
  success: true;
  data: T;
  timestamp: string;
  requestId?: string;
}

export class APIError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(code);
    this.name = "APIError";
  }
}

// Error code definitions
export const ERROR_CODES = {
  // Validation errors (400)
  INVALID_INPUT: { code: "INVALID_INPUT", status: 400 },
  MISSING_NONCE: { code: "MISSING_NONCE", status: 400 },
  INVALID_NONCE: { code: "INVALID_NONCE", status: 400 },
  EXPIRED_REQUEST: { code: "EXPIRED_REQUEST", status: 400 },

  // Authentication errors (401)
  UNAUTHORIZED: { code: "UNAUTHORIZED", status: 401 },
  INVALID_SESSION: { code: "INVALID_SESSION", status: 401 },

  // Authorization errors (403)
  FORBIDDEN: { code: "FORBIDDEN", status: 403 },
  INSUFFICIENT_PERMISSIONS: { code: "INSUFFICIENT_PERMISSIONS", status: 403 },

  // Resource errors (404)
  NOT_FOUND: { code: "NOT_FOUND", status: 404 },
  LOGO_NOT_FOUND: { code: "LOGO_NOT_FOUND", status: 404 },
  LICENSE_NOT_FOUND: { code: "LICENSE_NOT_FOUND", status: 404 },

  // Payment errors (402)
  PAYMENT_REQUIRED: { code: "PAYMENT_REQUIRED", status: 402 },
  PAYMENT_FAILED: { code: "PAYMENT_FAILED", status: 402 },
  INSUFFICIENT_BALANCE: { code: "INSUFFICIENT_BALANCE", status: 402 },

  // Conflict errors (409)
  DUPLICATE_REQUEST: { code: "DUPLICATE_REQUEST", status: 409 },
  NONCE_ALREADY_USED: { code: "NONCE_ALREADY_USED", status: 409 },
  WALLET_EXISTS: { code: "WALLET_EXISTS", status: 409 },

  // Server errors (500)
  INTERNAL_ERROR: { code: "INTERNAL_ERROR", status: 500 },
  DATABASE_ERROR: { code: "DATABASE_ERROR", status: 500 },
  BLOCKCHAIN_ERROR: { code: "BLOCKCHAIN_ERROR", status: 500 },
};

export function formatError(error: unknown, requestId?: string): StandardError {
  const now = new Date().toISOString();

  if (error instanceof APIError) {
    return {
      success: false,
      error: error.code,
      code: error.code,
      details: error.details,
      timestamp: now,
      requestId,
    };
  }

  return {
    success: false,
    error: getErrorMessage(error),
    code: "INTERNAL_ERROR",
    details: env.isDevelopment && error instanceof Error ? { stack: error.stack } : undefined,
    timestamp: now,
    requestId,
  };
}

export function formatSuccess<T>(data: T, requestId?: string): StandardSuccess<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId,
  };
}
