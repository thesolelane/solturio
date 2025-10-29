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
  
  // Centurio-generated Solana wallet (created after email verification)
  solanaPublicKey: varchar("solana_public_key"), // Public key (wallet address)
  solanaEncryptedPrivateKey: text("solana_encrypted_private_key"), // Encrypted private key
  solanaWalletCreatedAt: timestamp("solana_wallet_created_at"), // When wallet was generated
  hasExportedPrivateKey: boolean("has_exported_private_key").default(false), // Track if user exported key
  
  // Social media handles (for community engagement)
  twitterHandle: varchar("twitter_handle"),
  telegramHandle: varchar("telegram_handle"),
  discordHandle: varchar("discord_handle"),
  
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

// Logo metadata storage (NO file storage - images in user's .centurio.sol wallet)
export const logos = pgTable("logos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  collectionId: varchar("collection_id").references(() => collections.id, { onDelete: 'set null' }),
  
  // File metadata only (actual files in user's XXXXXXX.centurio.sol wallet or external URL)
  fileName: text("file_name").notNull(),
  imageUrl: text("image_url"), // URL where image is hosted (user's wallet, IPFS, etc.)
  userWalletStoragePath: text("user_wallet_storage_path"), // Path in user's .centurio.sol wallet
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: varchar("mime_type").notNull(),
  fileHash: varchar("file_hash").notNull(), // SHA-256 hash for verification
  
  // IPFS storage (for permanent decentralized storage)
  ipfsHash: varchar("ipfs_hash", { length: 100 }), // IPFS CID for image file
  ipfsMetadataHash: varchar("ipfs_metadata_hash", { length: 100 }), // IPFS hash for metadata JSON
  
  // Auto-extracted metadata
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  format: varchar("format").notNull(), // PNG, SVG, JPG, etc
  colorPalette: text("color_palette").array(), // Array of hex color codes
  dominantColor: varchar("dominant_color"),
  
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
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default('draft'), // draft, pending, minted, failed
  mintedAt: timestamp("minted_at"),
  
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

// Quiz questions for IP education
export const quizQuestions = pgTable("quiz_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category", { length: 100 }).notNull(), // Trademark Basics, Copyright Law, IP Symbols, etc
  difficulty: varchar("difficulty", { length: 20 }).notNull(), // easy, medium, hard
  points: integer("points").notNull(), // 100, 200, 300, 400, 500
  
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  explanation: text("explanation"), // Detailed explanation with source
  sourceUrl: text("source_url"), // Link to official source (USPTO, Copyright.gov)
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type QuizQuestion = typeof quizQuestions.$inferSelect;

// User quiz attempts
export const quizAttempts = pgTable("quiz_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: varchar("question_id").notNull().references(() => quizQuestions.id),
  
  userAnswer: text("user_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  pointsEarned: integer("points_earned").notNull(),
  cathReward: varchar("cath_reward"), // Amount of $CATH earned (as string for precision)
  
  timeToAnswer: integer("time_to_answer"), // Time in seconds
  
  createdAt: timestamp("created_at").defaultNow(),
});

export type QuizAttempt = typeof quizAttempts.$inferSelect;

// User quiz stats and leaderboard
export const quizStats = pgTable("quiz_stats", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  
  totalQuestions: integer("total_questions").default(0).notNull(),
  correctAnswers: integer("correct_answers").default(0).notNull(),
  totalPoints: integer("total_points").default(0).notNull(),
  totalCathEarned: varchar("total_cath_earned").default('0'), // Total $CATH earned from quizzes
  
  streak: integer("streak").default(0), // Current correct answer streak
  longestStreak: integer("longest_streak").default(0),
  
  lastQuizAt: timestamp("last_quiz_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type QuizStats = typeof quizStats.$inferSelect;
