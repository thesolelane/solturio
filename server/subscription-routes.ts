/**
 * Subscription & Account Activation API Routes
 * REGULATORY: Non-refundable service fees, not custody
 */

import { Router } from "express";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import {
  checkFreeAccess,
  getSubscriptionPricing,
  activateAccount,
  renewSubscription,
  checkSubscriptionStatus,
} from "./subscription-service";
import { awardManualReward } from "./rewards-service";
import { z } from "zod";
import { env } from "./env";
import { hasAdminAccess, requireAdmin } from "./admin-middleware";
import {
  getErrorMessage,
  type AppNextFunction,
  type AppResponse,
  type AuthenticatedRequest,
} from "./http-types";

export const subscriptionRouter = Router();

/**
 * GET /subscription/pricing
 * Get current subscription pricing (promo vs standard)
 */
subscriptionRouter.get("/subscription/pricing", async (req, res) => {
  try {
    const pricing = await getSubscriptionPricing();
    res.json({
      success: true,
      pricing: {
        cathAmount: pricing.cathAmount,
        solEquivalent: pricing.solEquivalent,
        solPriceUsd: pricing.solPriceUsd,
        cathPriceUsd: pricing.cathPriceUsd,
        usdValue: pricing.usdValue,
        isPromo: pricing.isPromo,
        durationDays: pricing.durationDays,
        description: pricing.description,
      },
    });
  } catch (error: unknown) {
    console.error("Get pricing error:", error);
    res.status(500).json({ success: false, error: getErrorMessage(error) });
  }
});

/**
 * GET /subscription/status
 * Check current user's subscription status
 */
subscriptionRouter.get(
  "/subscription/status",
  isAuthenticated,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // Check if admin
      const isAdmin = hasAdminAccess(user);
      if (isAdmin) {
        return res.json({
          success: true,
          status: "admin",
          isActive: true,
          isAdmin: true,
          message: "Admin account - unlimited free access",
        });
      }

      const status = await checkSubscriptionStatus(userId);

      res.json({
        success: true,
        ...status,
        isAdmin: false,
        accountStatus: user.accountStatus,
        subscriptionPaidAt: user.subscriptionPaidAt,
        wasPromoPrice: user.wasPromoPrice,
      });
    } catch (error: unknown) {
      console.error("Check status error:", error);
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  }
);

/**
 * POST /subscription/activate
 * Activate account after $CATH payment
 */
subscriptionRouter.post(
  "/subscription/activate",
  isAuthenticated,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      const schema = z.object({
        paymentTxHash: z.string().min(50, "Invalid transaction hash"),
        cathAmountPaid: z.number().positive(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const { paymentTxHash, cathAmountPaid } = parsed.data;

      // Check if admin (should be auto-activated)
      const user = await storage.getUser(userId);
      if (hasAdminAccess(user)) {
        return res.json({
          success: true,
          accountStatus: "admin",
          message: "Admin accounts do not require payment",
        });
      }

      const result = await activateAccount(userId, paymentTxHash, cathAmountPaid);

      if (result.success) {
        res.json({
          success: true,
          accountStatus: result.accountStatus,
          subscriptionExpiresAt: result.subscriptionExpiresAt,
          rewardsEarned: result.rewardsEarned,
          message: "Account activated successfully! Welcome to Solturio.",
        });
      } else {
        res.status(400).json({
          success: false,
          accountStatus: result.accountStatus,
          error: result.error,
        });
      }
    } catch (error: unknown) {
      console.error("Activate error:", error);
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  }
);

/**
 * POST /subscription/renew
 * Renew subscription with $CATH payment
 */
subscriptionRouter.post(
  "/subscription/renew",
  isAuthenticated,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      const schema = z.object({
        paymentTxHash: z.string().min(50, "Invalid transaction hash"),
        cathAmountPaid: z.number().positive(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const { paymentTxHash, cathAmountPaid } = parsed.data;

      const result = await renewSubscription(userId, paymentTxHash, cathAmountPaid);

      if (result.success) {
        res.json({
          success: true,
          accountStatus: result.accountStatus,
          subscriptionExpiresAt: result.subscriptionExpiresAt,
          message: "Subscription renewed successfully!",
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error: unknown) {
      console.error("Renew error:", error);
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  }
);

/**
 * GET /subscription/payment-info
 * Get payment information for account activation
 */
subscriptionRouter.get(
  "/subscription/payment-info",
  isAuthenticated,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      const pricing = await getSubscriptionPricing();
      const platformWallet = env.platformRevenueWallet || "";

      res.json({
        recipientWallet: platformWallet,
        cathAmount: pricing.cathAmount?.toFixed(2) || "0",
        solEquivalent: pricing.solEquivalent?.toFixed(2) || "0.14",
        isPromo: pricing.isPromo,
        instructions:
          "Send the exact amount of $CATH tokens to the platform wallet, then verify your transaction.",
      });
    } catch (error: unknown) {
      console.error("Get payment info error:", error);
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  }
);

/**
 * POST /subscription/verify-payment
 * Verify payment and activate account
 */
subscriptionRouter.post(
  "/subscription/verify-payment",
  isAuthenticated,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      const { transactionSignature } = req.body;
      if (!transactionSignature || transactionSignature.length < 50) {
        return res.status(400).json({ success: false, error: "Invalid transaction signature" });
      }

      // Get pricing to know expected amount
      const pricing = await getSubscriptionPricing();

      // Activate account with payment verification
      const result = await activateAccount(userId, transactionSignature, pricing.cathAmount || 0);

      if (result.success) {
        res.json({
          success: true,
          accountStatus: result.accountStatus,
          subscriptionExpiresAt: result.subscriptionExpiresAt,
          rewardsEarned: result.rewardsEarned,
          message: "Account activated successfully!",
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || "Payment verification failed",
        });
      }
    } catch (error: unknown) {
      console.error("Verify payment error:", error);
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  }
);

/**
 * GET /subscription/check-access
 * Check if user can create new collections (active subscription required)
 */
subscriptionRouter.get(
  "/subscription/check-access",
  isAuthenticated,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      // Check for admin free access
      const hasFreeAccess = await checkFreeAccess(userId);
      if (hasFreeAccess) {
        return res.json({
          success: true,
          canCreateCollection: true,
          reason: "admin",
        });
      }

      const status = await checkSubscriptionStatus(userId);

      res.json({
        success: true,
        canCreateCollection: status.isActive,
        reason: status.isActive ? "active_subscription" : "subscription_required",
        status: status.status,
        daysRemaining: status.daysRemaining,
        expiresAt: status.expiresAt,
      });
    } catch (error: unknown) {
      console.error("Check access error:", error);
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  }
);

// ============================================
// ADMIN SUBSCRIPTION MANAGEMENT ROUTES
// ============================================
/**
 * GET /admin/subscriptions/users
 * Get all users with subscription data (admin only)
 */
subscriptionRouter.get(
  "/admin/subscriptions/users",
  isAuthenticated,
  requireAdmin,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const users = await storage.getAllUsers();

      const subscriptionUsers = users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountStatus: user.accountStatus || "pending",
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        soltBalance: user.sltrBalance || "0",
        createdAt: user.createdAt,
      }));

      res.json(subscriptionUsers);
    } catch (error: unknown) {
      console.error("Get subscription users error:", error);
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  }
);

/**
 * POST /admin/subscriptions/grant-free
 * Grant admin/free access to a user
 */
subscriptionRouter.post(
  "/admin/subscriptions/grant-free",
  isAuthenticated,
  requireAdmin,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, error: "User ID required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      await storage.updateUser(userId, {
        accountStatus: "admin",
        isAdmin: true,
      });

      res.json({ success: true, message: "Admin access granted" });
    } catch (error: unknown) {
      console.error("Grant free access error:", error);
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  }
);

/**
 * POST /admin/subscriptions/extend
 * Extend a user's subscription by specified days
 */
subscriptionRouter.post(
  "/admin/subscriptions/extend",
  isAuthenticated,
  requireAdmin,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const { userId, days } = req.body;
      if (!userId || !days) {
        return res.status(400).json({ success: false, error: "User ID and days required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // Calculate new expiration date
      const currentExpiry = user.subscriptionExpiresAt
        ? new Date(user.subscriptionExpiresAt)
        : new Date();
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      await storage.updateUser(userId, {
        accountStatus: "active",
        subscriptionExpiresAt: newExpiry,
      });

      res.json({
        success: true,
        message: `Subscription extended by ${days} days`,
        newExpiresAt: newExpiry.toISOString(),
      });
    } catch (error: unknown) {
      console.error("Extend subscription error:", error);
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  }
);

/**
 * POST /admin/subscriptions/award-rewards
 * Manually award SOLT rewards to a user
 * SECURITY: Uses rewards-service to enforce pool cap and audit logging
 */
subscriptionRouter.post(
  "/admin/subscriptions/award-rewards",
  isAuthenticated,
  requireAdmin,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const adminUserId = req.user?.claims?.sub;
      if (!adminUserId) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      const { userId, amount, reason } = req.body;

      if (!userId || !amount) {
        return res.status(400).json({ success: false, error: "User ID and amount required" });
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, error: "Amount must be a positive number" });
      }

      // Use rewards service for proper pool cap enforcement and audit logging
      const result = await awardManualReward(
        userId,
        parsedAmount,
        reason || "admin_manual",
        adminUserId
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error || "Failed to award rewards",
        });
      }

      res.json({
        success: true,
        message: `Awarded ${result.finalAmount} SOLT to user`,
        requestedAmount: parsedAmount,
        awardedAmount: result.finalAmount,
        newBalance: result.newBalance,
        reason: reason || "admin_manual",
      });
    } catch (error: unknown) {
      console.error("Award rewards error:", error);
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  }
);

/**
 * Middleware to require active subscription
 */
export async function requireActiveSubscription(
  req: AuthenticatedRequest,
  res: AppResponse,
  next: AppNextFunction
) {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
        requiresSubscription: true,
      });
    }

    // Check for admin
    const hasFreeAccess = await checkFreeAccess(userId);
    if (hasFreeAccess) {
      return next();
    }

    const status = await checkSubscriptionStatus(userId);
    if (!status.isActive) {
      return res.status(403).json({
        success: false,
        error: "Active subscription required",
        requiresSubscription: true,
        currentStatus: status.status,
      });
    }

    next();
  } catch (error: unknown) {
    console.error("Subscription middleware error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
}
