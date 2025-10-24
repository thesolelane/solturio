// LogoGuard Pricing Configuration
// Updated: October 2024 - Launch Promotion

export const PRICING = {
  // Launch promotion: First 2 uploads free for small communities
  FREE_UPLOADS_LIMIT: 2,
  
  // After free tier, users pay for minting and storage
  // These will be set when Solana integration is ready
  MINTING_FEE: {
    SOL: '0.01', // Per logo NFT minting (placeholder)
    CATH: '100', // Alternative payment in $CATH (placeholder)
  },
  
  // Image registry monthly rental (ireg.cooperanth.sol)
  MONTHLY_RENTAL: {
    SOL: '0.005', // Per logo per month (placeholder)
    CATH: '50', // Alternative payment in $CATH (placeholder)
  },
  
  // Quiz rewards
  QUIZ_REWARDS: {
    EASY: '5', // $CATH per correct easy question
    MEDIUM: '10', // $CATH per correct medium question
    HARD: '20', // $CATH per correct hard question
  },
} as const;

export type PaymentToken = 'SOL' | 'CATH';

// Helper to check if user qualifies for free upload
export function isEligibleForFreeUpload(logoCount: number): boolean {
  return logoCount < PRICING.FREE_UPLOADS_LIMIT;
}

// Helper to get remaining free uploads
export function getRemainingFreeUploads(logoCount: number): number {
  const remaining = PRICING.FREE_UPLOADS_LIMIT - logoCount;
  return Math.max(0, remaining);
}

// Helper to calculate total cost for logo upload
export function calculateUploadCost(logoCount: number, token: PaymentToken): string {
  if (isEligibleForFreeUpload(logoCount)) {
    return '0';
  }
  return PRICING.MINTING_FEE[token];
}
