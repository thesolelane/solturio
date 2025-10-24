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
  walletAddress: varchar("wallet_address"),
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

// Logo storage with auto-extracted metadata
export const logos = pgTable("logos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  collectionId: varchar("collection_id").references(() => collections.id, { onDelete: 'set null' }),
  
  // File information
  fileName: text("file_name").notNull(),
  filePath: text("file_path"), // Temporary local path during upload
  imageRegistryId: varchar("image_registry_id"), // ID in ireg.cooperanth.sol
  imageRegistryUrl: text("image_registry_url"), // Full URL to image in registry
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: varchar("mime_type").notNull(),
  fileHash: varchar("file_hash"), // SHA-256 hash for verification
  
  // Auto-extracted metadata
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  format: varchar("format").notNull(), // PNG, SVG, JPG, etc
  colorPalette: text("color_palette").array(), // Array of hex color codes
  dominantColor: varchar("dominant_color"),
  
  // User-provided metadata
  description: varchar("description", { length: 200 }),
  tags: text("tags").array(),
  
  // NFT data (populated after minting)
  nftAddress: varchar("nft_address"),
  mintedAt: timestamp("minted_at"),
  transactionHash: varchar("transaction_hash"),
  blockchainMetadataUri: text("blockchain_metadata_uri"), // URI to on-chain JSON
  
  // Monthly rental tracking
  lastRentalPayment: timestamp("last_rental_payment"),
  rentalPaidUntil: timestamp("rental_paid_until"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLogoSchema = createInsertSchema(logos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  nftAddress: true,
  mintedAt: true,
  transactionHash: true,
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
