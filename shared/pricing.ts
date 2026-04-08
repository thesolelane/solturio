/**
 * Solturio Platform Pricing Configuration
 * Updated: December 2024 - New Payment Model
 * REGULATORY: All payments are non-refundable service fees, not custody
 */

// ============================================================================
// ADMIN CONFIGURATION
// ============================================================================

// Admin emails - bypass payment requirement entirely
export const ADMIN_EMAILS = [
  "admin@solturio.app",
  "acooper@cooperanth.com",
  "cooper@preferredbuildersusa.com",
];

// Check if email is admin
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// ============================================================================
// LAUNCH TIMING
// ============================================================================

// Platform launch date for promo calculations (update when known)
export const MAINNET_LAUNCH_DATE = new Date("2025-03-01");
export const PROMO_DURATION_DAYS = 60;

// Check if we're in promo period
export function isPromoPeriod(): boolean {
  const now = new Date();
  const promoEndDate = new Date(MAINNET_LAUNCH_DATE);
  promoEndDate.setDate(promoEndDate.getDate() + PROMO_DURATION_DAYS);
  return now >= MAINNET_LAUNCH_DATE && now <= promoEndDate;
}

// ============================================================================
// SUBSCRIPTION PRICING ($CATH only for platform access)
// ============================================================================

export const SUBSCRIPTION_PRICING = {
  // Launch promo: 0.14 SOL worth of $CATH for 1 year (first 60 days)
  PROMO: {
    solEquivalent: 0.14,
    durationDays: 365,
    description: "Early adopter special - 1 year access",
  },
  // Standard: 0.5 SOL worth of $CATH for 1 year (after promo)
  STANDARD: {
    solEquivalent: 0.5,
    durationDays: 365,
    description: "Annual platform access",
  },
};

// Get current subscription pricing based on promo period
export function getCurrentSubscriptionPricing() {
  return isPromoPeriod() ? SUBSCRIPTION_PRICING.PROMO : SUBSCRIPTION_PRICING.STANDARD;
}

// ============================================================================
// LICENSE SC FEE (SOL only)
// ============================================================================

export const LICENSE_FEE = {
  amount: "0.025", // SOL
  currency: "SOL" as const,
  description: "Smart contract creation fee",
};

// ============================================================================
// TOKEN CONFIGURATION
// ============================================================================

export const TOKEN_MINTS = {
  CATH: "48rmvKgpGpUNUuH3n2UYTZS2AUxZEkaCiNjQ57q1duMA",
  SOL: "So11111111111111111111111111111111111111112", // Wrapped SOL
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  SOLT: "SOLT_MINT_ADDRESS_PLACEHOLDER", // Solturio rewards token - update when created
};

export const PLATFORM_WALLETS = {
  REVENUE: process.env.PLATFORM_REVENUE_WALLET || "PLACEHOLDER_REVENUE_WALLET",
  OPERATIONS: process.env.PLATFORM_OPERATIONS_WALLET || "PLACEHOLDER_OPS_WALLET",
  REWARDS: process.env.PLATFORM_REWARDS_WALLET || "PLACEHOLDER_REWARDS_WALLET",
};

// ============================================================================
// $SOLT REWARDS SYSTEM (50M pool via Streamflow)
// ============================================================================

export const SOLT_REWARDS_POOL = {
  total: 50_000_000, // 50M $SOLT tokens
  allocations: {
    platformActions: 0.4, // 40% = 20M
    referrals: 0.25, // 25% = 12.5M
    ipQuiz: 0.2, // 20% = 10M
    socialEngagement: 0.15, // 15% = 7.5M
  },
};

// Early adopter multipliers (based on signup order)
export const EARLY_ADOPTER_MULTIPLIERS = {
  first100: 5,
  users101to500: 3,
  users501to1000: 2,
  after1000: 1,
};

// Base reward amounts (in $SOLT)
export const SOLT_REWARDS = {
  // Account setup actions
  PROFILE_COMPLETE: 100,
  EMAIL_VERIFIED: 50,
  WALLET_CONNECTED: 100,
  FIRST_IMAGE: 150,
  ADDITIONAL_IMAGE: 50,
  KEY_CEREMONY_COMPLETE: 200,
  SOCIALS_LINKED: 100,

  // Token launch actions
  TOKEN_REGISTERED: 100,
  TICKER_VERIFIED: 200,
  STRONG_REGISTRATION: 150,

  // Ongoing actions
  LICENSE_SC_CREATED: 200,
  QUIZ_WIN_NO_BET: 25,

  // Referrals
  REFERRAL_SIGNUP: 100,
  REFERRAL_ACTIVATED: 300,
  REFERRED_USER_BONUS: 250, // Bonus for new user who was referred

  // Social media
  TAG_COOPERANTHLLC: 50,
  TAG_DEX_MENTION_SOLTURIO: 100,
  VERIFIED_ENGAGEMENT_BONUS: 50,
};

// Calculate total setup rewards (for display)
export function calculateSetupRewards(multiplier: number = 1): number {
  const base =
    SOLT_REWARDS.PROFILE_COMPLETE +
    SOLT_REWARDS.EMAIL_VERIFIED +
    SOLT_REWARDS.WALLET_CONNECTED +
    SOLT_REWARDS.FIRST_IMAGE +
    SOLT_REWARDS.KEY_CEREMONY_COMPLETE +
    SOLT_REWARDS.SOCIALS_LINKED;
  return base * multiplier;
}

// Get multiplier based on user signup number
export function getEarlyAdopterMultiplier(userNumber: number): number {
  if (userNumber <= 100) return EARLY_ADOPTER_MULTIPLIERS.first100;
  if (userNumber <= 500) return EARLY_ADOPTER_MULTIPLIERS.users101to500;
  if (userNumber <= 1000) return EARLY_ADOPTER_MULTIPLIERS.users501to1000;
  return EARLY_ADOPTER_MULTIPLIERS.after1000;
}

// ============================================================================
// LEGACY PRICING (deprecated - kept for backward compatibility)
// ============================================================================

export const PRICING = {
  FREE_UPLOADS_LIMIT: 2,
  MINTING_FEE: {
    SOL: "0.01",
    CATH: "100",
  },
  MONTHLY_RENTAL: {
    SOL: "0.005",
    CATH: "50",
  },
  QUIZ_REWARDS: {
    EASY: "5",
    MEDIUM: "10",
    HARD: "20",
  },
} as const;

export type PaymentToken = "SOL" | "CATH" | "SOLT";

// Legacy helpers
export function isEligibleForFreeUpload(logoCount: number): boolean {
  return logoCount < PRICING.FREE_UPLOADS_LIMIT;
}

export function getRemainingFreeUploads(logoCount: number): number {
  const remaining = PRICING.FREE_UPLOADS_LIMIT - logoCount;
  return Math.max(0, remaining);
}

export function calculateUploadCost(logoCount: number, token: PaymentToken): string {
  if (isEligibleForFreeUpload(logoCount)) {
    return "0";
  }
  return token === "SOLT" ? "0" : PRICING.MINTING_FEE[token as "SOL" | "CATH"];
}
