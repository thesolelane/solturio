/**
 * Phase 3: Apply Validation Middleware to All Endpoints
 */

import { Request, Response, NextFunction } from "express";
import { validateRequest, nonceTimestampSchema } from "./validation";
import { formatError, ERROR_CODES } from "./error-handler";
import { auditLogger } from "./audit-logger";

export interface ValidatedRequest extends Request {
  requestId: string;
  validationErrors?: Record<string, string>;
}

/**
 * Apply to all API routes
 */
export const applyValidationToRoutes = (app: any) => {
  // Request ID middleware
  app.use((req: ValidatedRequest, res: Response, next: NextFunction) => {
    req.requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    next();
  });

  // Nonce validation middleware for payment endpoints
  app.use("/api/licenses/:id/pay", (req: ValidatedRequest, res: Response, next: NextFunction) => {
    const validation = validateRequest(nonceTimestampSchema, {
      nonce: req.body?.nonce,
      timestamp: req.body?.timestamp,
    });

    if (!validation.valid) {
      auditLogger.log({
        action: "INVALID_REQUEST",
        endpoint: req.path,
        method: req.method,
        statusCode: 400,
        requestId: req.requestId,
        userId: (req as any).user?.claims?.sub,
        details: validation.errors,
        ipAddress: req.ip,
      });

      return res.status(400).json({
        success: false,
        error: "INVALID_INPUT",
        code: "INVALID_INPUT",
        details: validation.errors,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }

    next();
  });

  // Audit logging middleware
  app.use((req: ValidatedRequest, res: Response, next: NextFunction) => {
    const originalSend = res.json;

    res.json = function (data: any) {
      // Log after response is sent
      setImmediate(() => {
        auditLogger.log({
          action: req.method.toUpperCase(),
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          requestId: req.requestId,
          userId: (req as any).user?.claims?.sub,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        });
      });

      return originalSend.call(this, data);
    };

    next();
  });
};

/**
 * Wrap endpoints with error handler
 */
export const withErrorHandler = (
  handler: (req: ValidatedRequest, res: Response, next: NextFunction) => Promise<void> | void
) => {
  return async (req: ValidatedRequest, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error: any) {
      const formatted = formatError(error, req.requestId);
      res.status(error.statusCode || 500).json(formatted);
    }
  };
};
