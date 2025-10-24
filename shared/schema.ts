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

// User storage table (required for Replit Auth + Stripe fields)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
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
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: varchar("mime_type").notNull(),
  
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

// Payment records
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  collectionId: varchar("collection_id").references(() => collections.id, { onDelete: 'set null' }),
  
  // Stripe data
  stripePaymentIntentId: varchar("stripe_payment_intent_id").notNull().unique(),
  stripeCustomerId: varchar("stripe_customer_id"),
  
  // Payment details
  amount: integer("amount").notNull(), // in cents
  currency: varchar("currency", { length: 3 }).notNull().default('usd'),
  status: varchar("status", { length: 20 }).notNull(), // pending, succeeded, failed
  
  // Metadata
  logoCount: integer("logo_count").notNull(),
  pricingTier: varchar("pricing_tier", { length: 50 }),
  
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
