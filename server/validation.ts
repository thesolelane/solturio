/**
 * Phase 3: Global Input Validation Layer
 * - Validates all incoming requests
 * - Standardized error responses
 */

import { z } from "zod";

// Standard validation schemas for common operations
export const nonceTimestampSchema = z.object({
  nonce: z.string().regex(/^[a-f0-9]{64}$/, "Invalid nonce format").min(64).max(64),
  timestamp: z.number().int().positive(),
});

export const licenseSchema = z.object({
  logoId: z.string().uuid("Invalid logo ID"),
  licenseType: z.enum(["AllRightsReserved", "CreativeCommons", "Custom"]),
  paymentStructure: z.enum(["lumpSum", "installments"]),
  totalAmount: z.number().positive("Amount must be positive"),
  termsIpfsUri: z.string().optional(),
  ...nonceTimestampSchema.shape,
});

export const paymentSchema = z.object({
  paymentTxHash: z.string().min(1, "Transaction hash required"),
  amount: z.number().positive("Amount must be positive"),
  ...nonceTimestampSchema.shape,
});

export const treasuryTransferSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(10, "Description must be at least 10 chars"),
  recipient: z.string().optional(),
});

export const multiSigSchema = z.object({
  signers: z.array(z.string()).min(1, "At least one signer required"),
  threshold: z.number().int().positive().min(1),
});

// Validation utility function
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { valid: true; data: T } | { valid: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.errors.forEach(err => {
      const key = err.path.join('.');
      errors[key] = err.message;
    });
    return { valid: false, errors };
  }
  return { valid: true, data: result.data as T };
}
