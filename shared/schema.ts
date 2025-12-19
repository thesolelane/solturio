import { sql } from 'drizzle-orm';
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
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth + Solana wallet)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// Logo metadata storage (NO file storage - images in user's .solturio.sol wallet)
export const logos = pgTable("logos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  collectionId: varchar("collection_id").references(() => collections.id, { onDelete: 'set null' }),
  
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

export const insertLogoSchema = createInsertSchema(logos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  ownershipClaimedAt: true,
  nftAddress: true,
  mintedAt: true,
  transactionHash: true,
  blockchainMetadataJson: true,
}).extend({
  fileHash: z.string().min(1, "File hash is required"),
  ownershipDescription: z.string().optional(),
  intendedUse: z.string().optional(),
  copyrightStatus: z.enum(['pre_filing', 'pending', 'registered', 'none']).optional(),
  trademarkStatus: z.enum(['pre_filing', 'pending', 'registered', 'none']).optional(),
  patentStatus: z.enum(['pre_filing', 'pending', 'registered', 'none']).optional(),
});

export type InsertLogo = z.infer<typeof insertLogoSchema>;
export type Logo = typeof logos.$inferSelect;

// Collection/batch of logos
export const collections = pgTable("collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
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
  status: varchar("status", { length: 20 }).notNull().default('draft'), // draft, pending, minted, failed
  mintedAt: timestamp("minted_at"),
  
  // Privacy settings
  isPublic: boolean("is_public").notNull().default(true), // Whether collection appears in public search
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  collectionAddress: true,
  transactionHash: true,
  explorerUrl: true,
  mintedAt: true,
}).extend({
  name: z.string().min(1, "Collection name is required"),
  companyName: z.string().min(1, "Company name is required"),
  symbol: z.string().max(10, "Symbol must be 10 characters or less").optional(),
  copyrightYear: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
});

export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type Collection = typeof collections.$inferSelect;

// Payment records (crypto payments)
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  collectionId: varchar("collection_id").references(() => collections.id, { onDelete: 'set null' }),
  logoId: varchar("logo_id").references(() => logos.id, { onDelete: 'set null' }), // For monthly rental payments
  
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  logoId: varchar("logo_id").notNull().references(() => logos.id, { onDelete: 'cascade' }),
  contractAddress: varchar("contract_address").notNull(),
  chainId: integer("chain_id").notNull().default(1),
  verificationLevel: varchar("verification_level").notNull().default('standard'), // gold, silver, standard
  prelaunchRegistration: boolean("prelaunch_registration").notNull().default(false),
  deploymentDate: timestamp("deployment_date"),
  deploymentTxHash: varchar("deployment_tx_hash"),
  ipfsProofUrl: varchar("ipfs_proof_url"),
  bindingDate: timestamp("binding_date").notNull().default(sql`now()`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  logoId: varchar("logo_id").notNull().references(() => logos.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Usage location
  usageUrl: text("usage_url").notNull(), // Where the logo is being used
  usageType: varchar("usage_type", { length: 50 }), // website, social_media, print, merchandise, etc
  usagePlatform: varchar("usage_platform", { length: 100 }), // Twitter, DEXScreener, company website, etc
  
  // Verification
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  lastScanned: timestamp("last_scanned"),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default('active'), // active, inactive, pending_verification
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAuthorizedUsageSchema = createInsertSchema(authorizedUsages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isVerified: true,
  verifiedAt: true,
}).extend({
  usageUrl: z.string().url("Must be a valid URL"),
});

export type InsertAuthorizedUsage = z.infer<typeof insertAuthorizedUsageSchema>;
export type AuthorizedUsage = typeof authorizedUsages.$inferSelect;

// Organizations/Platforms that accept IP claims
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  logoId: varchar("logo_id").notNull().references(() => logos.id, { onDelete: 'cascade' }),
  
  // Report type
  reportType: varchar("report_type").notNull().default('token'), // token, telegram, twitter, website, discord, other
  
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
  status: varchar("status").notNull().default('pending'), // pending, submitted, resolved, rejected
  submittedToOrgs: text("submitted_to_orgs").array(), // Organization IDs
  
  // User's Solturio registration proof
  registrationNumber: varchar("registration_number"),
  registrationDate: timestamp("registration_date"),
  ipfsProofUrl: text("ipfs_proof_url"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCopycatReportSchema = createInsertSchema(copycatReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  registrationNumber: true,
  registrationDate: true,
  ipfsProofUrl: true,
  submittedToOrgs: true,
  similarityScore: true,
}).extend({
  reportType: z.enum(['token', 'telegram', 'twitter', 'website', 'discord', 'other']),
});

export type InsertCopycatReport = z.infer<typeof insertCopycatReportSchema>;
export type CopycatReport = typeof copycatReports.$inferSelect;

// Outreach Letters sent to organizations
export const outreachLetters = pgTable("outreach_letters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull().references(() => copycatReports.id, { onDelete: 'cascade' }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
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
  status: varchar("status").notNull().default('draft'), // draft, sent, responded, resolved
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type OutreachLetter = typeof outreachLetters.$inferSelect;

// Variation Protections - similar names/tickers to protect against
export const variationProtections = pgTable("variation_protections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  logoId: varchar("logo_id").notNull().references(() => logos.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }), // Optional - for registered users
  
  // Telegram user identification (for non-registered users)
  telegramUserId: varchar("telegram_user_id"),
  telegramUsername: varchar("telegram_username"),
  telegramFirstName: varchar("telegram_first_name"),
  
  questionId: varchar("question_id").notNull().references(() => quizQuestions.id),
  
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
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  
  // Telegram user identification (for linking)
  telegramUserId: varchar("telegram_user_id"),
  telegramUsername: varchar("telegram_username"),
  telegramFirstName: varchar("telegram_first_name"),
  
  totalQuestions: integer("total_questions").default(0).notNull(),
  correctAnswers: integer("correct_answers").default(0).notNull(),
  totalPoints: integer("total_points").default(0).notNull(),
  totalCathEarned: varchar("total_cath_earned").default('0'), // Total $CATH earned from quizzes
  
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
