/**
 * Replay Attack Prevention Utilities
 * Phase 1: Critical Security Fix
 */

import crypto from "crypto";

export interface ReplayCheckResult {
  valid: boolean;
  reason?: string;
}

/**
 * Generate a cryptographic nonce (random 32-byte hex string)
 */
export function generateNonce(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Validate nonce format (must be 64 hex characters = 32 bytes)
 */
export function isValidNonce(nonce: string): boolean {
  return /^[a-f0-9]{64}$/i.test(nonce);
}

/**
 * Validate request timestamp (must be within 5 minutes)
 */
export function isValidTimestamp(timestamp: number): boolean {
  const now = Date.now() / 1000; // Convert to seconds like timestamp
  const diff = Math.abs(now - timestamp);
  const MAX_AGE_SECONDS = 5 * 60; // 5 minutes
  return diff <= MAX_AGE_SECONDS;
}

/**
 * Check nonce in database and prevent replay
 * @param storage Storage instance with database access
 * @param nonce The nonce to check
 * @returns Valid if nonce is fresh and hasn't been used
 */
export async function checkAndStoreNonce(storage: any, nonce: string): Promise<ReplayCheckResult> {
  try {
    // Validate nonce format
    if (!isValidNonce(nonce)) {
      return { valid: false, reason: "Invalid nonce format" };
    }

    // Check if nonce already exists (replay detected)
    const existingNonce = await storage.getNonceByValue(nonce);
    if (existingNonce) {
      return { valid: false, reason: "Replay attack detected: nonce already used" };
    }

    // Store nonce to prevent future replays
    await storage.storeNonce(nonce);

    return { valid: true };
  } catch (error: any) {
    console.error("Error checking nonce:", error);
    return { valid: false, reason: "Nonce verification failed" };
  }
}

/**
 * Comprehensive request validation for payment endpoints
 */
export function validatePaymentRequest(req: any): {
  valid: boolean;
  reason?: string;
  nonce?: string;
  timestamp?: number;
} {
  const { nonce, timestamp, paymentTxHash } = req.body;

  // Check nonce exists and is valid format
  if (!nonce) {
    return { valid: false, reason: "Missing nonce in request" };
  }

  if (!isValidNonce(nonce)) {
    return { valid: false, reason: "Invalid nonce format" };
  }

  // Check timestamp exists
  if (!timestamp) {
    return { valid: false, reason: "Missing timestamp in request" };
  }

  // Validate timestamp is recent
  if (!isValidTimestamp(timestamp)) {
    return { valid: false, reason: "Request expired (timestamp must be within 5 minutes)" };
  }

  // Check paymentTxHash
  if (!paymentTxHash || typeof paymentTxHash !== "string") {
    return { valid: false, reason: "Missing or invalid payment transaction hash" };
  }

  return { valid: true, nonce, timestamp };
}
