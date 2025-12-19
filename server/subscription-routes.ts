/**
 * Subscription & Account Activation API Routes
 * REGULATORY: Non-refundable service fees, not custody
 */

import { Router } from 'express';
import { isAuthenticated } from './replitAuth';
import { storage } from './storage';
import {
  checkFreeAccess,
  getSubscriptionPricing,
  activateAccount,
  renewSubscription,
  checkSubscriptionStatus,
} from './subscription-service';
import { isAdminEmail, ADMIN_EMAILS } from '@shared/pricing';
import { z } from 'zod';

export const subscriptionRouter = Router();

/**
 * GET /subscription/pricing
 * Get current subscription pricing (promo vs standard)
 */
subscriptionRouter.get('/subscription/pricing', async (req, res) => {
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
  } catch (error: any) {
    console.error('Get pricing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /subscription/status
 * Check current user's subscription status
 */
subscriptionRouter.get('/subscription/status', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if admin
    const isAdmin = isAdminEmail(user.email);
    if (isAdmin) {
      return res.json({
        success: true,
        status: 'admin',
        isActive: true,
        isAdmin: true,
        message: 'Admin account - unlimited free access',
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
  } catch (error: any) {
    console.error('Check status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /subscription/activate
 * Activate account after $CATH payment
 */
subscriptionRouter.post('/subscription/activate', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const schema = z.object({
      paymentTxHash: z.string().min(50, 'Invalid transaction hash'),
      cathAmountPaid: z.number().positive(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request', 
        details: parsed.error.issues,
      });
    }

    const { paymentTxHash, cathAmountPaid } = parsed.data;

    // Check if admin (should be auto-activated)
    const user = await storage.getUser(userId);
    if (isAdminEmail(user?.email)) {
      return res.json({
        success: true,
        accountStatus: 'admin',
        message: 'Admin accounts do not require payment',
      });
    }

    const result = await activateAccount(userId, paymentTxHash, cathAmountPaid);

    if (result.success) {
      res.json({
        success: true,
        accountStatus: result.accountStatus,
        subscriptionExpiresAt: result.subscriptionExpiresAt,
        rewardsEarned: result.rewardsEarned,
        message: 'Account activated successfully! Welcome to Solturio.',
      });
    } else {
      res.status(400).json({
        success: false,
        accountStatus: result.accountStatus,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Activate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /subscription/renew
 * Renew subscription with $CATH payment
 */
subscriptionRouter.post('/subscription/renew', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const schema = z.object({
      paymentTxHash: z.string().min(50, 'Invalid transaction hash'),
      cathAmountPaid: z.number().positive(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request', 
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
        message: 'Subscription renewed successfully!',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Renew error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /subscription/check-access
 * Check if user can create new collections (active subscription required)
 */
subscriptionRouter.get('/subscription/check-access', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    // Check for admin free access
    const hasFreeAccess = await checkFreeAccess(userId);
    if (hasFreeAccess) {
      return res.json({
        success: true,
        canCreateCollection: true,
        reason: 'admin',
      });
    }

    const status = await checkSubscriptionStatus(userId);

    res.json({
      success: true,
      canCreateCollection: status.isActive,
      reason: status.isActive ? 'active_subscription' : 'subscription_required',
      status: status.status,
      daysRemaining: status.daysRemaining,
      expiresAt: status.expiresAt,
    });
  } catch (error: any) {
    console.error('Check access error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Middleware to require active subscription
 */
export async function requireActiveSubscription(req: any, res: any, next: any) {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated',
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
        error: 'Active subscription required',
        requiresSubscription: true,
        currentStatus: status.status,
      });
    }

    next();
  } catch (error: any) {
    console.error('Subscription middleware error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}
