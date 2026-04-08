import { Router } from "express";
import { isAuthenticated } from "./replitAuth";
import { isAdmin } from "./admin-middleware";
import { storage } from "./storage";
import { pool } from "./db";
import { arweaveService } from "./services/arweave";
import { Connection, PublicKey } from "@solana/web3.js";

export const adminRouter = Router();

adminRouter.get("/admin/stats", isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const allUsers = await storage.getAllUsers();
    const mintedCollections = await storage.getAllMintedCollections();

    let totalLogos = 0;
    for (const user of allUsers) {
      const userLogos = await storage.getLogosByUserId(user.id);
      totalLogos += userLogos.length;
    }

    const usersWithWallets = allUsers.filter((u) => u.walletAddress || u.walletName).length;

    res.json({
      totalUsers: allUsers.length,
      logosProtected: totalLogos,
      mintedCollections: mintedCollections.length,
      usersWithWallets,
      partnerDexs: 0,
      pendingDexs: 0,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ message: "Failed to fetch admin stats" });
  }
});

adminRouter.get("/admin/wallets", isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const arweaveBalance = await arweaveService.getWalletBalance();
    const arweaveAddress = await arweaveService.getWalletAddress();

    const solBalance = null;
    const solAddress = null;

    res.json({
      arweave: {
        balance: arweaveBalance,
        address: arweaveAddress,
        unit: "AR",
      },
      solana: {
        balance: solBalance,
        address: solAddress,
        unit: "SOL",
        network: "devnet",
      },
    });
  } catch (error) {
    console.error("Error fetching wallet balances:", error);
    res.status(500).json({ message: "Failed to fetch wallet balances" });
  }
});

adminRouter.get(
  "/admin/arweave/purchase-info",
  isAuthenticated,
  isAdmin,
  async (req: any, res) => {
    try {
      const balance = await arweaveService.getWalletBalance();
      const address = await arweaveService.getWalletAddress();
      const configured = arweaveService.isConfigured();

      const avgBadgeSize = 50000;
      const avgMetadataSize = 2000;
      let estimatedBadgeCost: string | null = null;
      let estimatedMetadataCost: string | null = null;
      let estimatedUploadsRemaining: number | null = null;

      if (configured) {
        try {
          estimatedBadgeCost = await arweaveService.estimateCost(avgBadgeSize);
          estimatedMetadataCost = await arweaveService.estimateCost(avgMetadataSize);

          if (balance && estimatedBadgeCost) {
            const balNum = parseFloat(balance);
            const costNum = parseFloat(estimatedBadgeCost);
            if (costNum > 0) {
              estimatedUploadsRemaining = Math.floor(balNum / costNum);
            }
          }
        } catch (err) {
          console.error("Error estimating Arweave costs:", err);
        }
      }

      const lowBalanceThreshold = 0.05;
      const isLowBalance = balance ? parseFloat(balance) < lowBalanceThreshold : true;

      res.json({
        configured,
        balance,
        address,
        unit: "AR",
        estimatedBadgeCost,
        estimatedMetadataCost,
        estimatedUploadsRemaining,
        isLowBalance,
        lowBalanceThreshold,
        exchangeLinks: [
          {
            name: "Coinbase",
            url: "https://www.coinbase.com/price/arweave",
            description: "Buy AR with card or bank transfer",
          },
          {
            name: "Binance",
            url: "https://www.binance.com/en/trade/AR_USDT",
            description: "Trade AR/USDT pair",
          },
          {
            name: "Gate.io",
            url: "https://www.gate.io/trade/AR_USDT",
            description: "Buy AR with USDT",
          },
          {
            name: "OKX",
            url: "https://www.okx.com/trade-spot/ar-usdt",
            description: "Trade AR on OKX",
          },
        ],
        topUpInstructions: address
          ? [
              `1. Purchase AR tokens on any supported exchange`,
              `2. Withdraw AR to this address: ${address}`,
              `3. Wait for network confirmation (typically 5-10 minutes)`,
              `4. Refresh this page to verify updated balance`,
            ]
          : ["Configure ARWEAVE_WALLET_KEY secret to enable Arweave storage"],
      });
    } catch (error) {
      console.error("Error fetching Arweave purchase info:", error);
      res.status(500).json({ message: "Failed to fetch Arweave purchase info" });
    }
  }
);

adminRouter.get("/admin/treasury/wallets", isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const wallets = await storage.getTreasuryWallets();

    const walletsWithBalances = await Promise.all(
      wallets.map(async (wallet) => {
        let balance = wallet.cachedBalance;
        try {
          const connection = new Connection(
            wallet.network === "mainnet"
              ? "https://api.mainnet-beta.solana.com"
              : "https://api.devnet.solana.com"
          );
          const balanceLamports = await connection.getBalance(new PublicKey(wallet.address));
          balance = (balanceLamports / 1e9).toFixed(6);

          await storage.updateTreasuryWallet(wallet.id, {
            cachedBalance: balance,
            lastBalanceCheck: new Date(),
          });
        } catch (err) {
          console.error(`Failed to fetch balance for ${wallet.address}:`, err);
        }

        return { ...wallet, cachedBalance: balance };
      })
    );

    res.json(walletsWithBalances);
  } catch (error) {
    console.error("Error fetching treasury wallets:", error);
    res.status(500).json({ message: "Failed to fetch treasury wallets" });
  }
});

adminRouter.post("/admin/treasury/wallets", isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const {
      role,
      name,
      address,
      domainName,
      purpose,
      network,
      sweepThreshold,
      sweepSchedule,
      sweepDestination,
      requiredSignatures,
      authorizedSigners,
    } = req.body;

    if (!role || !name || !address) {
      return res.status(400).json({ message: "Role, name, and address are required" });
    }

    if (role !== "bank") {
      const existing = await storage.getTreasuryWalletByRole(role);
      if (existing) {
        return res.status(400).json({ message: `A ${role} wallet already exists` });
      }
    }

    const existingAddress = await storage.getTreasuryWalletByAddress(address);
    if (existingAddress) {
      return res.status(400).json({ message: "This wallet address is already registered" });
    }

    const userId = req.user.claims.sub;
    const wallet = await storage.createTreasuryWallet({
      role,
      name,
      address,
      domainName,
      purpose,
      network: network || "devnet",
      sweepThreshold,
      sweepSchedule,
      sweepDestination,
      requiredSignatures: requiredSignatures || 2,
      authorizedSigners,
      createdBy: userId,
      status: "active",
      sweepEnabled: false,
    });

    res.json(wallet);
  } catch (error) {
    console.error("Error creating treasury wallet:", error);
    res.status(500).json({ message: "Failed to create treasury wallet" });
  }
});

adminRouter.patch(
  "/admin/treasury/wallets/:id",
  isAuthenticated,
  isAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const wallet = await storage.updateTreasuryWallet(id, updates);
      res.json(wallet);
    } catch (error) {
      console.error("Error updating treasury wallet:", error);
      res.status(500).json({ message: "Failed to update treasury wallet" });
    }
  }
);

adminRouter.delete(
  "/admin/treasury/wallets/:id",
  isAuthenticated,
  isAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTreasuryWallet(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting treasury wallet:", error);
      res.status(500).json({ message: "Failed to delete treasury wallet" });
    }
  }
);

adminRouter.get("/admin/compliance/logs", isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const logs = await storage.getComplianceLogs(limit, offset);
    res.json(logs);
  } catch (error) {
    console.error("Error fetching compliance logs:", error);
    res.status(500).json({ message: "Failed to fetch compliance logs" });
  }
});

adminRouter.get("/admin/compliance/triggers", isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const rules = await storage.getActiveTriggerRules();
    res.json(rules);
  } catch (error) {
    console.error("Error fetching trigger rules:", error);
    res.status(500).json({ message: "Failed to fetch trigger rules" });
  }
});

adminRouter.post("/admin/compliance/triggers", isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const rule = await storage.createTriggerRule(req.body);
    res.json(rule);
  } catch (error) {
    console.error("Error creating trigger rule:", error);
    res.status(500).json({ message: "Failed to create trigger rule" });
  }
});

adminRouter.patch(
  "/admin/compliance/triggers/:id",
  isAuthenticated,
  isAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const rule = await storage.updateTriggerRule(id, req.body);
      res.json(rule);
    } catch (error) {
      console.error("Error updating trigger rule:", error);
      res.status(500).json({ message: "Failed to update trigger rule" });
    }
  }
);

adminRouter.get("/admin/compliance/cases", isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const status = req.query.status as string | undefined;
    const cases = await storage.getComplianceCases(status);
    res.json(cases);
  } catch (error) {
    console.error("Error fetching compliance cases:", error);
    res.status(500).json({ message: "Failed to fetch compliance cases" });
  }
});

adminRouter.patch(
  "/admin/compliance/cases/:id",
  isAuthenticated,
  isAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const caseData = await storage.updateComplianceCase(id, req.body);
      res.json(caseData);
    } catch (error) {
      console.error("Error updating compliance case:", error);
      res.status(500).json({ message: "Failed to update compliance case" });
    }
  }
);

adminRouter.get("/admin/kyc/:userId", isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const status = await storage.getKycStatus(userId);
    res.json(status || { tier: "0", status: "not_started" });
  } catch (error) {
    console.error("Error fetching KYC status:", error);
    res.status(500).json({ message: "Failed to fetch KYC status" });
  }
});

adminRouter.patch("/admin/kyc/:userId", isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const status = await storage.createOrUpdateKycStatus(userId, req.body);
    res.json(status);
  } catch (error) {
    console.error("Error updating KYC status:", error);
    res.status(500).json({ message: "Failed to update KYC status" });
  }
});

adminRouter.post(
  "/admin/compliance/seed-triggers",
  isAuthenticated,
  isAdmin,
  async (req: any, res) => {
    try {
      const defaultRules = [
        {
          triggerCode: "VALUE_30DAY_2K",
          name: "30-Day Volume >= $2,000",
          description: "Rolling 30-day cumulative through escrow/installment contracts",
          category: "value",
          thresholdValue: "2000",
          thresholdPeriodDays: 30,
          requiredTier: "2",
          requiresDocuments: false,
          requiresManualReview: false,
          severity: "medium",
          isActive: true,
        },
        {
          triggerCode: "SINGLE_TX_10K",
          name: "Single Payment >= $10,000",
          description: "Any single payment at or above $10,000",
          category: "value",
          thresholdValue: "10000",
          requiredTier: "2",
          requiresDocuments: true,
          requiresManualReview: false,
          severity: "medium",
          isActive: true,
        },
        {
          triggerCode: "SINGLE_TX_25K",
          name: "Single Payment >= $25,000",
          description: "Any single payment at or above $25,000 requires manual review",
          category: "value",
          thresholdValue: "25000",
          requiredTier: "2",
          requiresDocuments: true,
          requiresManualReview: true,
          severity: "high",
          isActive: true,
        },
        {
          triggerCode: "VELOCITY_8_24H",
          name: "8+ Payments in 24h",
          description: "8 or more payments in 24 hours to same recipient",
          category: "velocity",
          thresholdCount: 8,
          thresholdPeriodDays: 1,
          requiredTier: "2",
          requiresDocuments: false,
          requiresManualReview: true,
          severity: "high",
          isActive: true,
        },
        {
          triggerCode: "VELOCITY_20_7D",
          name: "20+ Payments in 7 Days",
          description: "20 or more payments in 7 days to same recipient",
          category: "velocity",
          thresholdCount: 20,
          thresholdPeriodDays: 7,
          requiredTier: "2",
          requiresDocuments: false,
          requiresManualReview: true,
          severity: "high",
          isActive: true,
        },
        {
          triggerCode: "VELOCITY_5X_SPIKE",
          name: "5x Volume Spike",
          description: "7-day volume >= 5x prior 30-day average",
          category: "velocity",
          thresholdMultiplier: "5",
          thresholdPeriodDays: 7,
          requiredTier: "2",
          requiresDocuments: false,
          requiresManualReview: true,
          severity: "high",
          isActive: true,
        },
        {
          triggerCode: "PRICING_10X_MEDIAN",
          name: "Price 10x Median",
          description: "Price >= 10x creator median (90-180d) AND >= $2k",
          category: "pricing",
          thresholdValue: "2000",
          thresholdMultiplier: "10",
          requiredTier: "2",
          requiresDocuments: true,
          requiresManualReview: true,
          severity: "high",
          isActive: true,
        },
        {
          triggerCode: "NEW_CREATOR_25K",
          name: "New Creator High Volume",
          description: "New creator (<14 days) with first-week volume >= $25k",
          category: "pricing",
          thresholdValue: "25000",
          thresholdPeriodDays: 14,
          requiredTier: "2",
          requiresDocuments: true,
          requiresManualReview: true,
          severity: "high",
          isActive: true,
        },
        {
          triggerCode: "CONCENTRATION_60",
          name: "Top Payer 60% Concentration",
          description: "Top payer >= 60% of recipient 7-day volume",
          category: "concentration",
          thresholdPercentage: 60,
          thresholdPeriodDays: 7,
          requiredTier: "2",
          requiresDocuments: false,
          requiresManualReview: true,
          severity: "high",
          isActive: true,
        },
        {
          triggerCode: "CONCENTRATION_80_TOP3",
          name: "Top 3 Payers 80% Concentration",
          description: "Top 3 payers >= 80% of recipient 7-day volume",
          category: "concentration",
          thresholdPercentage: 80,
          thresholdPeriodDays: 7,
          requiredTier: "2",
          requiresDocuments: false,
          requiresManualReview: true,
          severity: "high",
          isActive: true,
        },
      ];

      const created = [];
      for (const rule of defaultRules) {
        const existing = await storage.getTriggerRuleByCode(rule.triggerCode);
        if (!existing) {
          const newRule = await storage.createTriggerRule(rule);
          created.push(newRule);
        }
      }

      res.json({
        message: `Created ${created.length} trigger rules`,
        created,
      });
    } catch (error) {
      console.error("Error seeding trigger rules:", error);
      res.status(500).json({ message: "Failed to seed trigger rules" });
    }
  }
);

adminRouter.get("/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const allUsers = await storage.getAllUsers();
    const search = ((req.query.search as string) || "").toLowerCase();
    const statusFilter = (req.query.status as string) || "all";

    let filtered = allUsers;

    if (search) {
      filtered = filtered.filter(
        (u) =>
          (u.email && u.email.toLowerCase().includes(search)) ||
          (u.firstName && u.firstName.toLowerCase().includes(search)) ||
          (u.lastName && u.lastName.toLowerCase().includes(search)) ||
          (u.walletName && u.walletName.toLowerCase().includes(search)) ||
          (u.id && u.id.toLowerCase().includes(search))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((u) => u.accountStatus === statusFilter);
    }

    const usersWithStats = await Promise.all(
      filtered.map(async (u) => {
        const userLogos = await storage.getLogosByUserId(u.id);
        const collections = await storage.getCollectionsByUserId(u.id);
        return {
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          profileImageUrl: u.profileImageUrl,
          accountStatus: u.accountStatus,
          isAdmin: u.isAdmin,
          walletName: u.walletName,
          solanaPublicKey: u.solanaPublicKey,
          ceremonyCompleted: u.ceremonyCompleted,
          subscriptionTier: u.subscriptionTier,
          subscriptionExpiresAt: u.subscriptionExpiresAt,
          sltrBalance: u.sltrBalance || "0",
          sltrTotalEarned: u.sltrTotalEarned || "0",
          referralCode: u.referralCode,
          referralCount: u.referralCount || 0,
          twitterHandle: u.twitterHandle,
          telegramHandle: u.telegramHandle,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          logoCount: userLogos.length,
          collectionCount: collections.length,
          mintedCount: collections.filter((c) => c.status === "minted").length,
        };
      })
    );

    res.json({
      users: usersWithStats,
      total: allUsers.length,
      filtered: usersWithStats.length,
    });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

adminRouter.get("/admin/users/:userId", isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userLogos = await storage.getLogosByUserId(user.id);
    const collections = await storage.getCollectionsByUserId(user.id);

    res.json({
      user: {
        ...user,
        solanaEncryptedPrivateKey: undefined,
        walletSalt: undefined,
        encryptedRecoveryPhrase: undefined,
      },
      logos: userLogos.map((l) => ({
        id: l.id,
        fileName: l.fileName,
        tokenName: l.tokenName,
        tokenTicker: l.tokenTicker,
        registrationType: l.registrationType,
        collectionId: l.collectionId,
        ipfsHash: l.ipfsHash,
        nftAddress: l.nftAddress,
        tickerVerified: l.tickerVerified,
        botVerificationStatus: l.botVerificationStatus,
        createdAt: l.createdAt,
      })),
      collections: collections.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        collectionAddress: c.collectionAddress,
        mintedAt: c.mintedAt,
        createdAt: c.createdAt,
      })),
      stats: {
        totalLogos: userLogos.length,
        mintedCollections: collections.filter((c) => c.status === "minted").length,
        totalCollections: collections.length,
      },
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Failed to fetch user details" });
  }
});

adminRouter.patch("/admin/users/:userId", isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const allowedUpdates: Record<string, any> = {};
    const {
      accountStatus,
      isAdmin: setAdmin,
      subscriptionTier,
      subscriptionExpiresAt,
    } = req.body;

    if (accountStatus && ["pending", "active", "expired", "suspended"].includes(accountStatus)) {
      allowedUpdates.accountStatus = accountStatus;
    }
    if (typeof setAdmin === "boolean") {
      allowedUpdates.isAdmin = setAdmin;
    }
    if (subscriptionTier && ["standard", "premium"].includes(subscriptionTier)) {
      allowedUpdates.subscriptionTier = subscriptionTier;
    }
    if (subscriptionExpiresAt) {
      allowedUpdates.subscriptionExpiresAt = new Date(subscriptionExpiresAt);
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({ message: "No valid updates provided" });
    }

    const updated = await storage.updateUser(userId, allowedUpdates);
    const { solanaEncryptedPrivateKey, walletSalt, encryptedRecoveryPhrase, ...safeUser } =
      updated as any;
    res.json({ message: "User updated", user: safeUser });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
});

adminRouter.get("/admin/payments", isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const db = pool;
    if (!db) {
      return res.status(500).json({ message: "Database not available" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "all";
    const tokenType = (req.query.tokenType as string) || "all";
    const paymentType = (req.query.paymentType as string) || "all";

    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (status !== "all") {
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (tokenType !== "all") {
      whereClause += ` AND p.token_type = $${paramIndex}`;
      params.push(tokenType);
      paramIndex++;
    }

    if (paymentType !== "all") {
      whereClause += ` AND p.payment_type = $${paramIndex}`;
      params.push(paymentType);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (p.transaction_signature ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR p.from_wallet ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM payments p LEFT JOIN users u ON p.user_id = u.id ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await db.query(
      `SELECT p.*, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      payments: result.rows.map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        collectionId: p.collection_id,
        logoId: p.logo_id,
        transactionSignature: p.transaction_signature,
        fromWallet: p.from_wallet,
        toWallet: p.to_wallet,
        amount: p.amount,
        tokenType: p.token_type,
        status: p.status,
        paymentType: p.payment_type,
        logoCount: p.logo_count,
        pricingTier: p.pricing_tier,
        rentalMonths: p.rental_months,
        blockNumber: p.block_number,
        confirmedAt: p.confirmed_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        userEmail: p.user_email,
        userFirstName: p.user_first_name,
        userLastName: p.user_last_name,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin payments error:", error);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
});

adminRouter.get("/admin/payments/stats", isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const db = pool;
    if (!db) {
      return res.status(500).json({ message: "Database not available" });
    }

    const statsResult = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        SUM(CASE WHEN status = 'confirmed' THEN CAST(amount AS DECIMAL) ELSE 0 END) as total_confirmed_amount
      FROM payments
    `);

    const tokenBreakdownResult = await db.query(`
      SELECT token_type, COUNT(*) as count, SUM(CASE WHEN status = 'confirmed' THEN CAST(amount AS DECIMAL) ELSE 0 END) as total_amount
      FROM payments
      GROUP BY token_type
      ORDER BY count DESC
    `);

    const paymentTypeBreakdownResult = await db.query(`
      SELECT payment_type, COUNT(*) as count
      FROM payments
      GROUP BY payment_type
      ORDER BY count DESC
    `);

    const recentResult = await db.query(`
      SELECT p.*, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    const stats = statsResult.rows[0];
    res.json({
      overview: {
        total: parseInt(stats.total),
        confirmed: parseInt(stats.confirmed),
        pending: parseInt(stats.pending),
        failed: parseInt(stats.failed),
        totalConfirmedAmount: parseFloat(stats.total_confirmed_amount || "0").toFixed(6),
      },
      tokenBreakdown: tokenBreakdownResult.rows.map((r: any) => ({
        tokenType: r.token_type,
        count: parseInt(r.count),
        totalAmount: parseFloat(r.total_amount || "0").toFixed(6),
      })),
      paymentTypeBreakdown: paymentTypeBreakdownResult.rows.map((r: any) => ({
        paymentType: r.payment_type,
        count: parseInt(r.count),
      })),
      recentPayments: recentResult.rows.map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        amount: p.amount,
        tokenType: p.token_type,
        status: p.status,
        paymentType: p.payment_type,
        logoCount: p.logo_count,
        pricingTier: p.pricing_tier,
        rentalMonths: p.rental_months,
        blockNumber: p.block_number,
        confirmedAt: p.confirmed_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        userEmail: p.user_email,
        userFirstName: p.user_first_name,
        userLastName: p.user_last_name,
      })),
    });
  } catch (error) {
    console.error("Admin payments stats error:", error);
    res.status(500).json({ message: "Failed to fetch payment stats" });
  }
});

adminRouter.get(
  "/admin/payments/:paymentId",
  isAuthenticated,
  isAdmin,
  async (req: any, res) => {
    try {
      const db = pool;
      if (!db) {
        return res.status(500).json({ message: "Database not available" });
      }

      const { paymentId } = req.params;

      const result = await db.query(
        `SELECT p.*, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name
         FROM payments p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = $1`,
        [paymentId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Payment not found" });
      }

      const p = result.rows[0];
      res.json({
        payment: {
          id: p.id,
          userId: p.user_id,
          collectionId: p.collection_id,
          logoId: p.logo_id,
          transactionSignature: p.transaction_signature,
          fromWallet: p.from_wallet,
          toWallet: p.to_wallet,
          amount: p.amount,
          tokenType: p.token_type,
          status: p.status,
          paymentType: p.payment_type,
          logoCount: p.logo_count,
          pricingTier: p.pricing_tier,
          rentalMonths: p.rental_months,
          blockNumber: p.block_number,
          confirmedAt: p.confirmed_at,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          userEmail: p.user_email,
          userFirstName: p.user_first_name,
          userLastName: p.user_last_name,
        },
        user: p.user_id
          ? {
              id: p.user_id,
              email: p.user_email,
              firstName: p.user_first_name,
              lastName: p.user_last_name,
            }
          : null,
      });
    } catch (error) {
      console.error("Admin payment detail error:", error);
      res.status(500).json({ message: "Failed to fetch payment details" });
    }
  }
);

adminRouter.get("/admin/reports", isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const db = pool;
    if (!db) {
      return res.status(500).json({ message: "Database not available" });
    }

    const result = await db.query(
      `SELECT r.*,
              l.file_name as logo_file_name, l.file_hash as logo_file_hash, 
              l.token_ticker as logo_token_ticker, l.ipfs_hash as logo_ipfs_hash,
              l.ipfs_metadata_hash as logo_ipfs_metadata_hash,
              u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name
       FROM copycat_reports r
       LEFT JOIN logos l ON r.logo_id = l.id
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC`
    );

    const reports = result.rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      logoId: r.logo_id,
      reportType: r.report_type,
      copycatContractAddress: r.copycat_contract_address,
      copycatTicker: r.copycat_ticker,
      copycatName: r.copycat_name,
      copycatTwitter: r.copycat_twitter,
      copycatTelegram: r.copycat_telegram,
      copycatWebsite: r.copycat_website,
      copycatDiscord: r.copycat_discord,
      foundOnPlatform: r.found_on_platform,
      foundOnUrl: r.found_on_url,
      screenshotUrl: r.screenshot_url,
      evidenceDescription: r.evidence_description,
      evidenceUrl: r.evidence_url,
      similarityScore: r.similarity_score,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      logo: r.logo_id
        ? {
            id: r.logo_id,
            fileName: r.logo_file_name,
            fileHash: r.logo_file_hash,
            tokenTicker: r.logo_token_ticker,
            ipfsHash: r.logo_ipfs_hash,
            ipfsMetadataHash: r.logo_ipfs_metadata_hash,
          }
        : null,
      user: r.user_id
        ? {
            id: r.user_id,
            email: r.user_email,
            firstName: r.user_first_name,
            lastName: r.user_last_name,
          }
        : null,
    }));

    res.json(reports);
  } catch (error) {
    console.error("Admin reports error:", error);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

adminRouter.patch(
  "/admin/reports/:reportId/status",
  isAuthenticated,
  isAdmin,
  async (req: any, res) => {
    try {
      const db = pool;
      if (!db) {
        return res.status(500).json({ message: "Database not available" });
      }

      const { reportId } = req.params;
      const { status } = req.body;

      if (!status || !["pending", "submitted", "resolved", "rejected"].includes(status)) {
        return res.status(400).json({
          message: "Invalid status. Must be: pending, submitted, resolved, or rejected",
        });
      }

      const result = await db.query(
        `UPDATE copycat_reports SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, reportId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Report not found" });
      }

      res.json({ message: "Status updated", report: result.rows[0] });
    } catch (error) {
      console.error("Admin report status update error:", error);
      res.status(500).json({ message: "Failed to update report status" });
    }
  }
);
