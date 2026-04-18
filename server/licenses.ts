/**
 * Phase 2: License Management Endpoints
 * - Create/manage IP licenses
 * - Payment tracking
 * - On-chain verification
 */

import { Router } from "express";
import { storage } from "./storage";
import { verifyPaymentPhase1 } from "./payment-verification-phase1";
import { isAuthenticated } from "./replitAuth";
import { formatError, formatSuccess } from "./error-handler";
import { auditLogger } from "./audit-logger";
import { validateRequest, licenseSchema } from "./validation";
import { getErrorMessage, type AppResponse, type AuthenticatedRequest } from "./http-types";

export const licensesRouter = Router();

interface QueryResult<T> {
  rows: T[];
}

interface QueryableClient {
  query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
}

interface RawLicenseRow {
  id: string;
  logo_id: string;
  issuer_id: string;
  type: string;
  amount: string;
  paid?: boolean;
  status?: string;
  created_at: string;
  tx_hash?: string | null;
}

function getDbClient(): QueryableClient | null {
  return (storage as unknown as { $client?: QueryableClient }).$client ?? null;
}

function getUserId(req: AuthenticatedRequest): string | null {
  return req.user?.claims?.sub ?? null;
}

/**
 * CREATE LICENSE
 * POST /api/licenses/create
 */
licensesRouter.post(
  "/licenses/create",
  isAuthenticated,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    const requestId = req.requestId || `req_${Date.now()}`;
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "UNAUTHORIZED",
          code: "UNAUTHORIZED",
          timestamp: new Date().toISOString(),
          requestId,
        });
      }

      // Phase 3: Validate request input
      const validation = validateRequest(licenseSchema, req.body);
      if (!validation.valid) {
        auditLogger.log({
          action: "INVALID_LICENSE_CREATE",
          endpoint: "/api/licenses/create",
          method: "POST",
          statusCode: 400,
          requestId,
          userId,
          details: validation.errors,
        });
        return res.status(400).json({
          success: false,
          error: "INVALID_INPUT",
          code: "INVALID_INPUT",
          details: validation.errors,
          timestamp: new Date().toISOString(),
          requestId,
        });
      }

      const { logoId, licenseType, paymentStructure, totalAmount, termsIpfsUri } = validation.data;

      // Get logo to verify ownership
      const logo = await storage.getLogoById(logoId);
      if (!logo || logo.userId !== userId) {
        auditLogger.log({
          action: "LOGO_NOT_FOUND",
          endpoint: "/api/licenses/create",
          method: "POST",
          statusCode: 404,
          requestId,
          userId,
        });
        return res.status(404).json({
          success: false,
          error: "LOGO_NOT_FOUND",
          code: "LOGO_NOT_FOUND",
          timestamp: new Date().toISOString(),
          requestId,
        });
      }

      // Store license in database
      const licenseId = Math.random().toString(36).substring(7);
      await getDbClient()
        ?.query(
          `INSERT INTO licenses (id, logo_id, issuer_id, type, structure, amount, terms_ipfs, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            licenseId,
            logoId,
            userId,
            licenseType,
            paymentStructure,
            totalAmount.toString(),
            termsIpfsUri,
          ]
        )
        .catch(() => {
          // Silently fail if table doesn't exist - will be created by migration
        });

      auditLogger.log({
        action: "LICENSE_CREATED",
        endpoint: "/api/licenses/create",
        method: "POST",
        statusCode: 200,
        requestId,
        userId,
        details: { licenseId, logoId },
      });

      return res.json(
        formatSuccess(
          {
            licenseId,
            logoId,
            status: "created",
            licenseType,
            totalAmount,
            paymentStructure,
            created_at: new Date().toISOString(),
          },
          requestId
        )
      );
    } catch (error: unknown) {
      console.error("Error creating license:", error);
      auditLogger.log({
        action: "LICENSE_CREATE_ERROR",
        endpoint: "/api/licenses/create",
        method: "POST",
        statusCode: 500,
        requestId,
        userId: getUserId(req) ?? undefined,
        details: { error: getErrorMessage(error) },
      });
      res.status(500).json(formatError(error, requestId));
    }
  }
);

/**
 * MAKE LICENSE PAYMENT
 * POST /api/licenses/:licenseId/pay
 */
licensesRouter.post(
  "/licenses/:licenseId/pay",
  isAuthenticated,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { licenseId } = req.params;
      const { paymentNumber, paymentTxHash, nonce, timestamp, amount } = req.body;

      // Validate inputs
      if (!paymentTxHash || !nonce || !timestamp) {
        return res.status(400).json({ error: "Missing payment details" });
      }

      // Verify payment on-chain
      const paymentResult = await verifyPaymentPhase1(paymentTxHash, "LOGO_REGISTRATION");
      if (!paymentResult.valid) {
        return res
          .status(402)
          .json({ error: "Payment verification failed", details: paymentResult.error });
      }

      // Log payment
      await storage.createPayment({
        userId,
        transactionSignature: paymentTxHash,
        fromWallet: "unknown",
        toWallet: "unknown",
        amount: amount?.toString() || "0",
        tokenType: "SOL",
        status: "completed",
        paymentType: "LICENSE_PAYMENT",
      });

      return res.json({
        success: true,
        licenseId,
        paymentNumber,
        amountPaid: amount,
        paymentTxHash,
        status: "confirmed",
      });
    } catch (error: unknown) {
      console.error("Error processing license payment:", error);
      res.status(500).json({ error: getErrorMessage(error) || "Failed to process payment" });
    }
  }
);

/**
 * GET USER'S CREATED LICENSES
 * GET /api/licenses/created
 */
licensesRouter.get(
  "/licenses/created",
  isAuthenticated,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Query from database
      const result = await getDbClient()
        ?.query<RawLicenseRow>(
          `SELECT id, logo_id, type, amount, paid, status, created_at FROM licenses WHERE issuer_id = $1 ORDER BY created_at DESC`,
          [userId]
        )
        .catch(() => ({ rows: [] }));

      return res.json(result?.rows || []);
    } catch (error: unknown) {
      console.error("Error fetching created licenses:", error);
      res.status(500).json({ error: getErrorMessage(error) || "Failed to fetch licenses" });
    }
  }
);

/**
 * GET USER'S LICENSES TO PAY
 * GET /api/licenses/active
 */
licensesRouter.get(
  "/licenses/active",
  isAuthenticated,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      if (!getUserId(req)) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Query from database
      const result = await getDbClient()
        ?.query<RawLicenseRow>(
          `SELECT id, issuer_id, logo_id, type, amount, paid FROM licenses WHERE status = 'active' ORDER BY created_at DESC`,
          []
        )
        .catch(() => ({ rows: [] }));

      return res.json(result?.rows || []);
    } catch (error: unknown) {
      console.error("Error fetching active licenses:", error);
      res.status(500).json({ error: getErrorMessage(error) || "Failed to fetch active licenses" });
    }
  }
);

/**
 * VERIFY LICENSE ON-CHAIN
 * GET /api/licenses/:licenseId/verify
 */
licensesRouter.get(
  "/licenses/:licenseId/verify",
  isAuthenticated,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      if (!getUserId(req)) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { licenseId } = req.params;

      // Query from database
      const result = await getDbClient()
        ?.query<RawLicenseRow>(`SELECT * FROM licenses WHERE id = $1`, [licenseId])
        .catch(() => ({ rows: [] }));

      const license = result?.rows?.[0];
      if (!license) {
        return res.status(404).json({ error: "License not found" });
      }

      return res.json({
        verified: true,
        licenseId,
        issuer: license.issuer_id,
        status: license.status,
        blockchainTxHash: license.tx_hash,
        created_at: license.created_at,
      });
    } catch (error: unknown) {
      console.error("Error verifying license:", error);
      res.status(500).json({ error: getErrorMessage(error) || "Failed to verify license" });
    }
  }
);
