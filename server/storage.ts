import {
  users,
  logos,
  collections,
  payments,
  authorizedUsages,
  treasuryWallets,
  complianceLogs,
  kycStatus,
  complianceTriggerRules,
  complianceCases,
  licenseContracts,
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
  type TreasuryWallet,
  type InsertTreasuryWallet,
  type ComplianceLog,
  type KycStatus,
  type InsertKycStatus,
  type ComplianceTriggerRule,
  type ComplianceCase,
  type LicenseContract,
  type InsertLicenseContract,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  updateWalletAddress(userId: string, walletAddress: string): Promise<User>;
  updateEmailVerified(userId: string, verified: boolean): Promise<User>;
  updateNotificationPreferences(userId: string, notifyPaymentsDue: boolean, notifyRentalReminders: boolean): Promise<User>;
  updateSocialHandles(userId: string, handles: { twitterHandle?: string; telegramHandle?: string; discordHandle?: string; instagramHandle?: string; telegramGroupLink?: string; websiteUrl?: string; bio?: string }): Promise<User>;
  createSolturioWallet(userId: string, publicKey: string, encryptedPrivateKey: string): Promise<User>;
  markPrivateKeyExported(userId: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
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
  getAllMintedCollections(): Promise<Array<Collection & { user: User | null; logoCount: number }>>;
  updateCollectionStatus(id: string, status: string): Promise<Collection>;
  updateCollectionBlockchainData(id: string, data: {
    collectionAddress: string;
    transactionHash: string;
    explorerUrl: string;
    status: string;
    mintedAt: Date;
  }): Promise<Collection>;
  updateCollection(id: string, data: Partial<Collection>): Promise<Collection>;
  
  // Logo update operations
  updateLogo(id: string, data: Partial<Logo>): Promise<Logo>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentByIntentId(intentId: string): Promise<Payment | undefined>;
  getPaymentByTxHash(txHash: string): Promise<Payment | undefined>;
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
  
  // Quiz operations
  getQuizQuestions(category?: string, points?: number): Promise<any[]>;
  getQuizStats(userId: string): Promise<any>;
  submitQuizAnswer(userId: string, data: any): Promise<any>;
  createQuizQuestions(questions: any[]): Promise<void>;
  verifyAuthorizedUsage(id: string, verifiedAt: Date): Promise<AuthorizedUsage>;
  
  // Phase 1: Replay Prevention
  getNonceByValue(nonce: string): Promise<any | undefined>;
  storeNonce(nonce: string): Promise<void>;
  
  // Treasury Wallet operations
  createTreasuryWallet(wallet: InsertTreasuryWallet): Promise<TreasuryWallet>;
  getTreasuryWallets(): Promise<TreasuryWallet[]>;
  getTreasuryWalletByRole(role: string): Promise<TreasuryWallet | undefined>;
  getTreasuryWalletByAddress(address: string): Promise<TreasuryWallet | undefined>;
  updateTreasuryWallet(id: string, data: Partial<TreasuryWallet>): Promise<TreasuryWallet>;
  deleteTreasuryWallet(id: string): Promise<void>;
  
  // Compliance Log operations
  createComplianceLog(log: Partial<ComplianceLog>): Promise<ComplianceLog>;
  getComplianceLogs(limit?: number, offset?: number): Promise<ComplianceLog[]>;
  getComplianceLogsByUser(userId: string): Promise<ComplianceLog[]>;
  getComplianceLogsByTrigger(triggerCode: string): Promise<ComplianceLog[]>;
  
  // KYC Status operations
  getKycStatus(userId: string): Promise<KycStatus | undefined>;
  createOrUpdateKycStatus(userId: string, data: Partial<InsertKycStatus>): Promise<KycStatus>;
  updateKycTier(userId: string, tier: string): Promise<KycStatus>;
  updateRolling30DayVolume(userId: string, volume: string): Promise<KycStatus>;
  
  // Compliance Trigger Rules operations
  getActiveTriggerRules(): Promise<ComplianceTriggerRule[]>;
  getTriggerRuleByCode(code: string): Promise<ComplianceTriggerRule | undefined>;
  createTriggerRule(rule: Partial<ComplianceTriggerRule>): Promise<ComplianceTriggerRule>;
  updateTriggerRule(id: string, data: Partial<ComplianceTriggerRule>): Promise<ComplianceTriggerRule>;
  
  // Compliance Case operations
  createComplianceCase(caseData: Partial<ComplianceCase>): Promise<ComplianceCase>;
  getComplianceCases(status?: string): Promise<ComplianceCase[]>;
  getComplianceCaseByNumber(caseNumber: string): Promise<ComplianceCase | undefined>;
  updateComplianceCase(id: string, data: Partial<ComplianceCase>): Promise<ComplianceCase>;
  
  // License Contract operations
  createLicenseContract(license: InsertLicenseContract): Promise<LicenseContract>;
  getLicenseContract(id: string): Promise<LicenseContract | undefined>;
  getLicenseContractBySlug(slug: string): Promise<LicenseContract | undefined>;
  getLicenseContractsByLicensor(userId: string): Promise<LicenseContract[]>;
  getLicenseContractsByLicensee(walletAddress: string): Promise<LicenseContract[]>;
  getLicenseContractsByLogo(logoId: string): Promise<LicenseContract[]>;
  getLicenseContractsByAsset(assetId: string): Promise<LicenseContract[]>;
  getActiveLicenseForUserAndAsset(userId: string, assetId: string): Promise<LicenseContract | undefined>;
  updateLicenseContract(id: string, data: Partial<LicenseContract>): Promise<LicenseContract>;
  signLicenseContractAsLicensor(id: string, signature: string): Promise<LicenseContract>;
  signLicenseContractAsLicensee(id: string, signature: string): Promise<LicenseContract>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if a user with this email already exists (handles case where id differs but email is same)
    if (userData.email) {
      const [existingByEmail] = await db.select().from(users).where(eq(users.email, userData.email));
      if (existingByEmail && existingByEmail.id !== userData.id) {
        // Update the existing user by email, preserving their original id
        const [user] = await db
          .update(users)
          .set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return user;
      }
    }
    
    // Normal upsert by id
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
    handles: { twitterHandle?: string; telegramHandle?: string; discordHandle?: string; instagramHandle?: string; telegramGroupLink?: string; websiteUrl?: string; bio?: string }
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

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
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

  async getAllMintedCollections(): Promise<Array<Collection & { user: User | null; logoCount: number }>> {
    // Get all minted collections with their users
    const mintedCollections = await db
      .select()
      .from(collections)
      .where(eq(collections.status, 'minted'))
      .orderBy(desc(collections.mintedAt));
    
    // Enrich with user data and logo count
    const results = await Promise.all(
      mintedCollections.map(async (collection) => {
        const [user] = await db.select().from(users).where(eq(users.id, collection.userId));
        const collectionLogos = await db.select().from(logos).where(eq(logos.collectionId, collection.id));
        return {
          ...collection,
          user: user || null,
          logoCount: collectionLogos.length,
        };
      })
    );
    
    return results;
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

  async updateCollection(id: string, data: Partial<Collection>): Promise<Collection> {
    const [updated] = await db
      .update(collections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(collections.id, id))
      .returning();
    return updated;
  }

  async updateLogo(id: string, data: Partial<Logo>): Promise<Logo> {
    const [updated] = await db
      .update(logos)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(logos.id, id))
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

  async getPaymentByTxHash(txHash: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionSignature, txHash));
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
  
  // Quiz operations
  async getQuizQuestions(category?: string, points?: number): Promise<any[]> {
    const { quizQuestions } = await import("@shared/schema");
    let query = db.select().from(quizQuestions).where(eq(quizQuestions.isActive, true));
    
    // Apply filters if provided
    if (category) {
      query = query.where(eq(quizQuestions.category, category));
    }
    if (points) {
      query = query.where(eq(quizQuestions.points, points));
    }
    
    return query;
  }
  
  async getQuizStats(userId: string): Promise<any> {
    const { quizStats } = await import("@shared/schema");
    const [stats] = await db.select().from(quizStats).where(eq(quizStats.userId, userId));
    
    if (!stats) {
      // Create initial stats for user
      const [newStats] = await db
        .insert(quizStats)
        .values({ userId, totalPoints: 0, totalCathEarned: '0' })
        .returning();
      // Map to frontend expected field name
      return { ...newStats, totalSoltEarned: newStats.totalCathEarned };
    }
    
    // Map to frontend expected field name (column is totalCathEarned but we expose as totalSoltEarned)
    return { ...stats, totalSoltEarned: stats.totalCathEarned };
  }
  
  async submitQuizAnswer(userId: string, data: any): Promise<any> {
    const { quizQuestions, quizAttempts, quizStats } = await import("@shared/schema");
    
    // Get the question
    const [question] = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.id, data.questionId));
    
    if (!question) {
      throw new Error("Question not found");
    }
    
    // Check if answer is correct
    const isCorrect = data.answer === question.answer;
    let pointsEarned = 0;
    let soltReward = "0";
    
    // Get or create user stats
    let [userStats] = await db
      .select()
      .from(quizStats)
      .where(eq(quizStats.userId, userId));
    
    if (!userStats) {
      const [newStats] = await db
        .insert(quizStats)
        .values({ userId, totalPoints: 0, totalCathEarned: '0' })
        .returning();
      userStats = newStats;
    }
    
    if (isCorrect) {
      // Calculate points (reduced by 75% if hint used)
      pointsEarned = data.hintUsed ? Math.floor(data.originalPoints * 0.25) : data.originalPoints;
      
      // Calculate new streak
      const newStreak = (userStats.streak || 0) + 1;
      const newLongestStreak = Math.max(newStreak, userStats.longestStreak || 0);
      
      // Calculate $SOLT reward based on streak
      if (newStreak >= 10) {
        soltReward = "0.5";
      } else if (newStreak >= 5) {
        soltReward = "0.25";
      } else if (newStreak >= 3) {
        soltReward = "0.1";
      }
      
      // Update totals
      const currentSoltEarned = parseFloat(userStats.totalCathEarned || '0');
      const newSoltTotal = (currentSoltEarned + parseFloat(soltReward)).toFixed(2);
      
      // Update user stats
      await db
        .update(quizStats)
        .set({
          totalPoints: userStats.totalPoints + pointsEarned,
          totalQuestions: userStats.totalQuestions + 1,
          correctAnswers: userStats.correctAnswers + 1,
          streak: newStreak,
          longestStreak: newLongestStreak,
          totalCathEarned: newSoltTotal,
          lastQuizAt: new Date(),
        })
        .where(eq(quizStats.userId, userId));
    } else {
      // Wrong answer - reset streak, still count the question
      await db
        .update(quizStats)
        .set({
          totalQuestions: userStats.totalQuestions + 1,
          streak: 0,
          lastQuizAt: new Date(),
        })
        .where(eq(quizStats.userId, userId));
    }
    
    // Record the attempt
    await db.insert(quizAttempts).values({
      userId,
      questionId: data.questionId,
      userAnswer: data.answer,
      isCorrect,
      pointsEarned,
      timeToAnswer: data.timeToAnswer,
      hintUsed: data.hintUsed,
    });
    
    return { isCorrect, pointsEarned, correctAnswer: question.answer, soltReward };
  }
  
  async createQuizQuestions(questions: any[]): Promise<void> {
    const { quizQuestions } = await import("@shared/schema");
    await db.insert(quizQuestions).values(questions);
  }

  // Phase 1: Replay Prevention - Nonce Management
  async getNonceByValue(nonce: string): Promise<any | undefined> {
    try {
      // Query replay_prevention table using pool directly
      const result = await (db as any).$client.query(
        'SELECT * FROM replay_prevention WHERE nonce = $1 LIMIT 1',
        [nonce]
      );
      return result.rows?.[0];
    } catch (error) {
      console.error('Error fetching nonce:', error);
      return undefined;
    }
  }

  async storeNonce(nonce: string): Promise<void> {
    try {
      // Insert nonce using pool directly
      await (db as any).$client.query(
        'INSERT INTO replay_prevention (nonce, used_at, expires_at) VALUES ($1, NOW(), NOW() + INTERVAL \'24 hours\')',
        [nonce]
      );
    } catch (error: any) {
      console.error('Error storing nonce:', error);
      // Ignore unique constraint violations (duplicate nonce)
      if (error.code !== '23505') {
        throw error;
      }
    }
  }

  // Treasury Wallet operations
  async createTreasuryWallet(wallet: InsertTreasuryWallet): Promise<TreasuryWallet> {
    const [created] = await db
      .insert(treasuryWallets)
      .values(wallet)
      .returning();
    return created;
  }

  async getTreasuryWallets(): Promise<TreasuryWallet[]> {
    return db
      .select()
      .from(treasuryWallets)
      .orderBy(treasuryWallets.role);
  }

  async getTreasuryWalletByRole(role: string): Promise<TreasuryWallet | undefined> {
    const [wallet] = await db
      .select()
      .from(treasuryWallets)
      .where(eq(treasuryWallets.role, role));
    return wallet;
  }

  async getTreasuryWalletByAddress(address: string): Promise<TreasuryWallet | undefined> {
    const [wallet] = await db
      .select()
      .from(treasuryWallets)
      .where(eq(treasuryWallets.address, address));
    return wallet;
  }

  async updateTreasuryWallet(id: string, data: Partial<TreasuryWallet>): Promise<TreasuryWallet> {
    const [updated] = await db
      .update(treasuryWallets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(treasuryWallets.id, id))
      .returning();
    return updated;
  }

  async deleteTreasuryWallet(id: string): Promise<void> {
    await db.delete(treasuryWallets).where(eq(treasuryWallets.id, id));
  }

  // Compliance Log operations
  async createComplianceLog(log: Partial<ComplianceLog>): Promise<ComplianceLog> {
    const [created] = await db
      .insert(complianceLogs)
      .values(log as any)
      .returning();
    return created;
  }

  async getComplianceLogs(limit: number = 100, offset: number = 0): Promise<ComplianceLog[]> {
    return db
      .select()
      .from(complianceLogs)
      .orderBy(desc(complianceLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getComplianceLogsByUser(userId: string): Promise<ComplianceLog[]> {
    return db
      .select()
      .from(complianceLogs)
      .where(eq(complianceLogs.userId, userId))
      .orderBy(desc(complianceLogs.createdAt));
  }

  async getComplianceLogsByTrigger(triggerCode: string): Promise<ComplianceLog[]> {
    return db
      .select()
      .from(complianceLogs)
      .where(sql`${triggerCode} = ANY(${complianceLogs.triggersActivated})`)
      .orderBy(desc(complianceLogs.createdAt));
  }

  // KYC Status operations
  async getKycStatus(userId: string): Promise<KycStatus | undefined> {
    const [status] = await db
      .select()
      .from(kycStatus)
      .where(eq(kycStatus.userId, userId));
    return status;
  }

  async createOrUpdateKycStatus(userId: string, data: Partial<InsertKycStatus>): Promise<KycStatus> {
    const existing = await this.getKycStatus(userId);
    
    if (existing) {
      const [updated] = await db
        .update(kycStatus)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(kycStatus.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(kycStatus)
        .values({ userId, ...data } as any)
        .returning();
      return created;
    }
  }

  async updateKycTier(userId: string, tier: string): Promise<KycStatus> {
    return this.createOrUpdateKycStatus(userId, { tier } as any);
  }

  async updateRolling30DayVolume(userId: string, volume: string): Promise<KycStatus> {
    const [updated] = await db
      .update(kycStatus)
      .set({ 
        rolling30DayVolume: volume, 
        last30DayVolumeUpdatedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(kycStatus.userId, userId))
      .returning();
    return updated;
  }

  // Compliance Trigger Rules operations
  async getActiveTriggerRules(): Promise<ComplianceTriggerRule[]> {
    return db
      .select()
      .from(complianceTriggerRules)
      .where(eq(complianceTriggerRules.isActive, true))
      .orderBy(complianceTriggerRules.category);
  }

  async getTriggerRuleByCode(code: string): Promise<ComplianceTriggerRule | undefined> {
    const [rule] = await db
      .select()
      .from(complianceTriggerRules)
      .where(eq(complianceTriggerRules.triggerCode, code));
    return rule;
  }

  async createTriggerRule(rule: Partial<ComplianceTriggerRule>): Promise<ComplianceTriggerRule> {
    const [created] = await db
      .insert(complianceTriggerRules)
      .values(rule as any)
      .returning();
    return created;
  }

  async updateTriggerRule(id: string, data: Partial<ComplianceTriggerRule>): Promise<ComplianceTriggerRule> {
    const [updated] = await db
      .update(complianceTriggerRules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(complianceTriggerRules.id, id))
      .returning();
    return updated;
  }

  // Compliance Case operations
  async createComplianceCase(caseData: Partial<ComplianceCase>): Promise<ComplianceCase> {
    const [created] = await db
      .insert(complianceCases)
      .values(caseData as any)
      .returning();
    return created;
  }

  async getComplianceCases(status?: string): Promise<ComplianceCase[]> {
    if (status) {
      return db
        .select()
        .from(complianceCases)
        .where(eq(complianceCases.status, status))
        .orderBy(desc(complianceCases.createdAt));
    }
    return db
      .select()
      .from(complianceCases)
      .orderBy(desc(complianceCases.createdAt));
  }

  async getComplianceCaseByNumber(caseNumber: string): Promise<ComplianceCase | undefined> {
    const [caseRecord] = await db
      .select()
      .from(complianceCases)
      .where(eq(complianceCases.caseNumber, caseNumber));
    return caseRecord;
  }

  async updateComplianceCase(id: string, data: Partial<ComplianceCase>): Promise<ComplianceCase> {
    const [updated] = await db
      .update(complianceCases)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(complianceCases.id, id))
      .returning();
    return updated;
  }

  // License Contract operations
  async createLicenseContract(license: InsertLicenseContract): Promise<LicenseContract> {
    // Generate shareable slug
    const slug = `lic-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    const [created] = await db
      .insert(licenseContracts)
      .values({ ...license, shareableSlug: slug } as any)
      .returning();
    return created;
  }

  async getLicenseContract(id: string): Promise<LicenseContract | undefined> {
    const [license] = await db
      .select()
      .from(licenseContracts)
      .where(eq(licenseContracts.id, id));
    return license;
  }

  async getLicenseContractBySlug(slug: string): Promise<LicenseContract | undefined> {
    const [license] = await db
      .select()
      .from(licenseContracts)
      .where(eq(licenseContracts.shareableSlug, slug));
    return license;
  }

  async getLicenseContractsByLicensor(userId: string): Promise<LicenseContract[]> {
    return db
      .select()
      .from(licenseContracts)
      .where(eq(licenseContracts.licensorUserId, userId))
      .orderBy(desc(licenseContracts.createdAt));
  }

  async getLicenseContractsByLicensee(walletAddress: string): Promise<LicenseContract[]> {
    return db
      .select()
      .from(licenseContracts)
      .where(eq(licenseContracts.licenseeWallet, walletAddress))
      .orderBy(desc(licenseContracts.createdAt));
  }

  async getLicenseContractsByLogo(logoId: string): Promise<LicenseContract[]> {
    return db
      .select()
      .from(licenseContracts)
      .where(eq(licenseContracts.logoId, logoId))
      .orderBy(desc(licenseContracts.createdAt));
  }

  async getLicenseContractsByAsset(assetId: string): Promise<LicenseContract[]> {
    return db
      .select()
      .from(licenseContracts)
      .where(eq(licenseContracts.assetId, assetId))
      .orderBy(desc(licenseContracts.createdAt));
  }

  async getActiveLicenseForUserAndAsset(userId: string, assetId: string): Promise<LicenseContract | undefined> {
    const user = await this.getUser(userId);
    if (!user?.walletAddress) return undefined;
    
    const [license] = await db
      .select()
      .from(licenseContracts)
      .where(
        and(
          eq(licenseContracts.assetId, assetId),
          eq(licenseContracts.licenseeWallet, user.walletAddress),
          eq(licenseContracts.status, 'active')
        )
      );
    return license;
  }

  async updateLicenseContract(id: string, data: Partial<LicenseContract>): Promise<LicenseContract> {
    const [updated] = await db
      .update(licenseContracts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(licenseContracts.id, id))
      .returning();
    return updated;
  }

  async signLicenseContractAsLicensor(id: string, signature: string): Promise<LicenseContract> {
    const [updated] = await db
      .update(licenseContracts)
      .set({
        licensorSignature: signature,
        licensorSignedAt: new Date(),
        status: 'pending_licensee_signature',
        updatedAt: new Date(),
      })
      .where(eq(licenseContracts.id, id))
      .returning();
    return updated;
  }

  async signLicenseContractAsLicensee(id: string, signature: string): Promise<LicenseContract> {
    const [updated] = await db
      .update(licenseContracts)
      .set({
        licenseeSignature: signature,
        licenseeSignedAt: new Date(),
        status: 'pending_payment',
        updatedAt: new Date(),
      })
      .where(eq(licenseContracts.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
