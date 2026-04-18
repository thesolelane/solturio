/**
 * Smart Contract API Client
 * Secure communication between App and SC Replit
 * - Request signing with HMAC-SHA256
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 */

import crypto from "crypto";
import { auditLogger } from "./audit-logger";
import { env } from "./env";

const SC_API_URL = env.scApiUrl || "";
const SC_API_SECRET = env.scApiSecret || "";

interface SCRequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: Record<string, any>;
  userId?: string;
  requestId?: string;
}

interface SCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
};

const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function generateSignature(body: string, timestamp: number): string {
  const message = `${timestamp}:${body}`;
  return crypto.createHmac("sha256", SC_API_SECRET).update(message).digest("hex");
}

function shouldRetry(attempt: number, statusCode: number): boolean {
  if (attempt >= MAX_RETRIES) return false;
  return statusCode >= 500 || statusCode === 408 || statusCode === 429;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkCircuitBreaker(): boolean {
  if (!circuitBreaker.isOpen) return true;

  const now = Date.now();
  if (now - circuitBreaker.lastFailure > CIRCUIT_RESET_MS) {
    circuitBreaker.isOpen = false;
    circuitBreaker.failures = 0;
    console.log("[SC-CLIENT] Circuit breaker reset - attempting reconnection");
    return true;
  }

  return false;
}

function recordFailure(): void {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();

  if (circuitBreaker.failures >= CIRCUIT_THRESHOLD) {
    circuitBreaker.isOpen = true;
    console.warn(`[SC-CLIENT] Circuit breaker OPEN after ${circuitBreaker.failures} failures`);
  }
}

function recordSuccess(): void {
  circuitBreaker.failures = 0;
  circuitBreaker.isOpen = false;
}

export async function scRequest<T = any>(options: SCRequestOptions): Promise<SCResponse<T>> {
  const { method, path, body, userId, requestId } = options;
  const reqId = requestId || `sc_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  if (!SC_API_URL) {
    console.warn("[SC-CLIENT] SC_API_URL not configured - using mock mode");
    return {
      success: false,
      error: "SC_API_URL not configured",
      statusCode: 503,
    };
  }

  if (!SC_API_SECRET) {
    console.error("[SC-CLIENT] SC_API_SECRET not configured - rejecting request");
    return {
      success: false,
      error: "SC_API_SECRET not configured - cannot sign requests",
      statusCode: 503,
    };
  }

  if (!checkCircuitBreaker()) {
    auditLogger.log({
      action: "SC_CIRCUIT_OPEN",
      endpoint: path,
      method,
      statusCode: 503,
      requestId: reqId,
      userId,
      details: { message: "Circuit breaker is open" },
    });

    return {
      success: false,
      error: "Smart contract service temporarily unavailable",
      statusCode: 503,
    };
  }

  const timestamp = Date.now();
  const bodyString = body ? JSON.stringify(body) : "";
  const signature = generateSignature(bodyString, timestamp);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Solturio-Timestamp": timestamp.toString(),
    "X-Solturio-Signature": signature,
    "X-Solturio-Request-Id": reqId,
  };

  if (userId) {
    headers["X-Solturio-User-Id"] = userId;
  }

  let lastError: Error | null = null;
  let lastStatusCode = 500;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const url = `${SC_API_URL}${path}`;

      const fetchOptions: RequestInit = {
        method,
        headers,
        body: body ? bodyString : undefined,
      };

      const response = await fetch(url, fetchOptions);
      lastStatusCode = response.status;

      if (response.ok) {
        const data = await response.json();
        recordSuccess();

        auditLogger.log({
          action: "SC_REQUEST_SUCCESS",
          endpoint: path,
          method,
          statusCode: response.status,
          requestId: reqId,
          userId,
        });

        return {
          success: true,
          data: data as T,
          statusCode: response.status,
        };
      }

      if (shouldRetry(attempt, response.status)) {
        const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.log(`[SC-CLIENT] Retry ${attempt + 1}/${MAX_RETRIES} after ${delayMs}ms`);
        await delay(delayMs);
        continue;
      }

      const errorData = await response.json().catch(() => ({}));
      recordFailure();

      auditLogger.log({
        action: "SC_REQUEST_FAILED",
        endpoint: path,
        method,
        statusCode: response.status,
        requestId: reqId,
        userId,
        details: errorData,
      });

      return {
        success: false,
        error: errorData.error || `SC request failed with status ${response.status}`,
        statusCode: response.status,
      };
    } catch (error: any) {
      lastError = error;
      console.error(`[SC-CLIENT] Request error (attempt ${attempt + 1}):`, error.message);

      if (attempt < MAX_RETRIES - 1) {
        const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt);
        await delay(delayMs);
      }
    }
  }

  recordFailure();

  auditLogger.log({
    action: "SC_REQUEST_ERROR",
    endpoint: path,
    method,
    statusCode: lastStatusCode,
    requestId: reqId,
    userId,
    details: { error: lastError?.message || "Unknown error" },
  });

  return {
    success: false,
    error: lastError?.message || "Failed to connect to smart contract service",
    statusCode: lastStatusCode,
  };
}

export function getCircuitBreakerStatus(): {
  isOpen: boolean;
  failures: number;
  lastFailure: number;
} {
  return { ...circuitBreaker };
}

export function isConfigured(): boolean {
  return !!SC_API_URL && !!SC_API_SECRET;
}
