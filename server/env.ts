import "./load-env.ts";

type NodeEnv = "development" | "production" | "test";
type AuthProvider = "local" | "replit";

function readOptionalString(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function readString(name: string, fallback: string): string {
  return readOptionalString(name) ?? fallback;
}

function readNumber(name: string, fallback: number): number {
  const value = readOptionalString(name);
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(name: string, fallback = false): boolean {
  const value = readOptionalString(name);
  if (!value) {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

function readCsv(name: string): string[] {
  const value = readOptionalString(name);
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeBaseUrl(value?: string): string | undefined {
  return value?.replace(/\/+$/, "");
}

function readAuthProvider(name: string, fallback: AuthProvider): AuthProvider {
  const value = readOptionalString(name)?.toLowerCase();
  if (!value) {
    return fallback;
  }

  if (value === "local" || value === "replit") {
    return value;
  }

  return fallback;
}

export function requireEnv(name: string, value: string | undefined, message?: string): string {
  if (!value) {
    throw new Error(message ?? `Environment variable ${name} is required`);
  }

  return value;
}

export const env = {
  environmentTarget:
    (readOptionalString("SOLTURIO_ENV_TARGET") as "beta" | "production" | undefined) ?? "beta",
  authProvider: readAuthProvider("AUTH_PROVIDER", "local"),
  nodeEnv: (readOptionalString("NODE_ENV") as NodeEnv | undefined) ?? "development",
  port: readNumber("PORT", 5000),
  baseUrl: normalizeBaseUrl(readOptionalString("BASE_URL")),
  databaseUrl: readOptionalString("DATABASE_URL"),
  replitDomains: readCsv("REPLIT_DOMAINS"),
  replId: readOptionalString("REPL_ID"),
  issuerUrl: readString("ISSUER_URL", "https://replit.com/oidc"),
  localAuthAccessCode: readOptionalString("LOCAL_AUTH_ACCESS_CODE"),
  sessionSecret: readOptionalString("SESSION_SECRET"),
  walletEncryptionKey: readOptionalString("WALLET_ENCRYPTION_KEY"),
  secretsEncryptionKey: readOptionalString("SECRETS_ENCRYPTION_KEY"),
  musicMasterKek: readOptionalString("MUSIC_MASTER_KEK"),
  sendgridApiKey: readOptionalString("SENDGRID_API_KEY"),
  noreplyEmail: readString("NOREPLY_EMAIL", "noreply@solturio.com"),
  supportEmail: readString("SUPPORT_EMAIL", "support@solturio.com"),
  pinataApiKey: readOptionalString("PINATA_API_KEY"),
  pinataSecretKey: readOptionalString("PINATA_SECRET_KEY"),
  pinataJwt: readOptionalString("PINATA_JWT"),
  pinataGateway: readString("PINATA_GATEWAY", "gateway.pinata.cloud"),
  arweaveWalletKey: readOptionalString("ARWEAVE_WALLET_KEY"),
  solanaCluster: readString("SOLANA_CLUSTER", "devnet"),
  solanaRpcUrl: readOptionalString("SOLANA_RPC_URL"),
  soltMintAddress: readOptionalString("SOLT_MINT_ADDRESS"),
  solturioNftProgramId: readOptionalString("SOLTURIO_NFT_PROGRAM_ID"),
  solturioLaunchDate: readOptionalString("SOLTURIO_LAUNCH_DATE"),
  platformSolWallet: readOptionalString("PLATFORM_SOL_WALLET"),
  platformBonkWallet: readOptionalString("PLATFORM_BONK_WALLET"),
  platformCathWallet: readOptionalString("PLATFORM_CATH_WALLET"),
  platformRevenueWallet: readOptionalString("PLATFORM_REVENUE_WALLET"),
  platformOperationsWallet: readOptionalString("PLATFORM_OPERATIONS_WALLET"),
  platformRewardsWallet: readOptionalString("PLATFORM_REWARDS_WALLET"),
  treasurySolWallet: readOptionalString("TREASURY_SOL_WALLET"),
  treasuryCathAccount: readOptionalString("TREASURY_CATH_ACCOUNT"),
  scApiUrl: readOptionalString("SC_API_URL"),
  scApiSecret: readOptionalString("SC_API_SECRET"),
  telegramBotToken: readOptionalString("TELEGRAM_BOT_TOKEN"),
  telegramQuizChatId: readOptionalString("TELEGRAM_QUIZ_CHAT_ID"),
  usptoOdpApiKey: readOptionalString("USPTO_ODP_API_KEY"),
  stubLicensed: readBoolean("STUB_LICENSED"),
  isProduction:
    ((readOptionalString("NODE_ENV") as NodeEnv | undefined) ?? "development") === "production",
  isDevelopment:
    ((readOptionalString("NODE_ENV") as NodeEnv | undefined) ?? "development") === "development",
} as const;
