/**
 * IP Registration Endpoints
 * - Register logos on-chain
 * - Store IPFS metadata
 */

import { Router } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { registerIPOnChain, storeIPFSMetadataOnChain, verifyTransactionOnChain } from "./sc-integration";
import { formatError, formatSuccess } from "./error-handler";
import { auditLogger } from "./audit-logger";
import { validateRequest } from "./validation";
import { z } from "zod";

export const ipRegistrationRouter = Router();

const registrationSchema = z.object({
  logoId: z.string().uuid("Invalid logo ID"),
  registrationType: z.enum(["artwork", "tokenLogo"]),
  paymentTier: z.enum(["standard", "premium"]),
  paymentTxHash: z.string().min(1, "Transaction hash required"),
  nonce: z.string().regex(/^[a-f0-9]{64}$/),
  timestamp: z.number().int().positive(),
});

/**
 * REGISTER LOGO ON-CHAIN
 * POST /api/ip/register-on-chain
 */
ipRegistrationRouter.post("/ip/register-on-chain", isAuthenticated, async (req: any, res) => {
  const requestId = req.requestId || `req_${Date.now()}`;
  try {
    const userId = req.user.claims.sub;

    // Validate input
    const validation = validateRequest(registrationSchema, req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: "INVALID_INPUT",
        details: validation.errors,
        timestamp: new Date().toISOString(),
        requestId,
      });
    }

    const { logoId, registrationType, paymentTier, paymentTxHash } = validation.data;

    // Get logo
    const logo = await storage.getLogoById(logoId);
    if (!logo || (logo as any).userId !== userId) {
      auditLogger.log({
        action: "LOGO_NOT_FOUND",
        endpoint: "/api/ip/register-on-chain",
        method: "POST",
        statusCode: 404,
        requestId,
        userId,
      });
      return res.status(404).json({
        success: false,
        error: "Logo not found",
        timestamp: new Date().toISOString(),
        requestId,
      });
    }

    // Verify payment on-chain (CRITICAL SECURITY FIX)
    const paymentAmount = paymentTier === "standard" ? BigInt(100_000_000) : BigInt(150_000_000);
    const txVerification = await verifyTransactionOnChain(paymentTxHash, paymentAmount);
    
    if (!txVerification.valid) {
      auditLogger.log({
        action: "PAYMENT_VERIFICATION_FAILED",
        endpoint: "/api/ip/register-on-chain",
        method: "POST",
        statusCode: 402,
        requestId,
        userId,
        details: { error: txVerification.error },
      });
      return res.status(402).json({
        success: false,
        error: "Payment verification failed",
        details: txVerification.error,
        timestamp: new Date().toISOString(),
        requestId,
      });
    }

    // Register on-chain via SC
    const scResult = await registerIPOnChain({
      fileHash: (logo as any).fileHash || "unknown",
      metadataUri: (logo as any).ipfsUri || "",
      registrationType,
      paymentTier,
      txHash: paymentTxHash,
    });

    if (!scResult.success) {
      throw new Error(scResult.error || "SC call failed");
    }

    auditLogger.log({
      action: "IP_REGISTERED_ON_CHAIN",
      endpoint: "/api/ip/register-on-chain",
      method: "POST",
      statusCode: 200,
      requestId,
      userId,
      details: { logoId, scTxHash: scResult.blockchainTxHash },
    });

    return res.json(formatSuccess({
      registered: true,
      logoId,
      blockchainTxHash: scResult.blockchainTxHash,
      timestamp: scResult.timestamp,
      explorer: scResult.explorer,
    }, requestId));
  } catch (error: any) {
    console.error("Error registering IP:", error);
    auditLogger.log({
      action: "IP_REGISTRATION_ERROR",
      endpoint: "/api/ip/register-on-chain",
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
 * STORE IPFS METADATA ON-CHAIN
 * POST /api/ip/store-ipfs-metadata
 */
ipRegistrationRouter.post("/ip/store-ipfs-metadata", isAuthenticated, async (req: any, res) => {
  const requestId = req.requestId || `req_${Date.now()}`;
  try {
    const userId = req.user.claims.sub;
    const { logoId, fileHash, ipfsHash, metadataUri } = req.body;

    if (!logoId || !fileHash || !ipfsHash) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        timestamp: new Date().toISOString(),
        requestId,
      });
    }

    // Store on-chain via SC
    const scResult = await storeIPFSMetadataOnChain({
      fileHash,
      ipfsHash,
      metadataUri,
    });

    if (!scResult.success) {
      throw new Error(scResult.error || "SC call failed");
    }

    auditLogger.log({
      action: "IPFS_METADATA_STORED",
      endpoint: "/api/ip/store-ipfs-metadata",
      method: "POST",
      statusCode: 200,
      requestId,
      userId,
    });

    return res.json(formatSuccess({
      stored: true,
      ipfsHash,
      metadata: scResult.proof,
    }, requestId));
  } catch (error: any) {
    console.error("Error storing IPFS metadata:", error);
    res.status(500).json(formatError(error, requestId));
  }
});
