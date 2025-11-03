import {
  users,
  logos,
  collections,
  payments,
  authorizedUsages,
  type User,
  type UpsertUser,
  type Logo,
  type InsertLogo,
  type Collection,
  type InsertCollection,
  type Payment,
  type InsertPayment,
  type AuthorizedUsage,
  type InsertAuthorizedUsage,
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
  updateSocialHandles(userId: string, handles: { twitterHandle?: string; telegramHandle?: string; discordHandle?: string }): Promise<User>;
  createSolturioWallet(userId: string, publicKey: string, encryptedPrivateKey: string): Promise<User>;
  markPrivateKeyExported(userId: string): Promise<User>;
  
  // Logo operations
  createLogo(logo: InsertLogo): Promise<Logo>;
  getLogosByUserId(userId: string): Promise<Logo[]>;
  getLogosByCollectionId(collectionId: string): Promise<Logo[]>;
  updateLogoNFTData(logoId: string, data: {
    nftAddress: string;
    transactionHash: string;
    mintedAt: Date;
  }): Promise<Logo>;
  getLogoById(logoId: string): Promise<Logo | undefined>;
  updateLogoIPFS(logoId: string, ipfsHash: string, ipfsMetadataHash?: string): Promise<Logo>;
  getLogosByFileHash(fileHash: string): Promise<Logo[]>;
  
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
  
  // Authorized usage operations
  createAuthorizedUsage(usage: InsertAuthorizedUsage): Promise<AuthorizedUsage>;
  getAuthorizedUsagesByLogoId(logoId: string): Promise<AuthorizedUsage[]>;
  getAuthorizedUsagesByUserId(userId: string): Promise<AuthorizedUsage[]>;
  updateAuthorizedUsage(id: string, data: Partial<AuthorizedUsage>): Promise<AuthorizedUsage>;
  deleteAuthorizedUsage(id: string): Promise<void>;
  verifyAuthorizedUsage(id: string, verifiedAt: Date): Promise<AuthorizedUsage>;
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

  async updateSocialHandles(
    userId: string,
    handles: { twitterHandle?: string; telegramHandle?: string; discordHandle?: string }
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...handles, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createSolturioWallet(userId: string, publicKey: string, encryptedPrivateKey: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        solanaPublicKey: publicKey,
        solanaEncryptedPrivateKey: encryptedPrivateKey,
        solanaWalletCreatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async markPrivateKeyExported(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ hasExportedPrivateKey: true, updatedAt: new Date() })
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

  async getLogoById(logoId: string): Promise<Logo | undefined> {
    const [logo] = await db.select().from(logos).where(eq(logos.id, logoId));
    return logo;
  }

  async updateLogoIPFS(logoId: string, ipfsHash: string, ipfsMetadataHash?: string): Promise<Logo> {
    const [updated] = await db
      .update(logos)
      .set({ 
        ipfsHash, 
        ipfsMetadataHash,
        updatedAt: new Date() 
      })
      .where(eq(logos.id, logoId))
      .returning();
    return updated;
  }

  async getLogosByFileHash(fileHash: string): Promise<Logo[]> {
    return await db
      .select()
      .from(logos)
      .where(eq(logos.fileHash, fileHash))
      .orderBy(logos.createdAt);
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
  
  // Authorized usage operations
  async createAuthorizedUsage(usage: InsertAuthorizedUsage): Promise<AuthorizedUsage> {
    const [created] = await db.insert(authorizedUsages).values(usage).returning();
    return created;
  }
  
  async getAuthorizedUsagesByLogoId(logoId: string): Promise<AuthorizedUsage[]> {
    return db
      .select()
      .from(authorizedUsages)
      .where(eq(authorizedUsages.logoId, logoId))
      .orderBy(desc(authorizedUsages.createdAt));
  }
  
  async getAuthorizedUsagesByUserId(userId: string): Promise<AuthorizedUsage[]> {
    return db
      .select()
      .from(authorizedUsages)
      .where(eq(authorizedUsages.userId, userId))
      .orderBy(desc(authorizedUsages.createdAt));
  }
  
  async updateAuthorizedUsage(id: string, data: Partial<AuthorizedUsage>): Promise<AuthorizedUsage> {
    const [updated] = await db
      .update(authorizedUsages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(authorizedUsages.id, id))
      .returning();
    return updated;
  }
  
  async deleteAuthorizedUsage(id: string): Promise<void> {
    await db.delete(authorizedUsages).where(eq(authorizedUsages.id, id));
  }
  
  async verifyAuthorizedUsage(id: string, verifiedAt: Date): Promise<AuthorizedUsage> {
    const [updated] = await db
      .update(authorizedUsages)
      .set({ isVerified: true, verifiedAt, updatedAt: new Date() })
      .where(eq(authorizedUsages.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
