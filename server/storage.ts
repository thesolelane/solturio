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
  visitorAccounts,
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
  type VisitorAccount,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, gte, lt, sql } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  updateWalletAddress(userId: string, walletAddress: string): Promise<User>;
  updateEmailVerified(userId: string, verified: boolean): Promise<User>;
  updateNotificationPreferences(
    userId: string,
    notifyPaymentsDue: boolean,
    notifyRentalReminders: boolean
  ): Promise<User>;
  updateSocialHandles(
    userId: string,
    handles: {
      twitterHandle?: string;
      telegramHandle?: string;
      discordHandle?: string;
      instagramHandle?: string;
      telegramGroupLink?: string;
      websiteUrl?: string;
      bio?: string;
    }
  ): Promise<User>;
  createSolturioWallet(
    userId: string,
    publicKey: string,
    encryptedPrivateKey: string
  ): Promise<User>;
  markPrivateKeyExported(userId: string): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Logo operations
  createLogo(logo: InsertLogo): Promise<Logo>;
  getLogosByUserId(userId: string): Promise<Logo[]>;
  getLogosByCollectionId(collectionId: string): Promise<Logo[]>;
  updateLogoNFTData(
    logoId: string,
    data: {
      nftAddress: string;
      transactionHash: string;
      mintedAt: Date;
    }
  ): Promise<Logo>;
  getLogoById(logoId: string): Promise<Logo | undefined>;
  updateLogoIPFS(logoId: string, ipfsHash: string, ipfsMetadataHash?: string): Promise<Logo>;
  getLogosByFileHash(fileHash: string): Promise<Logo[]>;

  // Collection operations
  createCollection(collection: InsertCollection): Promise<Collection>;
  getCollection(id: string): Promise<Collection | undefined>;
  getCollectionsByUserId(userId: string): Promise<Collection[]>;
  getAllMintedCollections(): Promise<Array<Collection & { user: User | null; logoCount: number }>>;
  updateCollectionStatus(id: string, status: string): Promise<Collection>;
  updateCollectionBlockchainData(
    id: string,
    data: {
      collectionAddress: string;
      transactionHash: string;
      explorerUrl: string;
      status: string;
      mintedAt: Date;
    }
  ): Promise<Collection>;
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
  updateTriggerRule(
    id: string,
    data: Partial<ComplianceTriggerRule>
  ): Promise<ComplianceTriggerRule>;

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
  getActiveLicenseForUserAndAsset(
    userId: string,
    assetId: string
  ): Promise<LicenseContract | undefined>;
  updateLicenseContract(id: string, data: Partial<LicenseContract>): Promise<LicenseContract>;
  searchLicensesByTransaction(query: string, userId: string): Promise<LicenseContract[]>;
  signLicenseContractAsLicensor(id: string, signature: string): Promise<LicenseContract>;
  signLicenseContractAsLicensee(id: string, signature: string): Promise<LicenseContract>;

  // Visitor Account operations
  createVisitorAccount(email: string, marketingOptIn?: boolean): Promise<any>;
  getVisitorAccountByEmail(email: string): Promise<any | undefined>;
  getVisitorAccountById(id: string): Promise<any | undefined>;
  verifyVisitorEmail(token: string): Promise<any | undefined>;
  updateVisitorLastLogin(id: string): Promise<any>;
  submitVisitorQuizAnswer(visitorId: string, data: any): Promise<any>;
  getVisitorQuizStats(visitorId: string): Promise<any>;
  convertVisitorToUser(
    visitorId: string,
    userId: string
  ): Promise<{
    transferred: boolean;
    soltRewards: string;
    gamePoints: number;
    experiencePoints: number;
  }>;
  checkExpiredVisitorRewards(): Promise<number>;
  verifyVisitorSessionToken(visitorId: string, sessionToken: string): Promise<boolean>;
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
      const [existingByEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email));
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
    handles: {
      twitterHandle?: string;
      telegramHandle?: string;
      discordHandle?: string;
      instagramHandle?: string;
      telegramGroupLink?: string;
      websiteUrl?: string;
      bio?: string;
    }
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...handles, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createSolturioWallet(
    userId: string,
    publicKey: string,
    encryptedPrivateKey: string
  ): Promise<User> {
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

  async updateLogoNFTData(
    logoId: string,
    data: {
      nftAddress: string;
      transactionHash: string;
      mintedAt: Date;
    }
  ): Promise<Logo> {
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
        updatedAt: new Date(),
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

  async getAllMintedCollections(): Promise<
    Array<Collection & { user: User | null; logoCount: number }>
  > {
    // Get all minted collections with their users
    const mintedCollections = await db
      .select()
      .from(collections)
      .where(eq(collections.status, "minted"))
      .orderBy(desc(collections.mintedAt));

    // Enrich with user data and logo count
    const results = await Promise.all(
      mintedCollections.map(async (collection) => {
        const [user] = await db.select().from(users).where(eq(users.id, collection.userId));
        const collectionLogos = await db
          .select()
          .from(logos)
          .where(eq(logos.collectionId, collection.id));
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

  async updateCollectionBlockchainData(
    id: string,
    data: {
      collectionAddress: string;
      transactionHash: string;
      explorerUrl: string;
      status: string;
      mintedAt: Date;
    }
  ): Promise<Collection> {
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
    const userCollections = await db
      .select()
      .from(collections)
      .where(eq(collections.userId, userId));

    return {
      totalLogos: userLogos.length,
      mintedCollections: userCollections.filter((c) => c.status === "minted").length,
      pendingLogos: userLogos.filter((l) => !l.nftAddress).length,
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

  async updateAuthorizedUsage(
    id: string,
    data: Partial<AuthorizedUsage>
  ): Promise<AuthorizedUsage> {
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

    const conditions = [eq(quizQuestions.isActive, true)];
    if (category) conditions.push(eq(quizQuestions.category, category));
    if (points) conditions.push(eq(quizQuestions.points, points));

    return db
      .select()
      .from(quizQuestions)
      .where(and(...conditions));
  }

  async getQuizStats(userId: string): Promise<any> {
    const { quizStats } = await import("@shared/schema");
    const [stats] = await db.select().from(quizStats).where(eq(quizStats.userId, userId));

    if (!stats) {
      // Create initial stats for user
      const [newStats] = await db
        .insert(quizStats)
        .values({ userId, totalPoints: 0, totalCathEarned: "0" })
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
    let [userStats] = await db.select().from(quizStats).where(eq(quizStats.userId, userId));

    if (!userStats) {
      const [newStats] = await db
        .insert(quizStats)
        .values({ userId, totalPoints: 0, totalCathEarned: "0" })
        .returning();
      userStats = newStats;
    }

    if (isCorrect) {
      // Calculate points (reduced by 75% if hint used)
      pointsEarned = data.hintUsed ? Math.floor(data.originalPoints * 0.25) : data.originalPoints;

      // Calculate new streak
      const newStreak = (userStats.streak || 0) + 1;
      const newLongestStreak = Math.max(newStreak, userStats.longestStreak || 0);

      // Calculate base $SOLT reward based on streak
      let baseReward = 0;
      if (newStreak >= 10) {
        baseReward = 0.5;
      } else if (newStreak >= 5) {
        baseReward = 0.25;
      } else if (newStreak >= 3) {
        baseReward = 0.1;
      }

      // Apply time-based multiplier for early adopters
      // Set SOLTURIO_LAUNCH_DATE env var when ready (format: YYYY-MM-DD)
      // If not set, multipliers are disabled (1x rewards)
      const launchDateStr = process.env.SOLTURIO_LAUNCH_DATE;
      let multiplier = 1.0;
      let multiplierLabel = "Standard";

      if (launchDateStr) {
        const LAUNCH_DATE = new Date(launchDateStr);
        const now = new Date();
        const daysSinceLaunch = Math.floor(
          (now.getTime() - LAUNCH_DATE.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLaunch >= 0 && daysSinceLaunch <= 60) {
          // Days 0-60: 2.5x multiplier (Launch promotion)
          multiplier = 2.5;
          multiplierLabel = "2.5x Launch Bonus";
        } else if (daysSinceLaunch > 60 && daysSinceLaunch <= 100) {
          // Days 61-100: 1.5x multiplier (Early adopter bonus)
          multiplier = 1.5;
          multiplierLabel = "1.5x Early Adopter";
        }
        // After day 100: 1x (normal rewards)
      }

      const finalReward = baseReward * multiplier;
      soltReward = finalReward.toFixed(2);

      // Update totals
      const currentSoltEarned = parseFloat(userStats.totalCathEarned || "0");
      const newSoltTotal = (currentSoltEarned + finalReward).toFixed(2);

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

    // Calculate current multiplier info for frontend display
    // Uses SOLTURIO_LAUNCH_DATE env var (format: YYYY-MM-DD)
    const launchDateEnv = process.env.SOLTURIO_LAUNCH_DATE;
    let currentMultiplier = 1.0;
    let currentMultiplierLabel = "Standard";
    let daysRemaining = 0;

    if (launchDateEnv) {
      const launchDate = new Date(launchDateEnv);
      const currentTime = new Date();
      const daysSince = Math.floor(
        (currentTime.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSince >= 0 && daysSince <= 60) {
        currentMultiplier = 2.5;
        currentMultiplierLabel = "2.5x Launch Bonus";
        daysRemaining = 60 - daysSince;
      } else if (daysSince > 60 && daysSince <= 100) {
        currentMultiplier = 1.5;
        currentMultiplierLabel = "1.5x Early Adopter";
        daysRemaining = 100 - daysSince;
      }
    }

    return {
      isCorrect,
      pointsEarned,
      correctAnswer: question.answer,
      soltReward,
      multiplier: currentMultiplier,
      multiplierLabel: currentMultiplierLabel,
      daysRemaining,
    };
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
        "SELECT * FROM replay_prevention WHERE nonce = $1 LIMIT 1",
        [nonce]
      );
      return result.rows?.[0];
    } catch (error) {
      console.error("Error fetching nonce:", error);
      return undefined;
    }
  }

  async storeNonce(nonce: string): Promise<void> {
    try {
      // Insert nonce using pool directly
      await (db as any).$client.query(
        "INSERT INTO replay_prevention (nonce, used_at, expires_at) VALUES ($1, NOW(), NOW() + INTERVAL '24 hours')",
        [nonce]
      );
    } catch (error: any) {
      console.error("Error storing nonce:", error);
      // Ignore unique constraint violations (duplicate nonce)
      if (error.code !== "23505") {
        throw error;
      }
    }
  }

  // Treasury Wallet operations
  async createTreasuryWallet(wallet: InsertTreasuryWallet): Promise<TreasuryWallet> {
    const [created] = await db.insert(treasuryWallets).values(wallet).returning();
    return created;
  }

  async getTreasuryWallets(): Promise<TreasuryWallet[]> {
    return db.select().from(treasuryWallets).orderBy(treasuryWallets.role);
  }

  async getTreasuryWalletByRole(role: string): Promise<TreasuryWallet | undefined> {
    const [wallet] = await db.select().from(treasuryWallets).where(eq(treasuryWallets.role, role));
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
    const [status] = await db.select().from(kycStatus).where(eq(kycStatus.userId, userId));
    return status;
  }

  async createOrUpdateKycStatus(
    userId: string,
    data: Partial<InsertKycStatus>
  ): Promise<KycStatus> {
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
        updatedAt: new Date(),
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

  async updateTriggerRule(
    id: string,
    data: Partial<ComplianceTriggerRule>
  ): Promise<ComplianceTriggerRule> {
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
    return db.select().from(complianceCases).orderBy(desc(complianceCases.createdAt));
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
    const [license] = await db.select().from(licenseContracts).where(eq(licenseContracts.id, id));
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

  async getActiveLicenseForUserAndAsset(
    userId: string,
    assetId: string
  ): Promise<LicenseContract | undefined> {
    const user = await this.getUser(userId);
    if (!user?.walletAddress) return undefined;

    const [license] = await db
      .select()
      .from(licenseContracts)
      .where(
        and(
          eq(licenseContracts.assetId, assetId),
          eq(licenseContracts.licenseeWallet, user.walletAddress),
          eq(licenseContracts.status, "active")
        )
      );
    return license;
  }

  async updateLicenseContract(
    id: string,
    data: Partial<LicenseContract>
  ): Promise<LicenseContract> {
    const [updated] = await db
      .update(licenseContracts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(licenseContracts.id, id))
      .returning();
    return updated;
  }

  async searchLicensesByTransaction(query: string, userId: string): Promise<LicenseContract[]> {
    const user = await this.getUser(userId);
    const userWallets: string[] = [];
    if (user?.walletAddress) userWallets.push(user.walletAddress);
    if (user?.solanaPublicKey) userWallets.push(user.solanaPublicKey);

    const results = await db
      .select()
      .from(licenseContracts)
      .where(
        and(
          or(
            eq(licenseContracts.licensorUserId, userId),
            ...(userWallets.length > 0
              ? userWallets.map((w) => eq(licenseContracts.licenseeWallet, w))
              : [])
          ),
          or(
            eq(licenseContracts.p2pTransactionHash, query),
            eq(licenseContracts.p2pSenderWallet, query),
            eq(licenseContracts.p2pReceiverWallet, query)
          )
        )
      )
      .orderBy(desc(licenseContracts.createdAt));
    return results;
  }

  async signLicenseContractAsLicensor(id: string, signature: string): Promise<LicenseContract> {
    const [updated] = await db
      .update(licenseContracts)
      .set({
        licensorSignature: signature,
        licensorSignedAt: new Date(),
        status: "pending_licensee_signature",
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
        status: "pending_payment",
        updatedAt: new Date(),
      })
      .where(eq(licenseContracts.id, id))
      .returning();
    return updated;
  }

  // Visitor Account operations
  async createVisitorAccount(
    email: string,
    marketingOptIn: boolean = false
  ): Promise<VisitorAccount> {
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const rewardsExpireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const [visitor] = await db
      .insert(visitorAccounts)
      .values({
        email: email.toLowerCase().trim(),
        verificationToken,
        verificationTokenExpiresAt: tokenExpiresAt,
        marketingOptIn,
        lastLoginAt: new Date(),
        rewardsExpireAt,
      })
      .returning();
    return visitor;
  }

  async getVisitorAccountByEmail(email: string): Promise<VisitorAccount | undefined> {
    const [visitor] = await db
      .select()
      .from(visitorAccounts)
      .where(eq(visitorAccounts.email, email.toLowerCase().trim()));
    return visitor;
  }

  async getVisitorAccountById(id: string): Promise<VisitorAccount | undefined> {
    const [visitor] = await db.select().from(visitorAccounts).where(eq(visitorAccounts.id, id));
    return visitor;
  }

  async verifyVisitorEmail(token: string): Promise<VisitorAccount | undefined> {
    const [visitor] = await db
      .select()
      .from(visitorAccounts)
      .where(
        and(
          eq(visitorAccounts.verificationToken, token),
          gte(visitorAccounts.verificationTokenExpiresAt, new Date())
        )
      );

    if (!visitor) return undefined;

    const [updated] = await db
      .update(visitorAccounts)
      .set({
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(visitorAccounts.id, visitor.id))
      .returning();

    return updated;
  }

  async updateVisitorLastLogin(id: string): Promise<VisitorAccount & { newSessionToken: string }> {
    const now = new Date();
    const rewardsExpireAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    const sessionToken = crypto.randomBytes(32).toString("hex"); // Generate new session token on login

    const [updated] = await db
      .update(visitorAccounts)
      .set({
        lastLoginAt: now,
        rewardsExpireAt,
        sessionToken,
        updatedAt: now,
      })
      .where(eq(visitorAccounts.id, id))
      .returning();
    return { ...updated, newSessionToken: sessionToken };
  }

  async verifyVisitorSessionToken(visitorId: string, sessionToken: string): Promise<boolean> {
    const visitor = await this.getVisitorAccountById(visitorId);
    if (!visitor || !visitor.sessionToken) return false;
    return visitor.sessionToken === sessionToken;
  }

  async submitVisitorQuizAnswer(visitorId: string, data: any): Promise<any> {
    const visitor = await this.getVisitorAccountById(visitorId);
    if (!visitor) throw new Error("Visitor not found");

    // Extend last login and rewards expiration on activity
    const now = new Date();
    const newRewardsExpireAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    // Check if rewards have expired
    if (visitor.rewardsExpireAt && now > visitor.rewardsExpireAt) {
      // Reset rewards before processing new answer
      await db
        .update(visitorAccounts)
        .set({
          pendingSoltRewards: "0",
          pendingGamePoints: 0,
          pendingExperiencePoints: 0,
          currentStreak: 0,
          lastLoginAt: now,
          rewardsExpireAt: newRewardsExpireAt,
        })
        .where(eq(visitorAccounts.id, visitorId));
    }

    const { quizQuestions } = await import("@shared/schema");
    const [question] = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.id, data.questionId));

    if (!question) throw new Error("Question not found");

    const isCorrect = data.answer === question.answer;
    let pointsEarned = 0;
    let soltReward = "0";
    let newStreak = visitor.currentStreak || 0;

    if (isCorrect) {
      // Calculate points (75% reduction if hint used)
      pointsEarned = data.hintUsed
        ? Math.floor((question.points || 10) * 0.25)
        : question.points || 10;
      newStreak = newStreak + 1;

      // Calculate $SOLT reward based on streak
      let baseReward = 0;
      if (newStreak >= 10) {
        baseReward = 0.5;
      } else if (newStreak >= 5) {
        baseReward = 0.25;
      } else if (newStreak >= 3) {
        baseReward = 0.1;
      }

      // Apply time-based multiplier
      const launchDateStr = process.env.SOLTURIO_LAUNCH_DATE;
      let multiplier = 1.0;

      if (launchDateStr) {
        const LAUNCH_DATE = new Date(launchDateStr);
        const now = new Date();
        const daysSinceLaunch = Math.floor(
          (now.getTime() - LAUNCH_DATE.getTime()) / (1000 * 60 * 60 * 1000)
        );

        if (daysSinceLaunch >= 0 && daysSinceLaunch <= 60) {
          multiplier = 2.5;
        } else if (daysSinceLaunch > 60 && daysSinceLaunch <= 100) {
          multiplier = 1.5;
        }
      }

      const finalReward = baseReward * multiplier;
      soltReward = finalReward.toFixed(2);
    } else {
      newStreak = 0;
    }

    // Update visitor stats and extend rewards expiration on activity
    const currentSolt = parseFloat(visitor.pendingSoltRewards || "0");
    const newSolt = (currentSolt + parseFloat(soltReward)).toFixed(2);

    await db
      .update(visitorAccounts)
      .set({
        pendingSoltRewards: newSolt,
        pendingGamePoints: (visitor.pendingGamePoints || 0) + pointsEarned,
        pendingExperiencePoints: (visitor.pendingExperiencePoints || 0) + (isCorrect ? 10 : 2),
        currentStreak: newStreak,
        highestStreak: Math.max(newStreak, visitor.highestStreak || 0),
        questionsAnswered: (visitor.questionsAnswered || 0) + 1,
        correctAnswers: (visitor.correctAnswers || 0) + (isCorrect ? 1 : 0),
        lastLoginAt: now,
        rewardsExpireAt: newRewardsExpireAt,
        updatedAt: now,
      })
      .where(eq(visitorAccounts.id, visitorId));

    return {
      isCorrect,
      pointsEarned,
      correctAnswer: question.answer,
      soltReward,
      newStreak,
      pendingRewards: true, // Indicates rewards are pending until account upgrade
    };
  }

  async getVisitorQuizStats(visitorId: string): Promise<any> {
    const visitor = await this.getVisitorAccountById(visitorId);
    if (!visitor) return null;

    // Check if rewards expired
    const rewardsExpired = visitor.rewardsExpireAt && new Date() > visitor.rewardsExpireAt;

    return {
      currentStreak: rewardsExpired ? 0 : visitor.currentStreak || 0,
      highestStreak: visitor.highestStreak || 0,
      totalGamePoints: rewardsExpired ? 0 : visitor.pendingGamePoints || 0,
      totalExperiencePoints: rewardsExpired ? 0 : visitor.pendingExperiencePoints || 0,
      pendingSoltRewards: rewardsExpired ? "0" : visitor.pendingSoltRewards || "0",
      questionsAnswered: visitor.questionsAnswered || 0,
      correctAnswers: visitor.correctAnswers || 0,
      rewardsExpireAt: visitor.rewardsExpireAt,
      rewardsExpired,
      pendingRewards: true,
    };
  }

  async convertVisitorToUser(
    visitorId: string,
    userId: string
  ): Promise<{
    transferred: boolean;
    soltRewards: string;
    gamePoints: number;
    experiencePoints: number;
  }> {
    const visitor = await this.getVisitorAccountById(visitorId);
    if (!visitor) throw new Error("Visitor not found");

    // Check if rewards expired
    const rewardsExpired = visitor.rewardsExpireAt && new Date() > visitor.rewardsExpireAt;

    if (rewardsExpired) {
      // Mark as converted but don't transfer rewards
      await db
        .update(visitorAccounts)
        .set({
          convertedToUserId: userId,
          convertedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(visitorAccounts.id, visitorId));

      return { transferred: false, soltRewards: "0", gamePoints: 0, experiencePoints: 0 };
    }

    // Get quiz stats table
    const { quizStats } = await import("@shared/schema");

    // Check if user already has quiz stats
    const [existingStats] = await db.select().from(quizStats).where(eq(quizStats.userId, userId));

    const soltToTransfer = visitor.pendingSoltRewards || "0";
    const gamePointsToTransfer = visitor.pendingGamePoints || 0;
    const xpToTransfer = visitor.pendingExperiencePoints || 0;

    if (existingStats) {
      // Add pending rewards to existing stats
      // Note: quizStats uses totalPoints for game points, no separate XP field
      const currentCath = parseFloat(existingStats.totalCathEarned || "0");
      const newCath = (currentCath + parseFloat(soltToTransfer)).toFixed(2);

      await db
        .update(quizStats)
        .set({
          totalPoints: (existingStats.totalPoints || 0) + gamePointsToTransfer,
          totalCathEarned: newCath,
          totalQuestions: (existingStats.totalQuestions || 0) + (visitor.questionsAnswered || 0),
          correctAnswers: (existingStats.correctAnswers || 0) + (visitor.correctAnswers || 0),
          longestStreak: Math.max(existingStats.longestStreak || 0, visitor.highestStreak || 0),
          streak: visitor.currentStreak || 0,
        })
        .where(eq(quizStats.userId, userId));
    } else {
      // Create new stats record with visitor's rewards
      await db.insert(quizStats).values({
        userId,
        totalPoints: gamePointsToTransfer,
        totalCathEarned: soltToTransfer,
        streak: visitor.currentStreak || 0,
        longestStreak: visitor.highestStreak || 0,
        totalQuestions: visitor.questionsAnswered || 0,
        correctAnswers: visitor.correctAnswers || 0,
      });
    }

    // Update user's SOLT balance
    const user = await this.getUser(userId);
    if (user) {
      const currentBalance = parseFloat(user.sltrBalance || "0");
      const newBalance = (currentBalance + parseFloat(soltToTransfer)).toFixed(2);

      await db
        .update(users)
        .set({
          sltrBalance: newBalance,
          sltrTotalEarned: (
            parseFloat(user.sltrTotalEarned || "0") + parseFloat(soltToTransfer)
          ).toFixed(2),
        })
        .where(eq(users.id, userId));
    }

    // Mark visitor as converted
    await db
      .update(visitorAccounts)
      .set({
        convertedToUserId: userId,
        convertedAt: new Date(),
        pendingSoltRewards: "0",
        pendingGamePoints: 0,
        pendingExperiencePoints: 0,
        currentStreak: 0,
        updatedAt: new Date(),
      })
      .where(eq(visitorAccounts.id, visitorId));

    return {
      transferred: true,
      soltRewards: soltToTransfer,
      gamePoints: gamePointsToTransfer,
      experiencePoints: xpToTransfer,
    };
  }

  async checkExpiredVisitorRewards(): Promise<number> {
    // Find visitors with expired rewards and reset them
    const expired = await db
      .update(visitorAccounts)
      .set({
        pendingSoltRewards: "0",
        pendingGamePoints: 0,
        pendingExperiencePoints: 0,
        currentStreak: 0,
      })
      .where(
        and(
          lt(visitorAccounts.rewardsExpireAt, new Date()),
          eq(visitorAccounts.convertedToUserId, null as any)
        )
      )
      .returning();

    return expired.length;
  }
}

export const storage = new DatabaseStorage();
