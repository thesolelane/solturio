import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table (required for Replit Auth + Solana wallet)
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),

  // Wallet and verification
  walletAddress: varchar("wallet_address"),
  walletVerified: boolean("wallet_verified").default(false), // Confirmed via signature
  emailVerified: boolean("email_verified").default(false), // 2FA analog - must verify email

  // Solturio-generated Solana wallet (created when first artwork/logo registered)
  walletType: varchar("wallet_type", { length: 20 }), // 'standard' or 'premium'
  walletName: varchar("wallet_name", { length: 50 }), // Full xxx.solturio.sol name
  customName: varchar("custom_name", { length: 32 }), // Custom portion if premium
  solanaPublicKey: varchar("solana_public_key"), // Public key (wallet address)
  solanaEncryptedPrivateKey: text("solana_encrypted_private_key"), // Encrypted private key
  walletSalt: varchar("wallet_salt"), // Unique salt for key encryption
  solanaWalletCreatedAt: timestamp("solana_wallet_created_at"), // When wallet was generated
  walletFundingTxHash: varchar("wallet_funding_tx_hash"), // Transaction hash of 0.1/0.15 SOL payment

  // Key Handover Ceremony tracking
  ceremonyCompleted: boolean("ceremony_completed").default(false),
  ceremonyStages: jsonb("ceremony_stages"), // Track which stages completed with timestamps
  recoveryPhraseVerified: boolean("recovery_phrase_verified").default(false),
  verificationAttempts: integer("verification_attempts").default(0),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  hasExportedPrivateKey: boolean("has_exported_private_key").default(false), // Track if user exported key
  encryptedRecoveryPhrase: text("encrypted_recovery_phrase"), // Temporarily stored during ceremony, cleared after completion
  recoveryPhraseShownAt: timestamp("recovery_phrase_shown_at"), // When phrase was displayed (Stage 4 audit trail)

  // Social media handles (for community engagement)
  twitterHandle: varchar("twitter_handle"),
  telegramHandle: varchar("telegram_handle"),
  discordHandle: varchar("discord_handle"),
  instagramHandle: varchar("instagram_handle"),
  telegramGroupLink: varchar("telegram_group_link"), // TG group/channel link
  websiteUrl: varchar("website_url"),
  bio: text("bio"), // Company or community bio

  // Account preferences
  notifyPaymentsDue: boolean("notify_payments_due").default(true),
  notifyRentalReminders: boolean("notify_rental_reminders").default(true),

  // Account status and subscription (REGULATORY: Non-refundable service fee, not custody)
  accountStatus: varchar("account_status", { length: 20 }).default("pending"), // pending, active, expired, admin
  isAdmin: boolean("is_admin").default(false), // Admin accounts bypass payment
  subscriptionTier: varchar("subscription_tier", { length: 20 }), // standard, premium
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  subscriptionPaymentTx: varchar("subscription_payment_tx"), // $CATH payment transaction hash
  subscriptionPaidAt: timestamp("subscription_paid_at"),
  subscriptionPricePaid: varchar("subscription_price_paid"), // Amount of $CATH paid
  wasPromoPrice: boolean("was_promo_price").default(false), // True if paid launch promo price

  // License fee tracking (SOL only, pay after SC creation)
  pendingLicenseFee: varchar("pending_license_fee"), // Outstanding license SC fee in SOL
  pendingLicenseFeeCount: integer("pending_license_fee_count").default(0), // Number of unpaid SCs
  totalLicenseFeePaid: varchar("total_license_fee_paid").default("0"), // Total SOL paid for licenses

  // $SLTR Rewards (REGULATORY: Utility rewards only, no investment language)
  sltrBalance: varchar("sltr_balance").default("0"), // Accumulated $SLTR tokens
  sltrTotalEarned: varchar("sltr_total_earned").default("0"), // Lifetime earnings
  sltrClaimedAmount: varchar("sltr_claimed_amount").default("0"), // Amount claimed via Streamflow
  lastSltrClaimAt: timestamp("last_sltr_claim_at"),
  earlyAdopterMultiplier: integer("early_adopter_multiplier").default(1), // 1x, 2x, 3x, 5x based on signup order

  // Referral system
  referralCode: varchar("referral_code", { length: 20 }).unique(), // Unique referral code
  referredBy: varchar("referred_by"), // Referral code of who referred this user
  referralCount: integer("referral_count").default(0), // Number of successful referrals
  referralRewardsEarned: varchar("referral_rewards_earned").default("0"), // $SLTR from referrals

  // Profile completion tracking (for rewards)
  profileCompletedAt: timestamp("profile_completed_at"),
  socialsLinkedAt: timestamp("socials_linked_at"),
  firstImageUploadedAt: timestamp("first_image_uploaded_at"),

  // Discoverability
  isDiscoverable: boolean("is_discoverable").default(true), // Show in public search

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

// Visitor accounts (email-only signup for search/quiz access)
// Rewards accumulate but can only be claimed after upgrading to full user account
// Rewards expire 30 days from last login
export const visitorAccounts = pgTable("visitor_accounts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: varchar("verification_token"),
  verificationTokenExpiresAt: timestamp("verification_token_expires_at"),
  sessionToken: varchar("session_token"), // Short-lived token for authenticated requests

  // Quiz rewards (pending until upgrade to full account)
  pendingSoltRewards: varchar("pending_solt_rewards").default("0"),
  pendingGamePoints: integer("pending_game_points").default(0),
  pendingExperiencePoints: integer("pending_experience_points").default(0),
  currentStreak: integer("current_streak").default(0),
  highestStreak: integer("highest_streak").default(0),
  questionsAnswered: integer("questions_answered").default(0),
  correctAnswers: integer("correct_answers").default(0),

  // Reward expiration tracking (30 days from last login)
  lastLoginAt: timestamp("last_login_at").defaultNow(),
  rewardsExpireAt: timestamp("rewards_expire_at"), // Calculated as lastLoginAt + 30 days

  // Newsletter/marketing consent
  marketingOptIn: boolean("marketing_opt_in").default(false),

  // Upgrade tracking
  convertedToUserId: varchar("converted_to_user_id").references(() => users.id),
  convertedAt: timestamp("converted_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVisitorAccountSchema = createInsertSchema(visitorAccounts).omit({
  id: true,
  emailVerified: true,
  verificationToken: true,
  verificationTokenExpiresAt: true,
  pendingSoltRewards: true,
  pendingGamePoints: true,
  pendingExperiencePoints: true,
  currentStreak: true,
  highestStreak: true,
  questionsAnswered: true,
  correctAnswers: true,
  lastLoginAt: true,
  rewardsExpireAt: true,
  convertedToUserId: true,
  convertedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVisitorAccount = z.infer<typeof insertVisitorAccountSchema>;
export type VisitorAccount = typeof visitorAccounts.$inferSelect;

// Logo metadata storage (NO file storage - images in user's .solturio.sol wallet)
export const logos = pgTable("logos", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  collectionId: varchar("collection_id").references(() => collections.id, { onDelete: "set null" }),

  // Link to unified IP assets layer (allows license_contracts to reference any asset type)
  assetId: varchar("asset_id"), // References ip_assets.id (forward reference, constraint added later)

  // File metadata only (actual files in user's XXXXXXX.solturio.sol wallet or external URL)
  fileName: text("file_name").notNull(),
  imageUrl: text("image_url"), // URL where image is hosted (user's wallet, IPFS, etc.)
  userWalletStoragePath: text("user_wallet_storage_path"), // Path in user's .solturio.sol wallet
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: varchar("mime_type").notNull(),
  fileHash: varchar("file_hash").notNull(), // SHA-256 hash for verification

  // IPFS storage (for permanent decentralized storage)
  ipfsHash: varchar("ipfs_hash", { length: 100 }), // IPFS CID for image file
  ipfsMetadataHash: varchar("ipfs_metadata_hash", { length: 100 }), // IPFS hash for metadata JSON
  verifiedIpfsHash: varchar("verified_ipfs_hash", { length: 100 }), // IPFS hash for verified image with badge overlay

  // Arweave storage (permanent, one-time payment)
  arweaveUrl: text("arweave_url"), // Permanent Arweave URL for verified badge image (shareable)

  // Auto-extracted metadata
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  format: varchar("format").notNull(), // PNG, SVG, JPG, etc
  colorPalette: text("color_palette").array(), // Array of hex color codes
  dominantColor: varchar("dominant_color"),

  // Registration template and questionnaire data
  registrationType: varchar("registration_type", { length: 20 }), // 'token_launch' or 'artwork'
  registrationData: jsonb("registration_data"), // Smart questionnaire responses

  // Token-specific fields (for token_launch registrations)
  tokenName: text("token_name"),
  tokenTicker: varchar("token_ticker", { length: 20 }),
  launchPlatform: varchar("launch_platform", { length: 50 }), // 'pumpfun', 'raydium', 'jupiter', etc.
  launchTimeline: varchar("launch_timeline", { length: 50 }), // '1_month', '1_2_months', '2plus_months'

  // Contract Address (added post-launch when token is deployed)
  tokenContractAddress: varchar("token_contract_address", { length: 100 }), // Solana CA
  tokenContractChain: varchar("token_contract_chain", { length: 20 }), // 'solana', 'ethereum', etc.
  tokenContractAddedAt: timestamp("token_contract_added_at"), // When CA was bound
  tokenPoolAddress: varchar("token_pool_address", { length: 100 }), // Optional: DEX pool/pair address

  // Verified media versions (with embedded CA metadata)
  verifiedMediaVersions: jsonb("verified_media_versions"), // Array of { type, originalHash, verifiedHash, ipfsHash, timestamp }

  // 24-Hour Ticker Verification System
  tickerVerificationUrls: text("ticker_verification_urls").array(), // Social media URLs proving usage
  tickerVerified: boolean("ticker_verified").default(false),
  tickerVerificationStartedAt: timestamp("ticker_verification_started_at"),
  tickerVerificationDeadline: timestamp("ticker_verification_deadline"),
  botVerificationStatus: varchar("bot_verification_status", { length: 20 }), // 'pending', 'verified', 'failed'

  // Smart Contract
  smartContractHash: varchar("smart_contract_hash"),
  smartContractCreatedAt: timestamp("smart_contract_created_at"),

  // Thumbnail storage (platform stores only thumbnails, not full images)
  thumbnailUrl: text("thumbnail_url"), // Solturio-stored thumbnail
  thumbnailSize: integer("thumbnail_size"), // Thumbnail file size in bytes

  // Ownership claim data (timestamped)
  ownershipClaimedAt: timestamp("ownership_claimed_at").notNull().defaultNow(),
  ownershipDescription: text("ownership_description"), // Complete description of ownership and use
  intendedUse: text("intended_use"), // How the logo will be used

  // IP Protection metadata
  copyrightStatus: varchar("copyright_status", { length: 50 }), // pre_filing, pending, registered
  copyrightApplicationNumber: varchar("copyright_application_number"),
  copyrightFilingDate: timestamp("copyright_filing_date"),

  trademarkStatus: varchar("trademark_status", { length: 50 }), // pre_filing, pending, registered
  trademarkApplicationNumber: varchar("trademark_application_number"),
  trademarkFilingDate: timestamp("trademark_filing_date"),

  patentStatus: varchar("patent_status", { length: 50 }), // pre_filing, pending, registered
  patentApplicationNumber: varchar("patent_application_number"),
  patentFilingDate: timestamp("patent_filing_date"),

  // User-provided metadata
  description: text("description"), // Extended to text for complete descriptions
  tags: text("tags").array(),

  // NFT data (JSON metadata only - no image storage)
  nftAddress: varchar("nft_address"),
  mintedAt: timestamp("minted_at"),
  transactionHash: varchar("transaction_hash"),
  blockchainMetadataJson: jsonb("blockchain_metadata_json"), // Complete JSON stored on-chain

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLogoSchema = createInsertSchema(logos)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    ownershipClaimedAt: true,
    nftAddress: true,
    mintedAt: true,
    transactionHash: true,
    blockchainMetadataJson: true,
  })
  .extend({
    fileHash: z.string().min(1, "File hash is required"),
    ownershipDescription: z.string().optional(),
    intendedUse: z.string().optional(),
    copyrightStatus: z.enum(["pre_filing", "pending", "registered", "none"]).optional(),
    trademarkStatus: z.enum(["pre_filing", "pending", "registered", "none"]).optional(),
    patentStatus: z.enum(["pre_filing", "pending", "registered", "none"]).optional(),
  });

export type InsertLogo = z.infer<typeof insertLogoSchema>;
export type Logo = typeof logos.$inferSelect;

// Collection/batch of logos
export const collections = pgTable("collections", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Collection metadata
  name: text("name").notNull(),
  description: text("description"),
  symbol: varchar("symbol", { length: 10 }),
  companyName: varchar("company_name").notNull(),
  copyrightYear: integer("copyright_year"),

  // Blockchain data
  collectionAddress: varchar("collection_address"),
  transactionHash: varchar("transaction_hash"),
  explorerUrl: text("explorer_url"),

  // IPFS data (collection-level metadata)
  ipfsMetadataHash: varchar("ipfs_metadata_hash", { length: 100 }), // IPFS CID for collection metadata JSON
  nftMetadataJson: jsonb("nft_metadata_json"), // Complete NFT metadata with all file hashes

  // Status
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, pending, minted, failed
  mintedAt: timestamp("minted_at"),

  // Privacy settings
  isPublic: boolean("is_public").notNull().default(true), // Whether collection appears in public search

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCollectionSchema = createInsertSchema(collections)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    collectionAddress: true,
    transactionHash: true,
    explorerUrl: true,
    mintedAt: true,
  })
  .extend({
    name: z.string().min(1, "Collection name is required"),
    companyName: z.string().min(1, "Company name is required"),
    symbol: z.string().max(10, "Symbol must be 10 characters or less").optional(),
    copyrightYear: z
      .number()
      .int()
      .min(1900)
      .max(new Date().getFullYear() + 1)
      .optional(),
  });

export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type Collection = typeof collections.$inferSelect;

// Payment records (crypto payments)
export const payments = pgTable("payments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  collectionId: varchar("collection_id").references(() => collections.id, { onDelete: "set null" }),
  logoId: varchar("logo_id").references(() => logos.id, { onDelete: "set null" }), // For monthly rental payments

  // Blockchain transaction data
  transactionSignature: varchar("transaction_signature").unique(),
  fromWallet: varchar("from_wallet").notNull(),
  toWallet: varchar("to_wallet").notNull(),

  // Payment details
  amount: varchar("amount").notNull(), // Amount as string to preserve decimal precision
  tokenType: varchar("token_type", { length: 10 }).notNull(), // SOL or CATH
  status: varchar("status", { length: 20 }).notNull(), // pending, confirmed, failed

  // Payment type
  paymentType: varchar("payment_type", { length: 20 }).notNull(), // minting, rental

  // Metadata
  logoCount: integer("logo_count"),
  pricingTier: varchar("pricing_tier", { length: 50 }),
  rentalMonths: integer("rental_months"), // For rental payments

  // Blockchain confirmation
  blockNumber: integer("block_number"),
  confirmedAt: timestamp("confirmed_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Contract Bindings table - ties logos to contract addresses with verification levels
export const contractBindings = pgTable("contract_bindings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  logoId: varchar("logo_id")
    .notNull()
    .references(() => logos.id, { onDelete: "cascade" }),
  contractAddress: varchar("contract_address").notNull(),
  chainId: integer("chain_id").notNull().default(1),
  verificationLevel: varchar("verification_level").notNull().default("standard"), // gold, silver, standard
  prelaunchRegistration: boolean("prelaunch_registration").notNull().default(false),
  deploymentDate: timestamp("deployment_date"),
  deploymentTxHash: varchar("deployment_tx_hash"),
  ipfsProofUrl: varchar("ipfs_proof_url"),
  bindingDate: timestamp("binding_date")
    .notNull()
    .default(sql`now()`),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`now()`),
});

export const insertContractBindingSchema = createInsertSchema(contractBindings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  bindingDate: true,
});

export type InsertContractBinding = z.infer<typeof insertContractBindingSchema>;
export type ContractBinding = typeof contractBindings.$inferSelect;

// Authorized usage tracking
export const authorizedUsages = pgTable("authorized_usages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  logoId: varchar("logo_id")
    .notNull()
    .references(() => logos.id, { onDelete: "cascade" }),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Usage location
  usageUrl: text("usage_url").notNull(), // Where the logo is being used
  usageType: varchar("usage_type", { length: 50 }), // website, social_media, print, merchandise, etc
  usagePlatform: varchar("usage_platform", { length: 100 }), // Twitter, DEXScreener, company website, etc

  // Verification
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  lastScanned: timestamp("last_scanned"),

  // Status
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive, pending_verification
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAuthorizedUsageSchema = createInsertSchema(authorizedUsages)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    isVerified: true,
    verifiedAt: true,
  })
  .extend({
    usageUrl: z.string().url("Must be a valid URL"),
  });

export type InsertAuthorizedUsage = z.infer<typeof insertAuthorizedUsageSchema>;
export type AuthorizedUsage = typeof authorizedUsages.$inferSelect;

// Organizations/Platforms that accept IP claims
export const organizations = pgTable("organizations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Organization details
  name: varchar("name").notNull().unique(),
  category: varchar("category").notNull(), // dex, social_media, regulatory, legal
  platform: varchar("platform"), // DexScreener, Twitter, Telegram, TikTok, etc.

  // Contact information
  contactEmail: text("contact_email"),
  dmcaEmail: text("dmca_email"), // Specific email for DMCA/IP claims
  contactPhone: varchar("contact_phone"),
  supportUrl: text("support_url"),

  // Submission details
  submissionUrl: text("submission_url"), // URL for claim submission forms
  apiEndpoint: text("api_endpoint"), // API endpoint if available
  responseTime: varchar("response_time"), // Typical response time (e.g., "24-48 hours")

  // Requirements
  requiresLegalName: boolean("requires_legal_name").default(false),
  requiresRegistrationNumber: boolean("requires_registration_number").default(false),
  acceptedDocuments: text("accepted_documents").array(), // PDF, image, etc.

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Organization = typeof organizations.$inferSelect;

// Copycat Reports with comprehensive tracking
export const copycatReports = pgTable("copycat_reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  logoId: varchar("logo_id")
    .notNull()
    .references(() => logos.id, { onDelete: "cascade" }),

  // Report type
  reportType: varchar("report_type").notNull().default("token"), // token, telegram, twitter, website, discord, other

  // Copycat details (optional based on report type)
  copycatContractAddress: varchar("copycat_contract_address"), // Required for token reports
  copycatTicker: varchar("copycat_ticker"),
  copycatName: varchar("copycat_name"),
  chainId: integer("chain_id").notNull().default(1),

  // Social media links of copycat (main offending URL)
  copycatTwitter: text("copycat_twitter"),
  copycatTelegram: text("copycat_telegram"),
  copycatWebsite: text("copycat_website"),
  copycatTiktok: text("copycat_tiktok"),
  copycatFacebook: text("copycat_facebook"),
  copycatInstagram: text("copycat_instagram"),
  copycatDiscord: text("copycat_discord"),

  // Platform where copycat was found
  foundOnPlatform: varchar("found_on_platform"), // DexScreener, Raydium, Twitter, Telegram, etc.
  foundOnUrl: text("found_on_url"), // Direct link to copycat listing

  // Evidence
  screenshotUrl: text("screenshot_url"),
  evidenceDescription: text("evidence_description"),
  evidenceUrl: text("evidence_url"), // Main evidence URL
  similarityScore: integer("similarity_score"), // 0-100 percentage

  // Report status
  status: varchar("status").notNull().default("pending"), // pending, submitted, resolved, rejected
  submittedToOrgs: text("submitted_to_orgs").array(), // Organization IDs

  // User's Solturio registration proof
  registrationNumber: varchar("registration_number"),
  registrationDate: timestamp("registration_date"),
  ipfsProofUrl: text("ipfs_proof_url"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCopycatReportSchema = createInsertSchema(copycatReports)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    status: true,
    registrationNumber: true,
    registrationDate: true,
    ipfsProofUrl: true,
    submittedToOrgs: true,
    similarityScore: true,
  })
  .extend({
    reportType: z.enum(["token", "telegram", "twitter", "website", "discord", "other"]),
  });

export type InsertCopycatReport = z.infer<typeof insertCopycatReportSchema>;
export type CopycatReport = typeof copycatReports.$inferSelect;

// Outreach Letters sent to organizations
export const outreachLetters = pgTable("outreach_letters", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  reportId: varchar("report_id")
    .notNull()
    .references(() => copycatReports.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id")
    .notNull()
    .references(() => organizations.id),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Letter details
  templateType: varchar("template_type").notNull(), // dmca, cease_desist, takedown_request
  letterSubject: text("letter_subject").notNull(),
  letterBody: text("letter_body").notNull(),

  // User customization
  userContactName: varchar("user_contact_name"),
  userContactEmail: varchar("user_contact_email"),
  userContactPhone: varchar("user_contact_phone"),
  userCompanyName: varchar("user_company_name"),

  // Sending details
  sentAt: timestamp("sent_at"),
  sentVia: varchar("sent_via"), // email, api, form_submission
  responseReceived: boolean("response_received").default(false),
  responseDate: timestamp("response_date"),
  responseNotes: text("response_notes"),

  // Status
  status: varchar("status").notNull().default("draft"), // draft, sent, responded, resolved

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type OutreachLetter = typeof outreachLetters.$inferSelect;

// Variation Protections - similar names/tickers to protect against
export const variationProtections = pgTable("variation_protections", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  logoId: varchar("logo_id")
    .notNull()
    .references(() => logos.id, { onDelete: "cascade" }),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Original
  originalTicker: varchar("original_ticker").notNull(),
  originalName: varchar("original_name"),

  // Protected variation
  variationTicker: varchar("variation_ticker"),
  variationName: varchar("variation_name"),
  variationType: varchar("variation_type"), // dots, spaces, similar_chars, abbreviation

  // Examples: $CATH protects $C.A.T.H, $C-A-T-H, $C4TH, etc.
  isAutoGenerated: boolean("is_auto_generated").default(false),
  isApproved: boolean("is_approved").default(true),

  createdAt: timestamp("created_at").defaultNow(),
});

export type VariationProtection = typeof variationProtections.$inferSelect;

// Quiz questions for IP education
export const quizQuestions = pgTable("quiz_questions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  category: varchar("category", { length: 100 }).notNull(), // USPTO Trademarks, WIPO Basics, EUIPO Rights, EPO Patents, etc
  difficulty: varchar("difficulty", { length: 20 }).notNull(), // easy, medium, hard, expert
  points: integer("points").notNull(), // 100, 200, 300, 400, 500

  question: text("question").notNull(),
  options: text("options").array().notNull(), // Multiple choice options [A, B, C, D]
  answer: text("answer").notNull(), // The correct option
  hint: text("hint"), // Hint text that helps eliminate 2 wrong answers
  explanation: text("explanation"), // Detailed explanation with source

  sourceAuthority: varchar("source_authority", { length: 50 }), // USPTO, WIPO, EUIPO, EPO
  sourceUrl: text("source_url"), // Link to official source
  sourceCitation: text("source_citation"), // Official document citation

  roundNumber: integer("round_number"), // 1-3 (for progressive difficulty)
  questionOrder: integer("question_order"), // 1-15 (position in round)

  usageCount: integer("usage_count").default(0), // Track how often used
  correctCount: integer("correct_count").default(0), // Track correct answers
  hintUsageCount: integer("hint_usage_count").default(0), // Track hint usage

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type QuizQuestion = typeof quizQuestions.$inferSelect;

// User quiz attempts (now supports both registered users and Telegram-only users)
export const quizAttempts = pgTable("quiz_attempts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Optional - for registered users

  // Telegram user identification (for non-registered users)
  telegramUserId: varchar("telegram_user_id"),
  telegramUsername: varchar("telegram_username"),
  telegramFirstName: varchar("telegram_first_name"),

  questionId: varchar("question_id")
    .notNull()
    .references(() => quizQuestions.id),

  userAnswer: text("user_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  pointsEarned: integer("points_earned").notNull(),
  cathReward: varchar("cath_reward"), // Amount of $CATH earned (as string for precision)

  hintUsed: boolean("hint_used").default(false), // Track if hint was used
  pointsBeforeHint: integer("points_before_hint"), // Original points before 75% reduction

  timeToAnswer: integer("time_to_answer"), // Time in seconds
  battleId: varchar("battle_id"), // If part of a battle

  createdAt: timestamp("created_at").defaultNow(),
});

export type QuizAttempt = typeof quizAttempts.$inferSelect;

// User quiz stats and leaderboard (supports both registered users and Telegram-only users)
export const quizStats = pgTable("quiz_stats", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),

  // Telegram user identification (for linking)
  telegramUserId: varchar("telegram_user_id"),
  telegramUsername: varchar("telegram_username"),
  telegramFirstName: varchar("telegram_first_name"),

  totalQuestions: integer("total_questions").default(0).notNull(),
  correctAnswers: integer("correct_answers").default(0).notNull(),
  totalPoints: integer("total_points").default(0).notNull(),
  totalCathEarned: varchar("total_cath_earned").default("0"), // Total $CATH earned from quizzes

  // Daily stats (reset daily)
  dailyPoints: integer("daily_points").default(0).notNull(),
  dailyCorrectAnswers: integer("daily_correct_answers").default(0).notNull(),
  dailyQuestionsAnswered: integer("daily_questions_answered").default(0).notNull(),
  lastDailyReset: timestamp("last_daily_reset").defaultNow(),

  streak: integer("streak").default(0), // Current correct answer streak
  longestStreak: integer("longest_streak").default(0),

  lastQuizAt: timestamp("last_quiz_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type QuizStats = typeof quizStats.$inferSelect;

// Telegram-only quiz leaderboard (for users who haven't registered on Solturio)
export const telegramLeaderboard = pgTable("telegram_leaderboard", {
  telegramUserId: varchar("telegram_user_id").primaryKey(),
  telegramUsername: varchar("telegram_username"),
  telegramFirstName: varchar("telegram_first_name"),

  totalQuestions: integer("total_questions").default(0).notNull(),
  correctAnswers: integer("correct_answers").default(0).notNull(),
  totalPoints: integer("total_points").default(0).notNull(),
  totalExperience: integer("total_experience").default(0).notNull(), // Separate exp tracking (2nd/3rd/4th/5th+ place rewards)

  // Daily stats (reset daily)
  dailyPoints: integer("daily_points").default(0).notNull(),
  dailyExperience: integer("daily_experience").default(0).notNull(),
  dailyCorrectAnswers: integer("daily_correct_answers").default(0).notNull(),
  dailyQuestionsAnswered: integer("daily_questions_answered").default(0).notNull(),
  lastDailyReset: timestamp("last_daily_reset").defaultNow(),

  streak: integer("streak").default(0),
  longestStreak: integer("longest_streak").default(0),

  lastQuizAt: timestamp("last_quiz_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TelegramLeaderboard = typeof telegramLeaderboard.$inferSelect;

// Treasury Wallets - Platform treasury wallet management
export const treasuryWallets = pgTable("treasury_wallets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Wallet identity
  role: varchar("role", { length: 20 }).notNull(), // funds, rewards, escrow, bank
  name: varchar("name").notNull(), // Display name (e.g., "Platform Operations")
  address: varchar("address").notNull().unique(), // Solana wallet address
  domainName: varchar("domain_name"), // e.g., "funds.solturio.sol"
  purpose: text("purpose"), // Description of wallet's purpose

  // Network configuration
  network: varchar("network", { length: 20 }).notNull().default("devnet"), // devnet, mainnet

  // Sweep policy (for automated fund routing to bank.cooperanth.sol)
  sweepEnabled: boolean("sweep_enabled").default(false),
  sweepThreshold: varchar("sweep_threshold"), // Amount in SOL that triggers sweep (as string for precision)
  sweepSchedule: varchar("sweep_schedule"), // cron expression or 'manual', 'daily', 'weekly'
  sweepDestination: varchar("sweep_destination"), // Target wallet for sweeps (usually bank.cooperanth.sol)
  lastSweepAt: timestamp("last_sweep_at"),
  lastSweepAmount: varchar("last_sweep_amount"),
  lastSweepTxHash: varchar("last_sweep_tx_hash"),

  // Multi-sig configuration
  requiredSignatures: integer("required_signatures").default(2), // e.g., 2-of-3
  authorizedSigners: text("authorized_signers").array(), // Array of authorized signer addresses

  // Status and monitoring
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive, pending_setup
  lastBalanceCheck: timestamp("last_balance_check"),
  cachedBalance: varchar("cached_balance"), // Last known SOL balance (string for precision)

  // Audit
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTreasuryWalletSchema = createInsertSchema(treasuryWallets)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastBalanceCheck: true,
    cachedBalance: true,
    lastSweepAt: true,
    lastSweepAmount: true,
    lastSweepTxHash: true,
  })
  .extend({
    role: z.enum(["funds", "rewards", "escrow", "bank"]),
    network: z.enum(["devnet", "mainnet"]),
    address: z.string().min(32, "Valid Solana address required"),
  });

export type InsertTreasuryWallet = z.infer<typeof insertTreasuryWalletSchema>;
export type TreasuryWallet = typeof treasuryWallets.$inferSelect;

// Compliance Logs - Immutable audit trail for AML/KYC compliance
export const complianceLogs = pgTable("compliance_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Transaction identification
  txSignature: varchar("tx_signature"), // Solana transaction signature
  slot: integer("slot"), // Solana slot number
  blockTime: timestamp("block_time"), // When tx was confirmed on-chain

  // Instruction details
  programId: varchar("program_id"), // Solana program that executed
  instructionType: varchar("instruction_type", { length: 50 }), // deposit, release, refund, dispute, pay_installment

  // Parties involved
  buyerAddress: varchar("buyer_address"),
  sellerAddress: varchar("seller_address"),
  escrowAddress: varchar("escrow_address"),

  // Token details
  tokenMint: varchar("token_mint"),
  tokenType: varchar("token_type", { length: 10 }), // SOL, CATH, BONK
  amount: varchar("amount"), // Amount as string for precision
  usdValue: varchar("usd_value"), // USD value at time of transaction
  pricingSource: varchar("pricing_source"), // Where USD price was obtained

  // Fees
  platformFee: varchar("platform_fee"),
  networkFee: varchar("network_fee"),

  // Trigger tracking (per AML/KYC policy)
  triggersActivated: text("triggers_activated").array(), // Array of trigger IDs that fired
  triggerDetails: jsonb("trigger_details"), // Full math/snapshot of trigger rules
  kycTierRequired: varchar("kyc_tier_required", { length: 10 }), // 0, 1, 2

  // User identification
  userId: varchar("user_id").references(() => users.id),
  userKycTier: varchar("user_kyc_tier", { length: 10 }), // User's KYC tier at time of transaction

  // Compliance actions taken
  actionTaken: varchar("action_taken", { length: 50 }), // allowed, allowed_with_limits, hold_pending_review, blocked
  reviewerId: varchar("reviewer_id").references(() => users.id), // Admin who reviewed (if manual review)
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at"),

  // Case tracking
  caseId: varchar("case_id"), // Link to compliance case if one was created

  createdAt: timestamp("created_at").defaultNow(),
});

export const insertComplianceLogSchema = createInsertSchema(complianceLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertComplianceLog = z.infer<typeof insertComplianceLogSchema>;
export type ComplianceLog = typeof complianceLogs.$inferSelect;

// KYC Status - User verification tier tracking
export const kycStatus = pgTable("kyc_status", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),

  // Current tier: 0 (none), 1 (light KYC), 2 (enhanced due diligence)
  tier: varchar("tier", { length: 10 }).notNull().default("0"),

  // Tier 1 verification data
  idVerificationStatus: varchar("id_verification_status", { length: 20 }), // pending, verified, failed, expired
  idVerificationVendor: varchar("id_verification_vendor"), // KYC provider name
  idVerificationReference: varchar("id_verification_reference"), // External reference ID
  idVerifiedAt: timestamp("id_verified_at"),

  // Sanctions and PEP screening
  sanctionsStatus: varchar("sanctions_status", { length: 20 }), // clear, hit, pending
  sanctionsListVersion: varchar("sanctions_list_version"), // Which sanctions list was checked
  sanctionsScreenedAt: timestamp("sanctions_screened_at"),
  pepStatus: varchar("pep_status", { length: 20 }), // clear, hit, pending (Politically Exposed Person)

  // Risk assessment
  riskTier: varchar("risk_tier", { length: 20 }), // low, medium, high
  riskReasonCodes: text("risk_reason_codes").array(), // Array of reason codes for risk determination
  riskAssessedAt: timestamp("risk_assessed_at"),

  // Tier 2 enhanced due diligence
  sourceOfFunds: varchar("source_of_funds", { length: 50 }), // income, business_revenue, exchange_proceeds, sale_proceeds, other
  sourceOfFundsVerified: boolean("source_of_funds_verified").default(false),
  dealDocumentHash: varchar("deal_document_hash"), // Hash of uploaded deal docs
  dealDocumentUploadedAt: timestamp("deal_document_uploaded_at"),

  // Attestation
  sanctionsAttestationAt: timestamp("sanctions_attestation_at"), // When user attested not acting for sanctioned parties
  tosVersion: varchar("tos_version"), // Version of ToS accepted
  tosAcceptedAt: timestamp("tos_accepted_at"),

  // Limits based on tier
  dailyLimit: varchar("daily_limit"), // USD daily limit
  monthlyLimit: varchar("monthly_limit"), // USD monthly limit
  singleTxLimit: varchar("single_tx_limit"), // USD per-transaction limit

  // Cumulative tracking for trigger rules
  rolling30DayVolume: varchar("rolling_30_day_volume").default("0"), // USD volume in last 30 days
  last30DayVolumeUpdatedAt: timestamp("last_30_day_volume_updated_at"),

  // Status
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, suspended, blocked
  statusReason: text("status_reason"),

  // Manual review notes
  manualReviewRequired: boolean("manual_review_required").default(false),
  manualReviewNotes: text("manual_review_notes"),
  lastReviewedBy: varchar("last_reviewed_by").references(() => users.id),
  lastReviewedAt: timestamp("last_reviewed_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKycStatusSchema = createInsertSchema(kycStatus)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    tier: z.enum(["0", "1", "2"]),
  });

export type InsertKycStatus = z.infer<typeof insertKycStatusSchema>;
export type KycStatus = typeof kycStatus.$inferSelect;

// Compliance Trigger Rules - Configurable thresholds for compliance triggers
export const complianceTriggerRules = pgTable("compliance_trigger_rules", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Trigger identification
  triggerCode: varchar("trigger_code", { length: 50 }).notNull().unique(), // e.g., "VALUE_30DAY_2K", "SINGLE_TX_10K"
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category", { length: 30 }).notNull(), // value, velocity, pricing, concentration, layering

  // Threshold values (in USD unless otherwise specified)
  thresholdValue: varchar("threshold_value"), // Main threshold value
  thresholdPeriodDays: integer("threshold_period_days"), // Period for rolling thresholds (e.g., 30 for 30-day)
  thresholdCount: integer("threshold_count"), // For frequency triggers (e.g., 8 payments)
  thresholdMultiplier: varchar("threshold_multiplier"), // For ratio triggers (e.g., 5x, 10x)
  thresholdPercentage: integer("threshold_percentage"), // For concentration triggers (e.g., 60%)

  // Action when triggered
  requiredTier: varchar("required_tier", { length: 10 }).notNull(), // KYC tier required: 1, 2
  requiresDocuments: boolean("requires_documents").default(false),
  requiresManualReview: boolean("requires_manual_review").default(false),

  // Severity
  severity: varchar("severity", { length: 20 }).notNull().default("medium"), // low, medium, high

  // Status
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertComplianceTriggerRuleSchema = createInsertSchema(complianceTriggerRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertComplianceTriggerRule = z.infer<typeof insertComplianceTriggerRuleSchema>;
export type ComplianceTriggerRule = typeof complianceTriggerRules.$inferSelect;

// Compliance Cases - Case management for flagged transactions
export const complianceCases = pgTable("compliance_cases", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Case identification
  caseNumber: varchar("case_number").notNull().unique(), // e.g., "CASE-2024-0001"
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),

  // Associated logs
  triggeringLogIds: text("triggering_log_ids").array(), // Compliance log IDs that created this case

  // Case details
  caseType: varchar("case_type", { length: 30 }).notNull(), // threshold_breach, sanctions_hit, manual_escalation
  triggersActivated: text("triggers_activated").array(), // Array of trigger codes
  totalAmount: varchar("total_amount"), // Total USD amount involved

  // Evidence
  evidenceAttached: jsonb("evidence_attached"), // Array of evidence documents/tx records
  ruleSnapshot: jsonb("rule_snapshot"), // Snapshot of trigger rules at time of case creation

  // Status
  status: varchar("status", { length: 30 }).notNull().default("open"), // open, under_review, pending_info, resolved, closed

  // Decision
  decision: varchar("decision", { length: 30 }), // allow, allow_with_limits, hold, block, offboard
  decisionReason: text("decision_reason"),
  decisionMadeBy: varchar("decision_made_by").references(() => users.id),
  decisionMadeAt: timestamp("decision_made_at"),

  // Assignment
  assignedTo: varchar("assigned_to").references(() => users.id), // Admin assigned to review
  assignedAt: timestamp("assigned_at"),

  // Priority
  priority: varchar("priority", { length: 10 }).notNull().default("medium"), // low, medium, high, critical
  dueDate: timestamp("due_date"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertComplianceCaseSchema = createInsertSchema(complianceCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertComplianceCase = z.infer<typeof insertComplianceCaseSchema>;
export type ComplianceCase = typeof complianceCases.$inferSelect;

// ============================================================================
// NEW PAYMENT MODEL TABLES (REGULATORY: Non-refundable service revenue)
// ============================================================================

// Platform Configuration - Admin-controlled settings
export const platformConfig = pgTable("platform_config", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PlatformConfig = typeof platformConfig.$inferSelect;

// Accepted Tokens Registry - Three-tier token system
export const acceptedTokens = pgTable("accepted_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Token identity
  symbol: varchar("symbol", { length: 20 }).notNull().unique(), // CATH, SOL, BONK, etc.
  name: varchar("name").notNull(),
  mintAddress: varchar("mint_address").notNull().unique(), // Solana mint address
  decimals: integer("decimals").notNull().default(9),
  logoUrl: text("logo_url"),

  // Tier classification (REGULATORY: Platform controls accepted payment methods)
  tier: varchar("tier", { length: 20 }).notNull(), // primary, whitelisted, community

  // Payment permissions
  allowedForAccess: boolean("allowed_for_access").default(false), // Can pay for platform access
  allowedForLicensing: boolean("allowed_for_licensing").default(false), // Can pay for license SCs

  // Status
  isActive: boolean("is_active").default(false), // Toggle on/off
  activatedAt: timestamp("activated_at"),
  deactivatedAt: timestamp("deactivated_at"),

  // Price source
  priceSource: varchar("price_source", { length: 50 }), // jupiter, raydium, manual
  lastPriceUsd: varchar("last_price_usd"), // Cached USD price
  lastPriceUpdatedAt: timestamp("last_price_updated_at"),

  // Community token metadata (Tier 3 only)
  communityWebsite: text("community_website"),
  communityTwitter: varchar("community_twitter"),
  communityTelegram: varchar("community_telegram"),
  communityDiscord: varchar("community_discord"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAcceptedTokenSchema = createInsertSchema(acceptedTokens)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    activatedAt: true,
    deactivatedAt: true,
    lastPriceUpdatedAt: true,
  })
  .extend({
    tier: z.enum(["primary", "whitelisted", "community"]),
  });

export type InsertAcceptedToken = z.infer<typeof insertAcceptedTokenSchema>;
export type AcceptedToken = typeof acceptedTokens.$inferSelect;

// Token Applications - Community tokens applying for acceptance
export const tokenApplications = pgTable("token_applications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // Token info
  symbol: varchar("symbol", { length: 20 }).notNull(),
  name: varchar("name").notNull(),
  mintAddress: varchar("mint_address").notNull(),
  decimals: integer("decimals").notNull().default(9),
  logoUrl: text("logo_url"),

  // Community info
  website: text("website"),
  twitter: varchar("twitter"),
  telegram: varchar("telegram"),
  discord: varchar("discord"),

  // Verification criteria
  tokenAgeMonths: integer("token_age_months"), // Must be 6+ months old
  dailyVolume: varchar("daily_volume"), // Estimated daily trading volume
  holderCount: integer("holder_count"), // Number of holders

  // Applicant
  applicantUserId: varchar("applicant_user_id").references(() => users.id),
  applicantEmail: varchar("applicant_email"),
  applicantNotes: text("applicant_notes"),

  // Review status
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  rejectionReason: text("rejection_reason"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTokenApplicationSchema = createInsertSchema(tokenApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNotes: true,
  rejectionReason: true,
});

export type InsertTokenApplication = z.infer<typeof insertTokenApplicationSchema>;
export type TokenApplication = typeof tokenApplications.$inferSelect;

// Rewards Log - Track all $SLTR reward events (REGULATORY: Utility rewards only)
export const rewardsLog = pgTable("rewards_log", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Reward details
  actionType: varchar("action_type", { length: 50 }).notNull(), // profile_complete, image_upload, sc_create, referral, quiz_win, social_post
  baseAmount: varchar("base_amount").notNull(), // Base $SLTR amount before multiplier
  multiplier: integer("multiplier").notNull().default(1), // Early adopter multiplier
  finalAmount: varchar("final_amount").notNull(), // Final $SLTR credited

  // Context
  relatedEntityId: varchar("related_entity_id"), // Logo ID, SC ID, etc.
  relatedEntityType: varchar("related_entity_type", { length: 30 }), // logo, license, referral, quiz

  // For referrals
  referredUserId: varchar("referred_user_id"),

  // For social rewards
  socialPlatform: varchar("social_platform", { length: 30 }), // twitter, telegram
  socialPostUrl: text("social_post_url"),

  createdAt: timestamp("created_at").defaultNow(),
});

export type RewardsLog = typeof rewardsLog.$inferSelect;

// ============================================================================
// LICENSE SMART CONTRACTS - Comprehensive IP licensing system
// ============================================================================

// License Types
export const LICENSE_TYPES = {
  EXCLUSIVE: "exclusive", // Only licensee can use
  NON_EXCLUSIVE: "non_exclusive", // Licensor can license to others
  WORK_FOR_HIRE: "work_for_hire", // Licensee paid for full rights, may transfer
  FULL_TRANSFER: "full_transfer", // Complete ownership transfer
} as const;

// Platform Permission Bitmap (12 bits)
export const PLATFORM_BITS = {
  WEBSITE: 0, // bit 0
  YOUTUBE: 1, // bit 1
  DISCORD: 2, // bit 2
  TIKTOK: 3, // bit 3
  TELEGRAM: 4, // bit 4
  X_TWITTER: 5, // bit 5
  INSTAGRAM: 6, // bit 6
  PRINT_PHYSICAL: 7, // bit 7
  MERCHANDISE: 8, // bit 8
  GAMING_METAVERSE: 9, // bit 9
  NFT_MARKETPLACES: 10, // bit 10
  ADVERTISING: 11, // bit 11
} as const;

// License Templates (quick presets)
export const LICENSE_TEMPLATES = {
  SOCIAL_MEDIA_POST: {
    name: "Social Media Post",
    type: "non_exclusive",
    platformBitmap: (1 << 5) | (1 << 6) | (1 << 3), // X, Instagram, TikTok
    isPerpetual: false,
    durationDays: 365,
    canTransfer: false,
    canSublicense: false,
    canModify: false,
    requiresAttribution: true,
  },
  BRAND_AMBASSADOR: {
    name: "Brand Ambassador",
    type: "non_exclusive",
    platformBitmap: 0b111111111111, // All platforms
    isPerpetual: true,
    canTransfer: false,
    canSublicense: false,
    canModify: true,
    requiresAttribution: true,
  },
  WEBSITE_ONLY: {
    name: "Website Only",
    type: "non_exclusive",
    platformBitmap: 1 << 0, // Website only
    isPerpetual: true,
    canTransfer: false,
    canSublicense: false,
    canModify: false,
    requiresAttribution: false,
  },
  MERCHANDISE: {
    name: "Merchandise License",
    type: "exclusive",
    platformBitmap: (1 << 7) | (1 << 8), // Print + Merchandise
    isPerpetual: false,
    durationDays: 730, // 2 years
    canTransfer: false,
    canSublicense: false,
    canModify: true,
    requiresAttribution: false,
  },
  FULL_BUYOUT: {
    name: "Full Buyout",
    type: "full_transfer",
    platformBitmap: 0b111111111111, // All platforms
    isPerpetual: true,
    canTransfer: true,
    canSublicense: true,
    canModify: true,
    requiresAttribution: false,
  },
  NFT_WEB3: {
    name: "NFT/Web3 Use",
    type: "non_exclusive",
    platformBitmap: (1 << 9) | (1 << 10), // Gaming + NFT marketplaces
    isPerpetual: true,
    canTransfer: false,
    canSublicense: false,
    canModify: false,
    requiresAttribution: true,
  },
} as const;

// International Jurisdiction Templates with region-specific legal requirements
export const JURISDICTION_TEMPLATES = {
  US: {
    code: "US",
    name: "United States",
    version: "1.0",
    governingLaw: "State of Delaware, United States",
    disputeVenue: "Binding arbitration in Wilmington, Delaware, USA",
    requirements: {
      gdprCompliant: false,
      pipedaCompliant: false,
      pdpaCompliant: false,
      appiCompliant: false,
      moralRightsWaived: true, // US allows moral rights waiver
      bilingualRequired: false,
    },
    clauses: {
      arbitration:
        "All disputes shall be resolved through binding arbitration under AAA Commercial Arbitration Rules.",
      jurisdiction: "This agreement is governed by the laws of the State of Delaware, USA.",
      dmca: "Both parties agree to comply with DMCA takedown procedures for IP infringement.",
    },
  },
  EU: {
    code: "EU",
    name: "European Union",
    version: "1.0",
    governingLaw: "Laws of the European Union",
    disputeVenue: "Arbitration in accordance with ICC Rules, Paris, France",
    requirements: {
      gdprCompliant: true,
      gdprDataProcessingAgreed: true,
      gdprWithdrawalRightsAcknowledged: true,
      pipedaCompliant: false,
      pdpaCompliant: false,
      appiCompliant: false,
      moralRightsWaived: false, // EU generally protects moral rights
      bilingualRequired: false,
    },
    clauses: {
      gdprNotice:
        "Personal data will be processed in accordance with GDPR. Data subjects retain rights under Articles 15-22.",
      dataProcessing:
        "Any personal data transferred is subject to appropriate safeguards under GDPR Article 46.",
      withdrawal:
        "Consumers may have withdrawal rights under the Consumer Rights Directive within 14 days.",
      moralRights:
        "Moral rights of the author are preserved and cannot be waived under this agreement.",
      vatStatement:
        "VAT will be applied according to the place of supply rules for digital services.",
    },
  },
  UK: {
    code: "UK",
    name: "United Kingdom",
    version: "1.0",
    governingLaw: "Laws of England and Wales",
    disputeVenue: "Arbitration under LCIA Rules, London, United Kingdom",
    requirements: {
      gdprCompliant: true, // UK GDPR
      gdprDataProcessingAgreed: true,
      gdprWithdrawalRightsAcknowledged: true,
      pipedaCompliant: false,
      pdpaCompliant: false,
      appiCompliant: false,
      moralRightsWaived: false,
      bilingualRequired: false,
    },
    clauses: {
      ukGdpr: "Personal data processing complies with UK GDPR and Data Protection Act 2018.",
      consumerRights: "Consumer Rights Act 2015 protections apply where applicable.",
      withdrawal: "Consumer contracts may be subject to 14-day cancellation rights under CCR 2013.",
      vatStatement: "UK VAT applies to digital services at the standard rate.",
    },
  },
  CA: {
    code: "CA",
    name: "Canada",
    version: "1.0",
    governingLaw: "Federal laws of Canada and laws of Ontario",
    disputeVenue: "Arbitration under ADR Institute of Canada Rules, Toronto, Ontario",
    requirements: {
      gdprCompliant: false,
      pipedaCompliant: true,
      pdpaCompliant: false,
      appiCompliant: false,
      moralRightsWaived: false, // Canada protects moral rights
      bilingualRequired: true, // French language requirements in Quebec
    },
    clauses: {
      pipeda: "Personal information is collected and used in accordance with PIPEDA.",
      moralRights: "Moral rights under the Copyright Act are acknowledged and preserved.",
      bilingual:
        "Pour les utilisateurs du Québec, ce contrat est également disponible en français.",
      antiSpam: "Commercial electronic messages comply with CASL requirements.",
    },
  },
  JP: {
    code: "JP",
    name: "Japan",
    version: "1.0",
    governingLaw: "Laws of Japan",
    disputeVenue: "Arbitration under JCAA Commercial Arbitration Rules, Tokyo, Japan",
    requirements: {
      gdprCompliant: false,
      pipedaCompliant: false,
      pdpaCompliant: false,
      appiCompliant: true,
      moralRightsWaived: false, // Japan strongly protects moral rights
      bilingualRequired: false,
    },
    clauses: {
      appi: "Personal data handling complies with Japan's Act on Protection of Personal Information (APPI).",
      moralRights:
        "The author's moral rights (著作者人格権) under Article 18-20 of the Copyright Act are preserved.",
      crossBorder: "Cross-border data transfers comply with APPI Article 28 requirements.",
      consumerContract: "Consumer Contract Act protections apply where the licensee is a consumer.",
    },
  },
  SG: {
    code: "SG",
    name: "Singapore",
    version: "1.0",
    governingLaw: "Laws of the Republic of Singapore",
    disputeVenue: "Arbitration under SIAC Rules, Singapore",
    requirements: {
      gdprCompliant: false,
      pipedaCompliant: false,
      pdpaCompliant: true,
      appiCompliant: false,
      moralRightsWaived: true,
      bilingualRequired: false,
    },
    clauses: {
      pdpa: "Personal data is collected and used in accordance with the Personal Data Protection Act 2012.",
      consent: "Express consent is obtained for collection, use, and disclosure of personal data.",
      crossBorder: "Data transfers comply with PDPA Transfer Limitation Obligation.",
    },
  },
  AU: {
    code: "AU",
    name: "Australia",
    version: "1.0",
    governingLaw: "Laws of the Commonwealth of Australia",
    disputeVenue: "Arbitration under ACICA Rules, Sydney, Australia",
    requirements: {
      gdprCompliant: false,
      pipedaCompliant: false,
      pdpaCompliant: false,
      appiCompliant: false,
      moralRightsWaived: false, // Australia recognizes moral rights
      bilingualRequired: false,
    },
    clauses: {
      privacyAct:
        "Personal information handling complies with the Privacy Act 1988 and Australian Privacy Principles.",
      moralRights: "Moral rights under Part IX of the Copyright Act 1968 are acknowledged.",
      consumerLaw: "Australian Consumer Law guarantees apply and cannot be excluded.",
      gst: "GST applies to taxable supplies under A New Tax System (Goods and Services Tax) Act 1999.",
    },
  },
  INTL: {
    code: "INTL",
    name: "International (Default)",
    version: "1.0",
    governingLaw: "International commercial law principles (UNIDROIT)",
    disputeVenue: "Arbitration under UNCITRAL Rules, Geneva, Switzerland",
    requirements: {
      gdprCompliant: false,
      pipedaCompliant: false,
      pdpaCompliant: false,
      appiCompliant: false,
      moralRightsWaived: false,
      bilingualRequired: false,
    },
    clauses: {
      general: "This agreement follows international commercial law principles.",
      arbitration: "Disputes resolved under UNCITRAL Arbitration Rules with neutral venue.",
      crossBorder:
        "Parties acknowledge cross-border nature and agree to cooperate on jurisdictional matters.",
    },
  },
} as const;

export type JurisdictionCode = keyof typeof JURISDICTION_TEMPLATES;

// License type descriptions for human-readable contract display
export const LICENSE_TYPE_DESCRIPTIONS = {
  exclusive:
    "Exclusive License - Only the licensee may use this asset during the license term. The licensor retains ownership but cannot license to others.",
  non_exclusive:
    "Non-Exclusive License - The licensee receives rights to use this asset, but the licensor may grant similar rights to others.",
  work_for_hire:
    "Work-for-Hire Agreement - The licensee is commissioning work where the resulting IP belongs to the licensee upon creation.",
  full_transfer:
    "Full Transfer of Rights - Complete assignment of all intellectual property rights from licensor to licensee.",
} as const;

// ISCL - Independent Smart Contract License
// Solturio's branded term for blockchain-verified IP licensing contracts
export const ISCL_VERSION = "1.0.0";
export const ISCL_BRAND_NAME = "ISCL - Independent Smart Contract License";

// Content restriction options for ISCL
export const CONTENT_RESTRICTIONS = {
  NO_ADULT: "no_adult", // Cannot be used in adult/explicit content
  NO_POLITICAL: "no_political", // Cannot be used in political campaigns/ads
  NO_GAMBLING: "no_gambling", // Cannot be used for gambling/betting
  NO_ALCOHOL: "no_alcohol", // Cannot be used to promote alcohol
  NO_TOBACCO: "no_tobacco", // Cannot be used to promote tobacco/vaping
  NO_WEAPONS: "no_weapons", // Cannot be used to promote weapons
  NO_HATE: "no_hate", // Cannot be used in hate speech/discriminatory content
  NO_VIOLENCE: "no_violence", // Cannot be used in violent content
  NO_CRYPTO_SCAM: "no_crypto_scam", // Cannot be used for fraudulent crypto projects
  NO_COMPETITOR: "no_competitor", // Cannot be used by direct competitors
  FAMILY_FRIENDLY: "family_friendly", // Must be suitable for all ages
} as const;

export type ContentRestriction = (typeof CONTENT_RESTRICTIONS)[keyof typeof CONTENT_RESTRICTIONS];

// Edit restriction options for ISCL
export const EDIT_RESTRICTIONS = {
  NO_RESIZE: "no_resize", // Cannot resize/scale
  NO_CROP: "no_crop", // Cannot crop
  NO_COLOR_CHANGE: "no_color_change", // Cannot alter colors
  NO_FILTER: "no_filter", // Cannot apply filters/effects
  NO_OVERLAY: "no_overlay", // Cannot overlay text/graphics
  NO_ANIMATION: "no_animation", // Cannot animate
  NO_3D_RENDER: "no_3d_render", // Cannot render in 3D
  NO_AI_TRAINING: "no_ai_training", // Cannot use for AI/ML training
  MAINTAIN_RATIO: "maintain_ratio", // Must maintain aspect ratio
  MIN_SIZE_REQUIRED: "min_size", // Minimum display size required
} as const;

export type EditRestriction = (typeof EDIT_RESTRICTIONS)[keyof typeof EDIT_RESTRICTIONS];

// ISCL - Independent Smart Contract License (formerly license_contracts)
// Blockchain-verified IP licensing for selling, leasing, or granting permission of registered works
export const licenseContracts = pgTable("license_contracts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  // ===== PARTIES =====
  licensorUserId: varchar("licensor_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  licensorWallet: varchar("licensor_wallet").notNull(), // Signing wallet
  licenseeWallet: varchar("licensee_wallet").notNull(), // Licensee signing wallet
  licenseeEmail: varchar("licensee_email"), // Optional contact
  licenseeName: varchar("licensee_name"), // Licensee display name

  // ===== ASSET =====
  logoId: varchar("logo_id").references(() => logos.id, { onDelete: "cascade" }), // Legacy: for logo licenses (nullable for non-logo assets)
  assetId: varchar("asset_id"), // Unified: references ip_assets.id for any asset type (logo, track, release, code)

  // ===== LICENSE TYPE & TEMPLATE =====
  licenseType: varchar("license_type", { length: 30 }).notNull(), // exclusive, non_exclusive, work_for_hire, full_transfer
  templateUsed: varchar("template_used", { length: 50 }), // Which quick template was used, or 'custom'

  // ===== PLATFORM PERMISSIONS (WHERE) =====
  platformBitmap: integer("platform_bitmap").notNull().default(0), // 12-bit bitmap for platforms
  otherPlatforms: text("other_platforms"), // Custom platforms not in bitmap

  // ===== RIGHTS GRANTED =====
  canTransfer: boolean("can_transfer").notNull().default(false), // Licensee can transfer rights
  canSublicense: boolean("can_sublicense").notNull().default(false), // Licensee can grant sub-licenses
  canModify: boolean("can_modify").notNull().default(false), // Licensee can alter image
  requiresAttribution: boolean("requires_attribution").notNull().default(true), // Must credit creator

  // ===== PERMITTED WALLETS =====
  permittedWallets: text("permitted_wallets").array(), // Additional wallets allowed to use

  // ===== SCOPE & LIMITS =====
  geographicScope: varchar("geographic_scope", { length: 50 }).default("worldwide"), // worldwide, specific regions
  geographicDetails: text("geographic_details"), // If specific regions, list them
  usagePurpose: varchar("usage_purpose", { length: 30 }).default("both"), // personal, commercial, both

  // ===== ISCL SCOPE OF USE (Detailed usage description) =====
  scopeOfUseDescription: text("scope_of_use_description"), // Detailed description of HOW asset will be used (e.g., "background music in trailer scene 3")
  scopeOfUseCategory: varchar("scope_of_use_category", { length: 50 }), // sync, advertising, merchandise, digital, print, broadcast
  specificUsageContext: text("specific_usage_context"), // Exact context (e.g., "30-second TV commercial for summer campaign")

  // ===== ISCL CONTENT RESTRICTIONS =====
  contentRestrictions: text("content_restrictions").array(), // Array of restriction codes from CONTENT_RESTRICTIONS
  contentRestrictionsCustom: text("content_restrictions_custom"), // Additional custom content restrictions

  // ===== ISCL EDIT RESTRICTIONS =====
  editRestrictions: text("edit_restrictions").array(), // Array of edit restriction codes from EDIT_RESTRICTIONS
  editRestrictionsCustom: text("edit_restrictions_custom"), // Additional custom edit restrictions
  minDisplaySize: varchar("min_display_size", { length: 20 }), // Minimum size if MIN_SIZE_REQUIRED (e.g., "100x100px")

  // ===== ISCL APPROVAL REQUIREMENTS =====
  approvalRequired: boolean("approval_required").default(false), // Licensor must approve each use
  approvalProcess: text("approval_process"), // How approval works (e.g., "Email to licensor@email.com, 48hr response")
  approvalTimeframeDays: integer("approval_timeframe_days"), // Days licensor has to respond

  // ===== ISCL ATTRIBUTION/CREDIT REQUIREMENTS =====
  creditRequirements: text("credit_requirements"), // Exact attribution text if requiresAttribution is true
  creditPlacement: varchar("credit_placement", { length: 50 }), // Where credit must appear (footer, credits, watermark)

  // ===== ISCL QUALITY STANDARDS =====
  qualityStandards: text("quality_standards"), // Minimum quality requirements for display
  brandGuidelinesUrl: text("brand_guidelines_url"), // Link to brand guidelines if applicable

  // ===== DURATION =====
  isPerpetual: boolean("is_perpetual").notNull().default(false),
  durationDays: integer("duration_days"), // If not perpetual
  startsAt: timestamp("starts_at"), // When license becomes active
  expiresAt: timestamp("expires_at"), // Calculated expiry

  // ===== EXCLUSIVITY =====
  isExclusivityTimeLimited: boolean("is_exclusivity_time_limited").default(false),
  exclusivityEndsAt: timestamp("exclusivity_ends_at"), // If exclusive but time-limited

  // ===== FINANCIAL TERMS (P2P - Solturio not involved) =====
  hasRevenueShare: boolean("has_revenue_share").default(false),
  royaltyPercentage: varchar("royalty_percentage"), // e.g., "5" for 5%
  paymentTermsHash: varchar("payment_terms_hash", { length: 100 }), // IPFS hash of detailed payment terms
  upfrontPaymentAmount: varchar("upfront_payment_amount"), // Any upfront P2P payment
  upfrontPaymentCurrency: varchar("upfront_payment_currency", { length: 10 }), // SOL, USDC, etc.

  // ===== ISCL ENHANCED COMPENSATION (Sync License Level) =====
  mfnClauseEnabled: boolean("mfn_clause_enabled").default(false), // Most Favored Nations - equal pay guarantee
  paymentSchedule: jsonb("payment_schedule"), // Array of {milestone, amount, currency, dueDate, status}
  paymentScheduleType: varchar("payment_schedule_type", { length: 30 }), // one_time, milestone, recurring, revenue_share
  minimumGuarantee: varchar("minimum_guarantee"), // Minimum payment amount regardless of usage
  minimumGuaranteeCurrency: varchar("minimum_guarantee_currency", { length: 10 }),
  performanceBonus: text("performance_bonus"), // Bonus conditions (e.g., "Additional $1000 if reaches 1M streams")

  // ===== RENEWAL & REVOCATION =====
  autoRenew: boolean("auto_renew").default(false),
  renewalNoticeDays: integer("renewal_notice_days").default(30),
  revocationConditions: text("revocation_conditions"), // What voids the license

  // ===== LEGAL (Required) =====
  arbitrationAgreed: boolean("arbitration_agreed").notNull().default(false), // Both parties agree
  indemnificationAgreed: boolean("indemnification_agreed").notNull().default(false), // Both indemnify Solturio
  customTerms: text("custom_terms"), // Additional custom terms
  customTermsHash: varchar("custom_terms_hash", { length: 100 }), // IPFS hash if long

  // ===== SIGNATURES =====
  licensorSignedAt: timestamp("licensor_signed_at"),
  licensorSignature: varchar("licensor_signature"), // Wallet signature
  licenseeSignedAt: timestamp("licensee_signed_at"),
  licenseeSignature: varchar("licensee_signature"), // Wallet signature

  // ===== ISCL AUDIT TRAIL (ESIGN/UETA Compliance) =====
  licensorIpAddress: varchar("licensor_ip_address", { length: 50 }), // IP at signing for attribution
  licensorDeviceInfo: text("licensor_device_info"), // User agent / device fingerprint
  licenseeIpAddress: varchar("licensee_ip_address", { length: 50 }),
  licenseeDeviceInfo: text("licensee_device_info"),

  // ===== ISCL LEGAL INTENT (Contract Validity) =====
  intentToBeBindingAcknowledged: boolean("intent_to_be_binding_acknowledged").default(false), // Both parties acknowledge intent
  electronicTransactionConsent: boolean("electronic_transaction_consent").default(false), // ESIGN/UETA consent
  termsReadAcknowledged: boolean("terms_read_acknowledged").default(false), // Confirmed reading full terms

  // ===== ISCL VERSION TRACKING =====
  isclVersion: varchar("iscl_version", { length: 10 }).default("1.0.0"), // ISCL schema version
  isclTemplateId: varchar("iscl_template_id", { length: 50 }), // Which ISCL template was used

  // ===== ON-CHAIN DATA =====
  pdaAddress: varchar("pda_address"), // Program Derived Account on Solana
  contractAddress: varchar("contract_address"), // On-chain smart contract address
  transactionHash: varchar("transaction_hash"), // Deployment tx
  mintedAt: timestamp("minted_at"),

  // ===== STORAGE =====
  metadataIpfsHash: varchar("metadata_ipfs_hash", { length: 100 }), // Full license JSON on IPFS
  badgeImageArweaveUrl: text("badge_image_arweave_url"), // Badge-overlaid image on Arweave
  badgeImageIpfsHash: varchar("badge_image_ipfs_hash", { length: 100 }),

  // ===== IMAGE METADATA (snapshot at license creation) =====
  imageColorPalette: text("image_color_palette").array(), // Array of hex colors from image
  imageDominantColor: varchar("image_dominant_color", { length: 7 }), // Primary hex color
  imagePantoneColors: text("image_pantone_colors").array(), // Pantone color codes if available
  imageCreatedAt: timestamp("image_created_at"), // When the image was originally registered
  licenseIssuedAt: timestamp("license_issued_at"), // When this license was formally issued
  licenseTypeDescription: text("license_type_description"), // Human-readable description of license type

  // ===== CURRENT HOLDER TRACKING =====
  currentHolderName: varchar("current_holder_name"), // Current license holder display name
  currentHolderWallet: varchar("current_holder_wallet"), // Current holder's wallet address
  currentHolderEmail: varchar("current_holder_email"), // Current holder contact
  holderTransferHistory: jsonb("holder_transfer_history"), // Array of {from, to, date, txHash}

  // ===== JURISDICTION & COMPLIANCE =====
  jurisdictionCode: varchar("jurisdiction_code", { length: 10 }).default("US"), // US, EU, UK, CA, JP, SG, AU
  jurisdictionVersion: varchar("jurisdiction_version", { length: 10 }).default("1.0"), // Template version
  governingLaw: varchar("governing_law"), // e.g., "State of Delaware, United States"
  disputeVenue: varchar("dispute_venue"), // e.g., "Arbitration in New York, NY"
  gdprCompliant: boolean("gdpr_compliant").default(false), // EU GDPR requirements
  gdprDataProcessingAgreed: boolean("gdpr_data_processing_agreed").default(false),
  gdprWithdrawalRightsAcknowledged: boolean("gdpr_withdrawal_rights_acknowledged").default(false),
  pipedaCompliant: boolean("pipeda_compliant").default(false), // Canada PIPEDA
  pdpaCompliant: boolean("pdpa_compliant").default(false), // Singapore PDPA
  appiCompliant: boolean("appi_compliant").default(false), // Japan APPI
  moralRightsWaived: boolean("moral_rights_waived").default(false), // Important for Japan, France
  bilingualRequired: boolean("bilingual_required").default(false), // Canada French requirement
  vatStatement: text("vat_statement"), // EU/UK VAT handling
  regionalClauses: jsonb("regional_clauses"), // Additional jurisdiction-specific clauses

  // ===== P2P TRANSACTION LINKING (Optional - user-recorded external transactions) =====
  p2pSenderWallet: varchar("p2p_sender_wallet"), // Wallet that sent the payment
  p2pReceiverWallet: varchar("p2p_receiver_wallet"), // Wallet that received the payment
  p2pTransactionHash: varchar("p2p_transaction_hash"), // On-chain transaction hash/signature
  p2pTransactionAmount: varchar("p2p_transaction_amount"), // Amount transferred
  p2pTransactionCurrency: varchar("p2p_transaction_currency", { length: 10 }), // SOL, USDC, etc.
  p2pTransactionNote: text("p2p_transaction_note"), // Optional note about the transaction
  p2pTransactionLinkedAt: timestamp("p2p_transaction_linked_at"), // When user linked this transaction

  // ===== SHAREABLE LINK =====
  shareableSlug: varchar("shareable_slug", { length: 50 }).unique(), // solturio.app/license/[slug]

  // ===== FEE TRACKING (SOL only, platform revenue) =====
  creationFee: varchar("creation_fee").notNull().default("0.025"), // SOL amount
  creationFeePaid: boolean("creation_fee_paid").default(false),
  creationFeePaymentTx: varchar("creation_fee_payment_tx"),
  creationFeePaidAt: timestamp("creation_fee_paid_at"),

  // ===== STATUS =====
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  // draft → pending_licensee_signature → pending_payment → pending_deployment → active → expired/revoked/transferred

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Helper to check if platform is permitted
export function isPlatformPermitted(bitmap: number, platform: keyof typeof PLATFORM_BITS): boolean {
  return (bitmap & (1 << PLATFORM_BITS[platform])) !== 0;
}

// Helper to get all permitted platforms from bitmap
export function getPermittedPlatforms(bitmap: number): string[] {
  const platforms: string[] = [];
  for (const [name, bit] of Object.entries(PLATFORM_BITS)) {
    if (bitmap & (1 << bit)) {
      platforms.push(name);
    }
  }
  return platforms;
}

// Helper to create bitmap from platform array
export function createPlatformBitmap(platforms: (keyof typeof PLATFORM_BITS)[]): number {
  let bitmap = 0;
  for (const platform of platforms) {
    bitmap |= 1 << PLATFORM_BITS[platform];
  }
  return bitmap;
}

export const insertLicenseContractSchema = createInsertSchema(licenseContracts)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    pdaAddress: true,
    contractAddress: true,
    transactionHash: true,
    mintedAt: true,
    creationFeePaid: true,
    creationFeePaymentTx: true,
    creationFeePaidAt: true,
    licensorSignedAt: true,
    licensorSignature: true,
    licenseeSignedAt: true,
    licenseeSignature: true,
    metadataIpfsHash: true,
    badgeImageArweaveUrl: true,
    badgeImageIpfsHash: true,
    shareableSlug: true,
  })
  .extend({
    licenseType: z.enum(["exclusive", "non_exclusive", "work_for_hire", "full_transfer"]),
    geographicScope: z.enum(["worldwide", "specific"]).optional(),
    usagePurpose: z.enum(["personal", "commercial", "both"]).optional(),
    jurisdictionCode: z.enum(["US", "EU", "UK", "CA", "JP", "SG", "AU", "INTL"]).default("US"),
    arbitrationAgreed: z
      .boolean()
      .refine((val) => val === true, { message: "Arbitration agreement is required" }),
    indemnificationAgreed: z
      .boolean()
      .refine((val) => val === true, { message: "Indemnification agreement is required" }),
  });

export type InsertLicenseContract = z.infer<typeof insertLicenseContractSchema>;
export type LicenseContract = typeof licenseContracts.$inferSelect;

// Referral Tracking - Track referral chain and rewards
export const referralTracking = pgTable("referral_tracking", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  referrerUserId: varchar("referrer_user_id")
    .notNull()
    .references(() => users.id),
  referredUserId: varchar("referred_user_id")
    .notNull()
    .references(() => users.id),
  referralCode: varchar("referral_code").notNull(),

  // Status
  signedUpAt: timestamp("signed_up_at").defaultNow(),
  activatedAt: timestamp("activated_at"), // When referred user paid $CATH

  // Rewards
  referrerRewardAmount: varchar("referrer_reward_amount"), // $SLTR credited to referrer
  referrerRewardPaidAt: timestamp("referrer_reward_paid_at"),
  referredBonusAmount: varchar("referred_bonus_amount"), // $SLTR bonus to new user
  referredBonusPaidAt: timestamp("referred_bonus_paid_at"),

  createdAt: timestamp("created_at").defaultNow(),
});

export type ReferralTracking = typeof referralTracking.$inferSelect;

// Used Transactions - Replay attack protection
export const usedTransactions = pgTable("used_transactions", {
  txHash: varchar("tx_hash").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  purpose: varchar("purpose", { length: 30 }).notNull(), // subscription, license, renewal
  amount: varchar("amount"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UsedTransaction = typeof usedTransactions.$inferSelect;

// ============================================
// IP ASSETS - UNIFIED ABSTRACTION LAYER
// Allows license_contracts to reference any IP type (logos, music, code)
// ============================================

export const ipAssets = pgTable("ip_assets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Asset type discriminator
  assetType: varchar("asset_type", { length: 20 }).notNull(), // 'logo', 'track', 'release', 'code'

  // Core identifiers
  title: text("title").notNull(),
  description: text("description"),
  sha256: varchar("sha256", { length: 64 }).notNull(), // Content hash for verification

  // Storage URIs
  primaryUri: text("primary_uri"), // Main file location (IPFS, Arweave, etc.)
  manifestUri: text("manifest_uri"), // Metadata JSON location
  thumbnailUri: text("thumbnail_uri"), // Preview image

  // Ownership
  ownershipClaimedAt: timestamp("ownership_claimed_at"),
  ownershipDescription: text("ownership_description"),

  // Legal status
  copyrightStatus: varchar("copyright_status", { length: 20 }).default("none"),
  trademarkStatus: varchar("trademark_status", { length: 20 }).default("none"),

  // Blockchain
  nftAddress: varchar("nft_address"),
  transactionHash: varchar("transaction_hash"),
  mintedAt: timestamp("minted_at"),

  // Rights holders (for music splits, co-ownership)
  rightsHolders: jsonb("rights_holders"), // [{wallet, name, percentage, role}]

  // Status
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, archived, disputed

  // Timestamps
  registeredAt: timestamp("registered_at").defaultNow(), // Proof-of-first-use timestamp
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIpAssetSchema = createInsertSchema(ipAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  registeredAt: true,
  nftAddress: true,
  transactionHash: true,
  mintedAt: true,
});

export type InsertIpAsset = z.infer<typeof insertIpAssetSchema>;
export type IpAsset = typeof ipAssets.$inferSelect;

// ============================================
// MUSIC COLLECTIONS - Catalogs/Labels
// ============================================

export const musicCollections = pgTable("music_collections", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  assetId: varchar("asset_id").references(() => ipAssets.id, { onDelete: "set null" }),

  // Collection metadata
  name: text("name").notNull(),
  description: text("description"),
  labelName: varchar("label_name"), // Record label or publisher

  // Artwork
  coverArtUri: text("cover_art_uri"),
  coverArtHash: varchar("cover_art_hash", { length: 64 }),

  // Contact
  contactEmail: varchar("contact_email"),
  website: text("website"),

  // IPFS/Arweave
  metadataIpfsHash: varchar("metadata_ipfs_hash", { length: 100 }),

  // Status
  isPublic: boolean("is_public").default(true),
  status: varchar("status", { length: 20 }).default("active"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMusicCollectionSchema = createInsertSchema(musicCollections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMusicCollection = z.infer<typeof insertMusicCollectionSchema>;
export type MusicCollection = typeof musicCollections.$inferSelect;

// ============================================
// TRACKS - Canonical Audio Files (never duplicated)
// ============================================

export const tracks = pgTable("tracks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  assetId: varchar("asset_id").references(() => ipAssets.id, { onDelete: "set null" }),
  collectionId: varchar("collection_id").references(() => musicCollections.id, {
    onDelete: "set null",
  }),

  // Track metadata
  title: text("title").notNull(),
  artistName: text("artist_name").notNull(),
  featuredArtists: text("featured_artists").array(), // Collaborators

  // Canonical hashes (per user's preferred schema)
  audioHashSha256: varchar("audio_hash_sha256", { length: 64 }).notNull(), // sha256(master bytes)
  previewHashSha256: varchar("preview_hash_sha256", { length: 64 }), // sha256(preview bytes)
  contextHashSha256: varchar("context_hash_sha256", { length: 64 }).notNull(), // hybrid hash for registration

  // Storage pointers (per user's preferred schema)
  manifestUri: text("manifest_uri").notNull(), // Arweave/IPFS manifest JSON
  audioEncryptedUri: text("audio_encrypted_uri").notNull(), // encrypted master on Arweave
  previewUri: text("preview_uri").notNull(), // public preview

  // Audio file metadata
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(), // bytes
  mimeType: varchar("mime_type", { length: 50 }).notNull(), // audio/mpeg, audio/wav, etc.
  durationMs: integer("duration_ms"), // Length in milliseconds (replaces durationSec)
  sampleRate: integer("sample_rate"), // 44100, 48000, etc.
  bitDepth: integer("bit_depth"), // 16, 24, 32
  channels: integer("channels"), // 1 (mono), 2 (stereo)
  isExplicit: boolean("is_explicit").default(false), // Explicit content flag

  // Audio analysis
  bpm: integer("bpm"), // Beats per minute
  key: varchar("key", { length: 10 }), // C major, A minor, etc.
  waveformData: jsonb("waveform_data"), // Visualization data

  // Cover art (per-track override)
  coverUri: text("cover_uri"), // Optional per-track cover

  // Storage / IPFS
  metadataIpfsHash: varchar("metadata_ipfs_hash", { length: 100 }),

  // Rights management
  isrc: varchar("isrc", { length: 12 }), // International Standard Recording Code
  iswc: varchar("iswc", { length: 15 }), // International Standard Musical Work Code
  publisherName: text("publisher_name"),
  writerCredits: jsonb("writer_credits"), // [{name, role, percentage}]

  // Rights holders with split ownership
  rightsHolders: jsonb("rights_holders"), // [{wallet, name, percentage, role}]

  // Registration
  registrationType: varchar("registration_type", { length: 20 }), // original, remix, cover, sample
  originalTrackId: varchar("original_track_id"), // If remix/cover, reference to original

  // Blockchain
  nftAddress: varchar("nft_address"),
  transactionHash: varchar("transaction_hash"),
  mintedAt: timestamp("minted_at"),

  // Status
  status: varchar("status", { length: 20 }).default("active"),

  registeredAt: timestamp("registered_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTrackSchema = createInsertSchema(tracks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  registeredAt: true,
  nftAddress: true,
  transactionHash: true,
  mintedAt: true,
});

export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type Track = typeof tracks.$inferSelect;

// ============================================
// RELEASES - Single/EP/Album/Compilation
// ============================================

export const releases = pgTable("releases", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  assetId: varchar("asset_id").references(() => ipAssets.id, { onDelete: "set null" }),
  collectionId: varchar("collection_id").references(() => musicCollections.id, {
    onDelete: "set null",
  }),

  // Release metadata
  title: text("title").notNull(),
  artistName: text("artist_name").notNull(),
  releaseType: varchar("release_type", { length: 20 }).notNull(), // single, ep, album, compilation

  // Artwork
  coverArtUri: text("cover_art_uri"),
  coverArtHash: varchar("cover_art_hash", { length: 64 }),

  // Release info
  releaseDate: timestamp("release_date"),
  genre: varchar("genre", { length: 50 }),
  subGenre: varchar("sub_genre", { length: 50 }),
  language: varchar("language", { length: 10 }),

  // Industry codes
  upc: varchar("upc", { length: 14 }), // Universal Product Code
  catalogNumber: varchar("catalog_number", { length: 50 }),

  // Rights
  labelName: varchar("label_name"),
  copyrightLine: text("copyright_line"), // (C) 2025 Label Name
  productionLine: text("production_line"), // (P) 2025 Label Name

  // Storage
  metadataIpfsHash: varchar("metadata_ipfs_hash", { length: 100 }),

  // Blockchain
  nftAddress: varchar("nft_address"),
  transactionHash: varchar("transaction_hash"),
  mintedAt: timestamp("minted_at"),

  // Status
  status: varchar("status", { length: 20 }).default("draft"), // draft, pending, released, archived

  registeredAt: timestamp("registered_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertReleaseSchema = createInsertSchema(releases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  registeredAt: true,
  nftAddress: true,
  transactionHash: true,
  mintedAt: true,
});

export type InsertRelease = z.infer<typeof insertReleaseSchema>;
export type Release = typeof releases.$inferSelect;

// ============================================
// RELEASE_TRACKS - Join table with ordering
// ============================================

export const releaseTracks = pgTable("release_tracks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  releaseId: varchar("release_id")
    .notNull()
    .references(() => releases.id, { onDelete: "cascade" }),
  trackId: varchar("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),

  // Positioning
  discNumber: integer("disc_number").default(1).notNull(),
  trackNumber: integer("track_number").notNull(),

  // Hybrid ID: sha256(audioHash + releaseId + trackNumber + version) - unique per track-in-release
  hybridId: varchar("hybrid_id", { length: 64 }).notNull(),

  // Context-specific metadata (may differ from canonical track)
  displayTitle: text("display_title"), // Override title for this release
  displayArtist: text("display_artist"), // Override artist for this release

  // ISRC can be release-specific
  releaseIsrc: varchar("release_isrc", { length: 12 }),

  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReleaseTrackSchema = createInsertSchema(releaseTracks).omit({
  id: true,
  createdAt: true,
});

export type InsertReleaseTrack = z.infer<typeof insertReleaseTrackSchema>;
export type ReleaseTrack = typeof releaseTracks.$inferSelect;

// ============================================
// CODE REPO SNAPSHOTS - GitHub Integration
// ============================================

export const codeRepoSnapshots = pgTable("code_repo_snapshots", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  assetId: varchar("asset_id").references(() => ipAssets.id, { onDelete: "set null" }),

  // Repository info
  repoUrl: text("repo_url").notNull(), // GitHub URL
  repoName: text("repo_name").notNull(),
  repoOwner: text("repo_owner").notNull(),

  // Commit data
  commitHash: varchar("commit_hash", { length: 40 }).notNull(), // Full SHA
  commitMessage: text("commit_message"),
  commitAuthor: text("commit_author"),
  committedAt: timestamp("committed_at"),

  // Branch/tag info
  branchName: varchar("branch_name", { length: 100 }),
  tagName: varchar("tag_name", { length: 100 }),

  // Snapshot content
  manifestHash: varchar("manifest_hash", { length: 64 }), // Hash of file manifest
  manifestUri: text("manifest_uri"), // IPFS location of manifest JSON
  bundleHash: varchar("bundle_hash", { length: 64 }), // Optional: hash of zip bundle
  bundleUri: text("bundle_uri"), // Optional: IPFS location of zip bundle

  // File statistics
  fileCount: integer("file_count"),
  totalLinesOfCode: integer("total_lines_of_code"),
  languages: jsonb("languages"), // {typescript: 5000, javascript: 2000, etc.}

  // Storage
  metadataIpfsHash: varchar("metadata_ipfs_hash", { length: 100 }),

  // Blockchain
  nftAddress: varchar("nft_address"),
  transactionHash: varchar("transaction_hash"),
  mintedAt: timestamp("minted_at"),

  // Status
  status: varchar("status", { length: 20 }).default("pending"), // pending, verified, minted

  registeredAt: timestamp("registered_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCodeRepoSnapshotSchema = createInsertSchema(codeRepoSnapshots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  registeredAt: true,
  nftAddress: true,
  transactionHash: true,
  mintedAt: true,
});

export type InsertCodeRepoSnapshot = z.infer<typeof insertCodeRepoSnapshotSchema>;
export type CodeRepoSnapshot = typeof codeRepoSnapshots.$inferSelect;

// Asset type constants for ipAssets.assetType
export const IP_ASSET_TYPES = {
  LOGO: "logo",
  TRACK: "track",
  RELEASE: "release",
  CODE: "code",
} as const;

export type IpAssetType = (typeof IP_ASSET_TYPES)[keyof typeof IP_ASSET_TYPES];

// ============================================
// MASTER ACCESS RESPONSE - License gating
// ============================================

export const masterAccessResponseSchema = z.object({
  authorized: z.boolean(),
  playbackUrl: z.string().optional(),
  expiresAt: z.string().optional(),
  reason: z.string().optional(),
});

export type MasterAccessResponse = z.infer<typeof masterAccessResponseSchema>;
