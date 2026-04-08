/**
 * Phase 3: Request Validator Middleware
 * - Applies validation to all requests
 * - Generates request IDs
 * - Validates nonce/timestamp
 */

import { Request, Response, NextFunction } from "express";
import { isValidTimestamp } from "./utils/replay-prevention";

export interface ValidatedRequest extends Request {
  requestId: string;
  validationErrors?: Record<string, string>;
}

// Middleware to add request ID and validate timestamp
export const requestValidatorMiddleware = (
  req: ValidatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Generate request ID
  req.requestId = `req_${Math.random().toString(36).substring(7)}_${Date.now()}`;

  // Validate timestamp in request body if present
  if (req.body && req.body.timestamp) {
    if (!isValidTimestamp(req.body.timestamp)) {
      return res.status(400).json({
        success: false,
        error: "EXPIRED_REQUEST",
        code: "EXPIRED_REQUEST",
        details: { reason: "Request timestamp outside 5-minute window" },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  next();
};

// Middleware to validate required fields
export function validateBodyFields(requiredFields: string[]) {
  return (req: ValidatedRequest, res: Response, next: NextFunction) => {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: "INVALID_INPUT",
        code: "INVALID_INPUT",
        details: { missingFields },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }

    next();
  };
}
