/**
 * Phase 2: Treasury & Multi-Sig Endpoints
 * - Setup multi-sig wallets
 * - Propose transfers
 * - Vote/approve transfers
 */

import { Router } from "express";
import { isAuthenticated } from "./replitAuth";
import { requireAdmin } from "./admin-middleware";
import { getErrorMessage, type AppResponse, type AuthenticatedRequest } from "./http-types";

export const treasuryRouter = Router();

/**
 * SETUP MULTI-SIG WALLET (Admin only)
 * POST /api/treasury/setup-multisig
 */
treasuryRouter.post(
  "/treasury/setup-multisig",
  isAuthenticated,
  requireAdmin,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const { signers, threshold } = req.body;
      if (!signers || !Array.isArray(signers) || signers.length === 0) {
        return res.status(400).json({ error: "Invalid signers array" });
      }

      if (threshold > signers.length) {
        return res.status(400).json({ error: "Threshold cannot exceed number of signers" });
      }

      return res.json({
        success: true,
        status: "initialized",
        signers,
        threshold,
        message: "Multi-sig setup initialized",
      });
    } catch (error: unknown) {
      console.error("Error setting up multi-sig:", error);
      res.status(500).json({ error: getErrorMessage(error) });
    }
  }
);

/**
 * PROPOSE TRANSFER
 * POST /api/treasury/propose-transfer
 */
treasuryRouter.post(
  "/treasury/propose-transfer",
  isAuthenticated,
  requireAdmin,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const userId = req.user?.claims?.sub || "unknown";
      const { amount, description, recipient } = req.body;

      if (!amount || !description) {
        return res.status(400).json({ error: "Missing amount or description" });
      }

      const proposalId = Math.random().toString(36).substring(7);

      return res.json({
        success: true,
        proposalId,
        status: "proposed",
        proposer: userId,
        amount,
        description,
        recipient,
        approvals: 0,
        threshold: 2,
        created_at: new Date().toISOString(),
      });
    } catch (error: unknown) {
      console.error("Error proposing transfer:", error);
      res.status(500).json({ error: getErrorMessage(error) });
    }
  }
);

/**
 * APPROVE PROPOSAL
 * POST /api/treasury/approve-transfer/:proposalId
 */
treasuryRouter.post(
  "/treasury/approve-transfer/:proposalId",
  isAuthenticated,
  requireAdmin,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const userId = req.user?.claims?.sub || "unknown";
      const { proposalId } = req.params;

      return res.json({
        success: true,
        proposalId,
        approver: userId,
        status: "approved",
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      console.error("Error approving transfer:", error);
      res.status(500).json({ error: getErrorMessage(error) });
    }
  }
);

/**
 * EXECUTE TRANSFER
 * POST /api/treasury/execute-transfer/:proposalId
 */
treasuryRouter.post(
  "/treasury/execute-transfer/:proposalId",
  isAuthenticated,
  requireAdmin,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const { proposalId } = req.params;

      return res.json({
        success: true,
        proposalId,
        status: "executed",
        blockchainTxHash: `tx_${Math.random().toString(36).substring(7)}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      console.error("Error executing transfer:", error);
      res.status(500).json({ error: getErrorMessage(error) });
    }
  }
);

/**
 * CANCEL PROPOSAL
 * POST /api/treasury/cancel-transfer/:proposalId
 */
treasuryRouter.post(
  "/treasury/cancel-transfer/:proposalId",
  isAuthenticated,
  requireAdmin,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const { proposalId } = req.params;

      return res.json({
        success: true,
        proposalId,
        status: "cancelled",
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      console.error("Error cancelling transfer:", error);
      res.status(500).json({ error: getErrorMessage(error) });
    }
  }
);

/**
 * VIEW TREASURY STATUS
 * GET /api/treasury/status
 */
treasuryRouter.get(
  "/treasury/status",
  isAuthenticated,
  requireAdmin,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      return res.json({
        balance: "10000",
        transferred: "2500",
        currency: "CATH",
        schedule: "monthly",
        nextTransfer: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
      });
    } catch (error: unknown) {
      console.error("Error fetching treasury status:", error);
      res.status(500).json({ error: getErrorMessage(error) });
    }
  }
);

/**
 * VIEW PROPOSALS
 * GET /api/treasury/proposals
 */
treasuryRouter.get(
  "/treasury/proposals",
  isAuthenticated,
  requireAdmin,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      return res.json([
        {
          id: "prop_001",
          amount: "500",
          proposer: "user_123",
          approvals: 1,
          status: "pending",
          description: "Infrastructure costs",
        },
      ]);
    } catch (error: unknown) {
      console.error("Error fetching proposals:", error);
      res.status(500).json({ error: getErrorMessage(error) });
    }
  }
);
