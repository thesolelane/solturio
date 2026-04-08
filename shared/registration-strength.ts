export interface FieldWeight {
  key: string;
  label: string;
  weight: number;
  required: boolean;
  category: "identity" | "verification" | "transparency" | "community" | "legal";
}

export const TOKEN_LAUNCH_FIELDS: FieldWeight[] = [
  { key: "tokenName", label: "Token Name", weight: 10, required: true, category: "identity" },
  { key: "tokenTicker", label: "Ticker Symbol", weight: 10, required: true, category: "identity" },
  { key: "file", label: "Logo Upload", weight: 10, required: true, category: "identity" },
  {
    key: "launchPlatform",
    label: "Launch Platform",
    weight: 5,
    required: true,
    category: "identity",
  },
  {
    key: "launchTimeline",
    label: "Launch Timeline",
    weight: 5,
    required: true,
    category: "identity",
  },
  {
    key: "projectSummary",
    label: "Project Summary",
    weight: 5,
    required: true,
    category: "identity",
  },
  {
    key: "tokenCategory",
    label: "Token Category",
    weight: 5,
    required: true,
    category: "identity",
  },
  {
    key: "totalSupply",
    label: "Total Supply",
    weight: 5,
    required: true,
    category: "transparency",
  },
  {
    key: "authorityWallet",
    label: "Authority Wallet",
    weight: 8,
    required: true,
    category: "verification",
  },
  {
    key: "twitterHandle",
    label: "Twitter/X Handle",
    weight: 5,
    required: true,
    category: "community",
  },

  {
    key: "proofPostUrl1",
    label: "Proof Post 1",
    weight: 7,
    required: false,
    category: "verification",
  },
  {
    key: "proofPostUrl2",
    label: "Proof Post 2",
    weight: 5,
    required: false,
    category: "verification",
  },
  {
    key: "tokenomicsDetails",
    label: "Tokenomics Details",
    weight: 3,
    required: false,
    category: "transparency",
  },
  {
    key: "supplyLocked",
    label: "Supply Locked",
    weight: 3,
    required: false,
    category: "transparency",
  },
  {
    key: "lockDuration",
    label: "Lock Duration",
    weight: 2,
    required: false,
    category: "transparency",
  },
  {
    key: "additionalWallet1Address",
    label: "Additional Wallet 1",
    weight: 2,
    required: false,
    category: "verification",
  },
  {
    key: "additionalWallet2Address",
    label: "Additional Wallet 2",
    weight: 1,
    required: false,
    category: "verification",
  },
  { key: "websiteUrl", label: "Website", weight: 3, required: false, category: "community" },
  { key: "telegramUrl", label: "Telegram", weight: 2, required: false, category: "community" },
  { key: "discordUrl", label: "Discord", weight: 2, required: false, category: "community" },
  { key: "youtubeUrl", label: "YouTube", weight: 1, required: false, category: "community" },
  { key: "tiktokUrl", label: "TikTok", weight: 1, required: false, category: "community" },
  {
    key: "githubRepoUrl",
    label: "GitHub Repository",
    weight: 3,
    required: false,
    category: "transparency",
  },
  {
    key: "tokenContractAddress",
    label: "Contract Address",
    weight: 4,
    required: false,
    category: "legal",
  },
];

export const MAX_SCORE = TOKEN_LAUNCH_FIELDS.reduce((sum, f) => sum + f.weight, 0);
export const REQUIRED_SCORE = TOKEN_LAUNCH_FIELDS.filter((f) => f.required).reduce(
  (sum, f) => sum + f.weight,
  0
);

export type StrengthTier = "weak" | "basic" | "strong" | "verified";

export interface RegistrationStrength {
  score: number;
  maxScore: number;
  percentage: number;
  tier: StrengthTier;
  tierLabel: string;
  completedFields: string[];
  missingFields: string[];
  missingRequiredFields: string[];
  categoryScores: Record<string, { earned: number; max: number }>;
  rewardsEligible: boolean;
}

export function calculateRegistrationStrength(
  registrationData: Record<string, any>
): RegistrationStrength {
  let score = 0;
  const completedFields: string[] = [];
  const missingFields: string[] = [];
  const missingRequiredFields: string[] = [];
  const categoryScores: Record<string, { earned: number; max: number }> = {};

  for (const field of TOKEN_LAUNCH_FIELDS) {
    if (!categoryScores[field.category]) {
      categoryScores[field.category] = { earned: 0, max: 0 };
    }
    categoryScores[field.category].max += field.weight;

    const value = registrationData[field.key];
    const isFilled =
      value !== null &&
      value !== undefined &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0);

    if (isFilled) {
      score += field.weight;
      completedFields.push(field.key);
      categoryScores[field.category].earned += field.weight;
    } else {
      missingFields.push(field.key);
      if (field.required) {
        missingRequiredFields.push(field.key);
      }
    }
  }

  const percentage = Math.round((score / MAX_SCORE) * 100);

  let tier: StrengthTier;
  let tierLabel: string;

  if (percentage >= 90) {
    tier = "verified";
    tierLabel = "Verified";
  } else if (percentage >= 70) {
    tier = "strong";
    tierLabel = "Strong";
  } else if (percentage >= 50) {
    tier = "basic";
    tierLabel = "Basic";
  } else {
    tier = "weak";
    tierLabel = "Weak";
  }

  const rewardsEligible = missingRequiredFields.length === 0 && percentage >= 50;

  return {
    score,
    maxScore: MAX_SCORE,
    percentage,
    tier,
    tierLabel,
    completedFields,
    missingFields,
    missingRequiredFields,
    categoryScores,
    rewardsEligible,
  };
}

export function getFieldByKey(key: string): FieldWeight | undefined {
  return TOKEN_LAUNCH_FIELDS.find((f) => f.key === key);
}

export function getMissingFieldLabels(registrationData: Record<string, any>): string[] {
  const strength = calculateRegistrationStrength(registrationData);
  return strength.missingFields.map((key) => {
    const field = getFieldByKey(key);
    return field?.label || key;
  });
}
