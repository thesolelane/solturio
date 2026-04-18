/**
 * Phase 3: Apply Validation Middleware to All Endpoints
 */

import type { Application, NextFunction, RequestHandler } from "express";
import { validateRequest, nonceTimestampSchema } from "./validation";
import { formatError } from "./error-handler";
import { auditLogger } from "./audit-logger";
import type { AppResponse, AuthenticatedRequest } from "./http-types";

export interface ValidatedRequest extends AuthenticatedRequest {
  requestId: string;
  validationErrors?: Record<string, string>;
}

interface StatusCodeError {
  statusCode?: number;
}

/**
 * Apply to all API routes
 */
export const applyValidationToRoutes = (app: Application) => {
  // Request ID middleware
  const requestIdMiddleware: RequestHandler = (req, _res, next) => {
    (req as ValidatedRequest).requestId =
      `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    next();
  };
  app.use(requestIdMiddleware);

  // Nonce validation middleware for payment endpoints
  const nonceValidationMiddleware: RequestHandler = (req, res, next) => {
    const validatedReq = req as ValidatedRequest;
    const validation = validateRequest(nonceTimestampSchema, {
      nonce: validatedReq.body?.nonce,
      timestamp: validatedReq.body?.timestamp,
    });

    if (!validation.valid) {
      auditLogger.log({
        action: "INVALID_REQUEST",
        endpoint: validatedReq.path,
        method: validatedReq.method,
        statusCode: 400,
        requestId: validatedReq.requestId,
        userId: validatedReq.user?.claims?.sub,
        details: validation.errors,
        ipAddress: validatedReq.ip,
      });

      return res.status(400).json({
        success: false,
        error: "INVALID_INPUT",
        code: "INVALID_INPUT",
        details: validation.errors,
        timestamp: new Date().toISOString(),
        requestId: validatedReq.requestId,
      });
    }

    next();
  };
  app.use("/api/licenses/:id/pay", nonceValidationMiddleware);

  // Audit logging middleware
  const auditLoggingMiddleware: RequestHandler = (req, res, next) => {
    const validatedReq = req as ValidatedRequest;
    const originalSend = res.json;

    res.json = function (data: unknown) {
      // Log after response is sent
      setImmediate(() => {
        auditLogger.log({
          action: validatedReq.method.toUpperCase(),
          endpoint: validatedReq.path,
          method: validatedReq.method,
          statusCode: res.statusCode,
          requestId: validatedReq.requestId,
          userId: validatedReq.user?.claims?.sub,
          ipAddress: validatedReq.ip,
          userAgent: validatedReq.get("user-agent"),
        });
      });

      return originalSend.call(this, data);
    };

    next();
  };
  app.use(auditLoggingMiddleware);
};

/**
 * Wrap endpoints with error handler
 */
export const withErrorHandler = (
  handler: (req: ValidatedRequest, res: AppResponse, next: NextFunction) => Promise<void> | void
) => {
  return async (req: ValidatedRequest, res: AppResponse, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error: unknown) {
      const formatted = formatError(error, req.requestId);
      const status =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof (error as StatusCodeError).statusCode === "number"
          ? (error as StatusCodeError).statusCode!
          : 500;
      res.status(status).json(formatted);
    }
  };
};
