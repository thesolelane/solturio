import {
  users,
  logos,
  collections,
  payments,
  type User,
  type UpsertUser,
  type Logo,
  type InsertLogo,
  type Collection,
  type InsertCollection,
  type Payment,
  type InsertPayment,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateWalletAddress(userId: string, walletAddress: string): Promise<User>;
  updateEmailVerified(userId: string, verified: boolean): Promise<User>;
  updateNotificationPreferences(userId: string, notifyPaymentsDue: boolean, notifyRentalReminders: boolean): Promise<User>;
  
  // Logo operations
  createLogo(logo: InsertLogo): Promise<Logo>;
  getLogosByUserId(userId: string): Promise<Logo[]>;
  getLogosByCollectionId(collectionId: string): Promise<Logo[]>;
  updateLogoNFTData(logoId: string, data: {
    nftAddress: string;
    transactionHash: string;
    mintedAt: Date;
  }): Promise<Logo>;
  
  // Collection operations
  createCollection(collection: InsertCollection): Promise<Collection>;
  getCollection(id: string): Promise<Collection | undefined>;
  getCollectionsByUserId(userId: string): Promise<Collection[]>;
  updateCollectionStatus(id: string, status: string): Promise<Collection>;
  updateCollectionBlockchainData(id: string, data: {
    collectionAddress: string;
    transactionHash: string;
    explorerUrl: string;
    status: string;
    mintedAt: Date;
  }): Promise<Collection>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentByIntentId(intentId: string): Promise<Payment | undefined>;
  updatePaymentStatus(id: string, status: string): Promise<Payment>;
  
  // Stats
  getUserStats(userId: string): Promise<{
    totalLogos: number;
    mintedCollections: number;
    pendingLogos: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateWalletAddress(userId: string, walletAddress: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ walletAddress, walletVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateEmailVerified(userId: string, verified: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ emailVerified: verified, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateNotificationPreferences(
    userId: string,
    notifyPaymentsDue: boolean,
    notifyRentalReminders: boolean
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ notifyPaymentsDue, notifyRentalReminders, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Logo operations
  async createLogo(logo: InsertLogo): Promise<Logo> {
    const [created] = await db.insert(logos).values(logo).returning();
    return created;
  }

  async getLogosByUserId(userId: string): Promise<Logo[]> {
    return db.select().from(logos).where(eq(logos.userId, userId));
  }

  async getLogosByCollectionId(collectionId: string): Promise<Logo[]> {
    return db.select().from(logos).where(eq(logos.collectionId, collectionId));
  }

  async updateLogoNFTData(logoId: string, data: {
    nftAddress: string;
    transactionHash: string;
    mintedAt: Date;
  }): Promise<Logo> {
    const [updated] = await db
      .update(logos)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(logos.id, logoId))
      .returning();
    return updated;
  }

  // Collection operations
  async createCollection(collection: InsertCollection): Promise<Collection> {
    const [created] = await db.insert(collections).values(collection).returning();
    return created;
  }

  async getCollection(id: string): Promise<Collection | undefined> {
    const [collection] = await db.select().from(collections).where(eq(collections.id, id));
    return collection;
  }

  async getCollectionsByUserId(userId: string): Promise<Collection[]> {
    return db
      .select()
      .from(collections)
      .where(eq(collections.userId, userId))
      .orderBy(desc(collections.createdAt));
  }

  async updateCollectionStatus(id: string, status: string): Promise<Collection> {
    const [updated] = await db
      .update(collections)
      .set({ status, updatedAt: new Date() })
      .where(eq(collections.id, id))
      .returning();
    return updated;
  }

  async updateCollectionBlockchainData(id: string, data: {
    collectionAddress: string;
    transactionHash: string;
    explorerUrl: string;
    status: string;
    mintedAt: Date;
  }): Promise<Collection> {
    const [updated] = await db
      .update(collections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(collections.id, id))
      .returning();
    return updated;
  }

  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await db.insert(payments).values(payment).returning();
    return created;
  }

  async getPaymentByIntentId(intentId: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionSignature, intentId));
    return payment;
  }

  async updatePaymentStatus(id: string, status: string): Promise<Payment> {
    const [updated] = await db
      .update(payments)
      .set({ status, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return updated;
  }

  // Stats
  async getUserStats(userId: string): Promise<{
    totalLogos: number;
    mintedCollections: number;
    pendingLogos: number;
  }> {
    const userLogos = await db.select().from(logos).where(eq(logos.userId, userId));
    const userCollections = await db.select().from(collections).where(eq(collections.userId, userId));

    return {
      totalLogos: userLogos.length,
      mintedCollections: userCollections.filter(c => c.status === 'minted').length,
      pendingLogos: userLogos.filter(l => !l.nftAddress).length,
    };
  }
}

export const storage = new DatabaseStorage();
