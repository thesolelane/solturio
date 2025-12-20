/**
 * $SOLT Rewards API Routes
 * REGULATORY: Utility rewards only - no investment language
 */

import { Router } from 'express';
import { isAuthenticated } from './replitAuth';
import { storage } from './storage';
import {
  awardReward,
  getUserRewardHistory,
  getTotalRewardsDistributed,
  getRemainingRewardsPool,
  generateReferralCode,
} from './rewards-service';
import { 
  SOLT_REWARDS, 
  getEarlyAdopterMultiplier, 
  calculateSetupRewards,
  SOLT_REWARDS_POOL,
} from '@shared/pricing';
import { z } from 'zod';

export const rewardsRouter = Router();

/**
 * GET /rewards/balance
 * Get current user's $SOLT balance and stats
 */
rewardsRouter.get('/rewards/balance', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      balance: user.sltrBalance || '0',
      totalEarned: user.sltrTotalEarned || '0',
      claimedAmount: user.sltrClaimedAmount || '0',
      lastClaimAt: user.lastSltrClaimAt,
      earlyAdopterMultiplier: user.earlyAdopterMultiplier || 1,
      referralCount: user.referralCount || 0,
      referralRewardsEarned: user.referralRewardsEarned || '0',
    });
  } catch (error: any) {
    console.error('Get balance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /rewards/history
 * Get user's reward history
 */
rewardsRouter.get('/rewards/history', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const history = await getUserRewardHistory(userId, limit);

    res.json({
      success: true,
      history,
      count: history.length,
    });
  } catch (error: any) {
    console.error('Get history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /rewards/pool-stats
 * Get overall rewards pool statistics
 */
rewardsRouter.get('/rewards/pool-stats', async (req, res) => {
  try {
    const distributed = await getTotalRewardsDistributed();
    const remaining = await getRemainingRewardsPool();

    res.json({
      success: true,
      pool: {
        total: SOLT_REWARDS_POOL.total,
        distributed,
        remaining,
        percentDistributed: ((distributed / SOLT_REWARDS_POOL.total) * 100).toFixed(2),
        allocations: SOLT_REWARDS_POOL.allocations,
      },
    });
  } catch (error: any) {
    console.error('Get pool stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /rewards/rates
 * Get current reward rates and multipliers
 */
rewardsRouter.get('/rewards/rates', async (req, res) => {
  try {
    res.json({
      success: true,
      rates: SOLT_REWARDS,
      multipliers: {
        first100: 5,
        users101to500: 3,
        users501to1000: 2,
        after1000: 1,
      },
      note: 'Early adopters earn higher multipliers on all rewards. Multiplier is locked at signup.',
    });
  } catch (error: any) {
    console.error('Get rates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /rewards/referral-code
 * Get or generate user's referral code
 */
rewardsRouter.get('/rewards/referral-code', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    let referralCode = user.referralCode;
    
    // Generate if not exists
    if (!referralCode) {
      referralCode = generateReferralCode();
      await storage.updateUser(userId, { referralCode });
    }

    const referralLink = `https://solturio.app/register?ref=${referralCode}`;

    res.json({
      success: true,
      referralCode,
      referralLink,
      referralCount: user.referralCount || 0,
      rewardsEarned: user.referralRewardsEarned || '0',
      rewardPerReferral: SOLT_REWARDS.REFERRAL_ACTIVATED,
      newUserBonus: SOLT_REWARDS.REFERRED_USER_BONUS,
    });
  } catch (error: any) {
    console.error('Get referral code error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /rewards/verify-referral
 * Verify and store referral code for new user (before activation)
 */
rewardsRouter.post('/rewards/verify-referral', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const schema = z.object({
      referralCode: z.string().min(3).max(20),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid referral code format',
      });
    }

    const { referralCode } = parsed.data;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Already has referrer
    if (user.referredBy) {
      return res.status(400).json({
        success: false,
        error: 'Referral already applied',
      });
    }

    // Don't allow self-referral
    if (user.referralCode === referralCode) {
      return res.status(400).json({
        success: false,
        error: 'Cannot use your own referral code',
      });
    }

    // Verify code exists (find referrer)
    const db = (storage as any).$client;
    const result = await db.query(
      `SELECT id, first_name FROM users WHERE referral_code = $1`,
      [referralCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid referral code',
      });
    }

    const referrer = result.rows[0];

    // Store referral (rewards applied on activation)
    await storage.updateUser(userId, { referredBy: referralCode });

    // Create referral tracking record
    await db.query(
      `INSERT INTO referral_tracking (referrer_user_id, referred_user_id, referral_code)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [referrer.id, userId, referralCode]
    );

    res.json({
      success: true,
      message: 'Referral code applied! You\'ll both earn rewards when you activate your account.',
      referrerName: referrer.first_name || 'A friend',
      bonusAmount: SOLT_REWARDS.REFERRED_USER_BONUS,
    });
  } catch (error: any) {
    console.error('Verify referral error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /rewards/claim-social
 * Submit social media post for reward verification
 */
rewardsRouter.post('/rewards/claim-social', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const schema = z.object({
      platform: z.enum(['twitter', 'telegram']),
      postUrl: z.string().url(),
      claimType: z.enum(['tag_cooperanthllc', 'tag_dex']),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request',
        details: parsed.error.issues,
      });
    }

    const { platform, postUrl, claimType } = parsed.data;

    // For now, auto-approve (in production, would verify via API)
    // TODO: Add Twitter/Telegram API verification
    
    const action = claimType === 'tag_cooperanthllc' 
      ? 'social_tag_cooperanthllc' 
      : 'social_tag_dex';

    const result = await awardReward(userId, action, postUrl, platform);

    if (result.success) {
      res.json({
        success: true,
        message: 'Social reward claimed!',
        amount: result.finalAmount,
        newBalance: result.newBalance,
        multiplier: result.multiplier,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to claim reward',
      });
    }
  } catch (error: any) {
    console.error('Claim social error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /rewards/setup-checklist
 * Get user's setup checklist with potential rewards
 */
rewardsRouter.get('/rewards/setup-checklist', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const multiplier = user.earlyAdopterMultiplier || 1;

    const checklist = [
      {
        id: 'profile_complete',
        label: 'Complete your profile',
        completed: !!user.profileCompletedAt,
        reward: SOLT_REWARDS.PROFILE_COMPLETE * multiplier,
      },
      {
        id: 'wallet_connected',
        label: 'Connect Solana wallet',
        completed: !!user.walletAddress,
        reward: SOLT_REWARDS.WALLET_CONNECTED * multiplier,
      },
      {
        id: 'first_image',
        label: 'Upload your first image',
        completed: !!user.firstImageUploadedAt,
        reward: SOLT_REWARDS.FIRST_IMAGE * multiplier,
      },
      {
        id: 'socials_linked',
        label: 'Link social media accounts',
        completed: !!user.socialsLinkedAt,
        reward: SOLT_REWARDS.SOCIALS_LINKED * multiplier,
      },
      {
        id: 'key_ceremony',
        label: 'Complete key handover ceremony',
        completed: user.ceremonyCompleted,
        reward: SOLT_REWARDS.KEY_CEREMONY_COMPLETE * multiplier,
      },
    ];

    const completedCount = checklist.filter(item => item.completed).length;
    const totalPotential = checklist.reduce((sum, item) => sum + item.reward, 0);
    const earned = checklist.filter(item => item.completed).reduce((sum, item) => sum + item.reward, 0);

    res.json({
      success: true,
      checklist,
      summary: {
        completed: completedCount,
        total: checklist.length,
        earnedRewards: earned,
        potentialRewards: totalPotential,
        multiplier,
      },
    });
  } catch (error: any) {
    console.error('Get checklist error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
