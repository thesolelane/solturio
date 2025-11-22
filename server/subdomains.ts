/**
 * Subdomain Management Endpoints
 * - Register platform subdomains (admin only)
 * - Query subdomain status
 */

import { Router } from "express";
import { isAuthenticated } from "./replitAuth";
import { initializeSubdomainOnChain } from "./sc-integration";
import { formatError, formatSuccess } from "./error-handler";
import { auditLogger } from "./audit-logger";

export const subdomainsRouter = Router();

const VALID_SUBDOMAINS = ["funds", "rewards", "docs", "api", "governance"];

/**
 * REGISTER SUBDOMAIN (Admin only)
 * POST /api/subdomains/register
 */
subdomainsRouter.post("/subdomains/register", isAuthenticated, async (req: any, res) => {
  const requestId = req.requestId || `req_${Date.now()}`;
  try {
    const userId = req.user.claims.sub;
    const { subdomain, walletAddress } = req.body;

    // TODO: Add admin verification
    // if (!isAdmin(userId)) return res.status(403).json({ error: "Admin required" });

    if (!subdomain || !VALID_SUBDOMAINS.includes(subdomain)) {
      return res.status(400).json({
        success: false,
        error: "Invalid subdomain",
        details: `Must be one of: ${VALID_SUBDOMAINS.join(", ")}`,
        timestamp: new Date().toISOString(),
        requestId,
      });
    }

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: "Wallet address required",
        timestamp: new Date().toISOString(),
        requestId,
      });
    }

    // Initialize on-chain
    const scResult = await initializeSubdomainOnChain({
      subdomain,
      walletAddress,
    });

    if (!scResult.success) {
      throw new Error(scResult.error || "SC call failed");
    }

    auditLogger.log({
      action: "SUBDOMAIN_REGISTERED",
      endpoint: "/api/subdomains/register",
      method: "POST",
      statusCode: 200,
      requestId,
      userId,
      details: { subdomain },
    });

    return res.json(formatSuccess({
      registered: true,
      subdomain,
      solturioDomain: scResult.solturioDomain,
      walletAddress,
    }, requestId));
  } catch (error: any) {
    console.error("Error registering subdomain:", error);
    auditLogger.log({
      action: "SUBDOMAIN_REGISTRATION_ERROR",
      endpoint: "/api/subdomains/register",
      method: "POST",
      statusCode: 500,
      requestId,
      userId: req.user?.claims?.sub,
      details: { error: error.message },
    });
    res.status(500).json(formatError(error, requestId));
  }
});

/**
 * GET SUBDOMAIN STATUS
 * GET /api/subdomains/:name
 */
subdomainsRouter.get("/subdomains/:name", async (req: any, res) => {
  const requestId = req.requestId || `req_${Date.now()}`;
  try {
    const { name } = req.params;

    if (!VALID_SUBDOMAINS.includes(name)) {
      return res.status(404).json({
        success: false,
        error: "Subdomain not found",
        timestamp: new Date().toISOString(),
        requestId,
      });
    }

    return res.json(formatSuccess({
      subdomain: name,
      registered: true,
      solturioDomain: `${name}.solturio.sol`,
      available: true,
    }, requestId));
  } catch (error: any) {
    res.status(500).json(formatError(error, requestId));
  }
});
