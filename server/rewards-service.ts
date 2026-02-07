/**
 * $SOLT Rewards Service
 * Tracks and distributes rewards for platform actions
 * REGULATORY: Utility rewards only - no investment language
 */

import { storage } from './storage';
import { 
  SOLT_REWARDS, 
  getEarlyAdopterMultiplier,
  SOLT_REWARDS_POOL 
} from '@shared/pricing';

type RewardAction = 
  | 'profile_complete'
  | 'email_verified'
  | 'wallet_connected'
  | 'first_image'
  | 'additional_image'
  | 'key_ceremony_complete'
  | 'socials_linked'
  | 'token_registered'
  | 'ticker_verified'
  | 'strong_registration'
  | 'license_sc_created'
  | 'quiz_win'
  | 'referral_signup'
  | 'referral_activated'
  | 'referred_user_bonus'
  | 'social_tag_cooperanthllc'
  | 'social_tag_dex';

interface RewardResult {
  success: boolean;
  baseAmount: number;
  multiplier: number;
  finalAmount: number;
  newBalance: string;
  error?: string;
}

// Map action types to base reward amounts
const ACTION_REWARDS: Record<RewardAction, number> = {
  profile_complete: SOLT_REWARDS.PROFILE_COMPLETE,
  email_verified: SOLT_REWARDS.EMAIL_VERIFIED,
  wallet_connected: SOLT_REWARDS.WALLET_CONNECTED,
  first_image: SOLT_REWARDS.FIRST_IMAGE,
  additional_image: SOLT_REWARDS.ADDITIONAL_IMAGE,
  key_ceremony_complete: SOLT_REWARDS.KEY_CEREMONY_COMPLETE,
  socials_linked: SOLT_REWARDS.SOCIALS_LINKED,
  token_registered: SOLT_REWARDS.TOKEN_REGISTERED,
  ticker_verified: SOLT_REWARDS.TICKER_VERIFIED,
  strong_registration: SOLT_REWARDS.STRONG_REGISTRATION,
  license_sc_created: SOLT_REWARDS.LICENSE_SC_CREATED,
  quiz_win: SOLT_REWARDS.QUIZ_WIN_NO_BET,
  referral_signup: SOLT_REWARDS.REFERRAL_SIGNUP,
  referral_activated: SOLT_REWARDS.REFERRAL_ACTIVATED,
  referred_user_bonus: SOLT_REWARDS.REFERRED_USER_BONUS,
  social_tag_cooperanthllc: SOLT_REWARDS.TAG_COOPERANTHLLC,
  social_tag_dex: SOLT_REWARDS.TAG_DEX_MENTION_SOLTURIO,
};

/**
 * Award $SOLT tokens to a user for an action
 * SECURITY: Enforces 50M total pool cap
 */
export async function awardReward(
  userId: string,
  action: RewardAction,
  relatedEntityId?: string,
  relatedEntityType?: string,
  metadata?: Record<string, any>
): Promise<RewardResult> {
  try {
    // Get user to check multiplier
    const user = await storage.getUser(userId);
    if (!user) {
      return { success: false, baseAmount: 0, multiplier: 1, finalAmount: 0, newBalance: '0', error: 'User not found' };
    }

    const baseAmount = ACTION_REWARDS[action];
    if (!baseAmount) {
      return { success: false, baseAmount: 0, multiplier: 1, finalAmount: 0, newBalance: '0', error: 'Invalid action' };
    }

    // Get user's early adopter multiplier
    const multiplier = user.earlyAdopterMultiplier || 1;
    let finalAmount = baseAmount * multiplier;

    // SECURITY: Check pool cap before awarding
    const totalDistributed = await getTotalRewardsDistributed();
    const remainingPool = SOLT_REWARDS_POOL.total - totalDistributed;
    
    if (remainingPool <= 0) {
      return { 
        success: false, 
        baseAmount, 
        multiplier, 
        finalAmount: 0, 
        newBalance: user.sltrBalance || '0', 
        error: 'Rewards pool exhausted' 
      };
    }
    
    // SECURITY: Cap reward to remaining pool if needed
    if (finalAmount > remainingPool) {
      console.warn(`Capping reward from ${finalAmount} to ${remainingPool} (pool cap)`);
      finalAmount = remainingPool;
    }

    // Calculate new balance
    const currentBalance = parseFloat(user.sltrBalance || '0');
    const currentTotalEarned = parseFloat(user.sltrTotalEarned || '0');
    const newBalance = (currentBalance + finalAmount).toString();
    const newTotalEarned = (currentTotalEarned + finalAmount).toString();

    // Update user balance
    await storage.updateUser(userId, {
      sltrBalance: newBalance,
      sltrTotalEarned: newTotalEarned,
    });

    // Log the reward (using raw SQL since we don't have storage method yet)
    try {
      const db = (storage as any).$client;
      if (db) {
        await db.query(
          `INSERT INTO rewards_log (user_id, action_type, base_amount, multiplier, final_amount, related_entity_id, related_entity_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, action, baseAmount.toString(), multiplier, finalAmount.toString(), relatedEntityId, relatedEntityType]
        );
      }
    } catch (logError) {
      console.error('Failed to log reward:', logError);
    }

    return {
      success: true,
      baseAmount,
      multiplier,
      finalAmount,
      newBalance,
    };
  } catch (error: any) {
    console.error('Award reward error:', error);
    return {
      success: false,
      baseAmount: 0,
      multiplier: 1,
      finalAmount: 0,
      newBalance: '0',
      error: error.message,
    };
  }
}

/**
 * Process referral rewards when a referred user activates
 */
export async function processReferralReward(
  referredUserId: string,
  referralCode: string
): Promise<{ referrerReward: RewardResult; referredBonus: RewardResult } | null> {
  try {
    // Find the referrer
    const db = (storage as any).$client;
    if (!db) return null;

    const result = await db.query(
      `SELECT id FROM users WHERE referral_code = $1`,
      [referralCode]
    );

    if (result.rows.length === 0) return null;
    const referrerId = result.rows[0].id;

    // Award referrer
    const referrerReward = await awardReward(
      referrerId,
      'referral_activated',
      referredUserId,
      'referral'
    );

    // Award referred user bonus
    const referredBonus = await awardReward(
      referredUserId,
      'referred_user_bonus',
      referrerId,
      'referral'
    );

    // Update referral tracking
    await db.query(
      `UPDATE referral_tracking SET 
        activated_at = NOW(),
        referrer_reward_amount = $1,
        referrer_reward_paid_at = NOW(),
        referred_bonus_amount = $2,
        referred_bonus_paid_at = NOW()
       WHERE referrer_user_id = $3 AND referred_user_id = $4`,
      [referrerReward.finalAmount.toString(), referredBonus.finalAmount.toString(), referrerId, referredUserId]
    );

    // Increment referrer's count
    await db.query(
      `UPDATE users SET 
        referral_count = COALESCE(referral_count, 0) + 1,
        referral_rewards_earned = (COALESCE(referral_rewards_earned::numeric, 0) + $1)::text
       WHERE id = $2`,
      [referrerReward.finalAmount, referrerId]
    );

    return { referrerReward, referredBonus };
  } catch (error) {
    console.error('Process referral reward error:', error);
    return null;
  }
}

/**
 * Get user's reward history
 */
export async function getUserRewardHistory(userId: string, limit: number = 50): Promise<any[]> {
  try {
    const db = (storage as any).$client;
    if (!db) return [];

    const result = await db.query(
      `SELECT * FROM rewards_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Get reward history error:', error);
    return [];
  }
}

/**
 * Get total rewards distributed
 */
export async function getTotalRewardsDistributed(): Promise<number> {
  try {
    const db = (storage as any).$client;
    if (!db) return 0;

    const result = await db.query(
      `SELECT COALESCE(SUM(final_amount::numeric), 0) as total FROM rewards_log`
    );

    return parseFloat(result.rows[0].total) || 0;
  } catch (error) {
    console.error('Get total rewards error:', error);
    return 0;
  }
}

/**
 * Get remaining rewards pool
 */
export async function getRemainingRewardsPool(): Promise<number> {
  const distributed = await getTotalRewardsDistributed();
  return SOLT_REWARDS_POOL.total - distributed;
}

/**
 * Admin manual reward award - bypasses action lookup but still enforces pool cap
 * SECURITY: Only call from admin-verified routes
 */
export async function awardManualReward(
  userId: string,
  amount: number,
  reason: string,
  adminUserId: string
): Promise<RewardResult> {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return { success: false, baseAmount: 0, multiplier: 1, finalAmount: 0, newBalance: '0', error: 'User not found' };
    }

    if (amount <= 0) {
      return { success: false, baseAmount: 0, multiplier: 1, finalAmount: 0, newBalance: '0', error: 'Amount must be positive' };
    }

    // SECURITY: Enforce pool cap
    const remainingPool = await getRemainingRewardsPool();
    if (remainingPool <= 0) {
      return {
        success: false,
        baseAmount: amount,
        multiplier: 1,
        finalAmount: 0,
        newBalance: user.sltrBalance || '0',
        error: 'Rewards pool exhausted',
      };
    }

    let finalAmount = amount;
    if (finalAmount > remainingPool) {
      console.warn(`Admin award capped from ${finalAmount} to ${remainingPool} (pool cap)`);
      finalAmount = remainingPool;
    }

    // Calculate new balance
    const currentBalance = parseFloat(user.sltrBalance || '0');
    const currentTotalEarned = parseFloat(user.sltrTotalEarned || '0');
    const newBalance = (currentBalance + finalAmount).toString();
    const newTotalEarned = (currentTotalEarned + finalAmount).toString();

    // Update user balance
    await storage.updateUser(userId, {
      sltrBalance: newBalance,
      sltrTotalEarned: newTotalEarned,
    });

    // Log the admin reward with audit trail
    try {
      const db = (storage as any).$client;
      if (db) {
        await db.query(
          `INSERT INTO rewards_log (user_id, action_type, base_amount, multiplier, final_amount, related_entity_id, related_entity_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, 'admin_manual', amount.toString(), 1, finalAmount.toString(), adminUserId, `reason:${reason}`]
        );
      }
    } catch (logError) {
      console.error('Failed to log admin reward:', logError);
    }

    return {
      success: true,
      baseAmount: amount,
      multiplier: 1,
      finalAmount,
      newBalance,
    };
  } catch (error: any) {
    console.error('Admin award reward error:', error);
    return {
      success: false,
      baseAmount: 0,
      multiplier: 1,
      finalAmount: 0,
      newBalance: '0',
      error: error.message,
    };
  }
}

/**
 * Generate unique referral code for user
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'SLT';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
