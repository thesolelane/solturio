/**
 * Token Registry API Routes
 * Three-tier token system: Primary, Whitelisted, Community
 * REGULATORY: Platform controls accepted payment methods
 */

import { Router } from "express";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { isAdminEmail } from "@shared/pricing";
import { getTokenPrice, getAllCachedPrices } from "./price-oracle";
import { z } from "zod";

export const tokensRouter = Router();

/**
 * GET /tokens/accepted
 * Get all active accepted tokens
 */
tokensRouter.get("/tokens/accepted", async (req, res) => {
  try {
    const db = (storage as any).$client;
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    const result = await db.query(
      `SELECT symbol, name, mint_address, decimals, logo_url, tier, 
              allowed_for_access, allowed_for_licensing, is_active, 
              last_price_usd, last_price_updated_at
       FROM accepted_tokens 
       WHERE is_active = true
       ORDER BY 
         CASE tier 
           WHEN 'primary' THEN 1 
           WHEN 'whitelisted' THEN 2 
           WHEN 'community' THEN 3 
         END, symbol`
    );

    res.json({
      success: true,
      tokens: result.rows.map((t: any) => ({
        symbol: t.symbol,
        name: t.name,
        mintAddress: t.mint_address,
        decimals: t.decimals,
        logoUrl: t.logo_url,
        tier: t.tier,
        allowedForAccess: t.allowed_for_access,
        allowedForLicensing: t.allowed_for_licensing,
        lastPriceUsd: t.last_price_usd,
      })),
    });
  } catch (error: any) {
    console.error("Get tokens error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /tokens/for-access
 * Get tokens that can be used for platform access payment
 */
tokensRouter.get("/tokens/for-access", async (req, res) => {
  try {
    const db = (storage as any).$client;
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    const result = await db.query(
      `SELECT symbol, name, mint_address, decimals, logo_url, tier, last_price_usd
       FROM accepted_tokens 
       WHERE is_active = true AND allowed_for_access = true
       ORDER BY 
         CASE tier WHEN 'primary' THEN 1 WHEN 'whitelisted' THEN 2 ELSE 3 END`
    );

    res.json({
      success: true,
      tokens: result.rows.map((t: any) => ({
        symbol: t.symbol,
        name: t.name,
        mintAddress: t.mint_address,
        decimals: t.decimals,
        logoUrl: t.logo_url,
        tier: t.tier,
        lastPriceUsd: t.last_price_usd,
      })),
    });
  } catch (error: any) {
    console.error("Get access tokens error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /tokens/for-licensing
 * Get tokens that can be used for license SC payments
 */
tokensRouter.get("/tokens/for-licensing", async (req, res) => {
  try {
    const db = (storage as any).$client;
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    const result = await db.query(
      `SELECT symbol, name, mint_address, decimals, logo_url, tier, last_price_usd
       FROM accepted_tokens 
       WHERE is_active = true AND allowed_for_licensing = true
       ORDER BY 
         CASE tier WHEN 'primary' THEN 1 WHEN 'whitelisted' THEN 2 ELSE 3 END`
    );

    res.json({
      success: true,
      tokens: result.rows.map((t: any) => ({
        symbol: t.symbol,
        name: t.name,
        mintAddress: t.mint_address,
        decimals: t.decimals,
        logoUrl: t.logo_url,
        tier: t.tier,
        lastPriceUsd: t.last_price_usd,
      })),
    });
  } catch (error: any) {
    console.error("Get licensing tokens error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /tokens/price/:symbol
 * Get current price for a token
 */
tokensRouter.get("/tokens/price/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const price = await getTokenPrice(symbol.toUpperCase());

    if (!price) {
      return res
        .status(404)
        .json({ success: false, error: "Token not found or price unavailable" });
    }

    res.json({
      success: true,
      ...price,
    });
  } catch (error: any) {
    console.error("Get price error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /tokens/applications
 * Submit application for community token acceptance
 */
tokensRouter.post("/tokens/applications", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const schema = z.object({
      symbol: z.string().min(2).max(10).toUpperCase(),
      name: z.string().min(2).max(100),
      mintAddress: z.string().length(44), // Solana address length
      decimals: z.number().int().min(0).max(18).default(9),
      logoUrl: z.string().url().optional(),
      website: z.string().url().optional(),
      twitter: z.string().optional(),
      telegram: z.string().optional(),
      discord: z.string().optional(),
      tokenAgeMonths: z.number().int().min(0),
      dailyVolume: z.string().optional(),
      holderCount: z.number().int().min(0).optional(),
      notes: z.string().max(1000).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: parsed.error.issues,
      });
    }

    const data = parsed.data;

    // Check if token age is at least 6 months
    if (data.tokenAgeMonths < 6) {
      return res.status(400).json({
        success: false,
        error: "Token must be at least 6 months old to apply for acceptance",
      });
    }

    const db = (storage as any).$client;

    // Check for existing application
    const existing = await db.query(
      `SELECT id, status FROM token_applications WHERE mint_address = $1`,
      [data.mintAddress]
    );

    if (existing.rows.length > 0) {
      const app = existing.rows[0];
      return res.status(400).json({
        success: false,
        error: `Application already exists with status: ${app.status}`,
        applicationId: app.id,
      });
    }

    // Create application
    const result = await db.query(
      `INSERT INTO token_applications 
       (symbol, name, mint_address, decimals, logo_url, website, twitter, telegram, discord,
        token_age_months, daily_volume, holder_count, applicant_user_id, applicant_email, applicant_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id`,
      [
        data.symbol,
        data.name,
        data.mintAddress,
        data.decimals,
        data.logoUrl,
        data.website,
        data.twitter,
        data.telegram,
        data.discord,
        data.tokenAgeMonths,
        data.dailyVolume,
        data.holderCount,
        userId,
        user.email,
        data.notes,
      ]
    );

    res.status(201).json({
      success: true,
      applicationId: result.rows[0].id,
      message:
        "Application submitted successfully! Our team will review it within 3-5 business days.",
    });
  } catch (error: any) {
    console.error("Submit application error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /tokens/applications (Admin only)
 * Get all token applications
 */
tokensRouter.get("/tokens/applications", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const user = await storage.getUser(userId);

    if (!isAdminEmail(user?.email)) {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }

    const db = (storage as any).$client;
    const status = req.query.status || "pending";

    const result = await db.query(
      `SELECT * FROM token_applications 
       WHERE status = $1
       ORDER BY created_at DESC`,
      [status]
    );

    res.json({
      success: true,
      applications: result.rows,
      count: result.rows.length,
    });
  } catch (error: any) {
    console.error("Get applications error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /tokens/applications/:id/review (Admin only)
 * Review token application
 */
tokensRouter.post("/tokens/applications/:id/review", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const user = await storage.getUser(userId);

    if (!isAdminEmail(user?.email)) {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }

    const { id } = req.params;

    const schema = z.object({
      decision: z.enum(["approved", "rejected"]),
      reviewNotes: z.string().optional(),
      rejectionReason: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Invalid request" });
    }

    const { decision, reviewNotes, rejectionReason } = parsed.data;
    const db = (storage as any).$client;

    // Get application
    const appResult = await db.query(`SELECT * FROM token_applications WHERE id = $1`, [id]);

    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Application not found" });
    }

    const app = appResult.rows[0];

    // Update application
    await db.query(
      `UPDATE token_applications SET 
         status = $1, reviewed_by = $2, reviewed_at = NOW(),
         review_notes = $3, rejection_reason = $4
       WHERE id = $5`,
      [decision, userId, reviewNotes, rejectionReason, id]
    );

    // If approved, add to accepted tokens
    if (decision === "approved") {
      await db.query(
        `INSERT INTO accepted_tokens 
         (symbol, name, mint_address, decimals, logo_url, tier, 
          community_website, community_twitter, community_telegram, community_discord,
          is_active, activated_at)
         VALUES ($1, $2, $3, $4, $5, 'community', $6, $7, $8, $9, true, NOW())
         ON CONFLICT (symbol) DO NOTHING`,
        [
          app.symbol,
          app.name,
          app.mint_address,
          app.decimals,
          app.logo_url,
          app.website,
          app.twitter,
          app.telegram,
          app.discord,
        ]
      );
    }

    res.json({
      success: true,
      message: `Application ${decision}`,
    });
  } catch (error: any) {
    console.error("Review application error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /tokens/:symbol/toggle (Admin only)
 * Toggle token active status
 */
tokensRouter.patch("/tokens/:symbol/toggle", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const user = await storage.getUser(userId);

    if (!isAdminEmail(user?.email)) {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }

    const { symbol } = req.params;
    const db = (storage as any).$client;

    const result = await db.query(
      `UPDATE accepted_tokens SET 
         is_active = NOT is_active,
         updated_at = NOW()
       WHERE symbol = $1
       RETURNING symbol, is_active`,
      [symbol.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Token not found" });
    }

    res.json({
      success: true,
      symbol: result.rows[0].symbol,
      isActive: result.rows[0].is_active,
    });
  } catch (error: any) {
    console.error("Toggle token error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============== ADMIN ROUTES ==============

/**
 * GET /admin/tokens (Admin only)
 * Get all tokens including inactive ones
 */
tokensRouter.get("/admin/tokens", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const user = await storage.getUser(userId);

    if (!isAdminEmail(user?.email)) {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }

    const db = (storage as any).$client;
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    const result = await db.query(
      `SELECT id, symbol, name, mint_address, decimals, logo_url, tier, 
              is_active, added_at, added_by, notes
       FROM accepted_tokens 
       ORDER BY 
         CASE tier 
           WHEN 'primary' THEN 1 
           WHEN 'whitelisted' THEN 2 
           WHEN 'community' THEN 3 
         END, symbol`
    );

    res.json(
      result.rows.map((t: any) => ({
        id: t.id,
        symbol: t.symbol,
        name: t.name,
        mintAddress: t.mint_address,
        decimals: t.decimals,
        logoUrl: t.logo_url,
        tier: t.tier,
        isActive: t.is_active,
        addedAt: t.added_at,
        addedBy: t.added_by,
        notes: t.notes,
      }))
    );
  } catch (error: any) {
    console.error("Admin get tokens error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /admin/tokens (Admin only)
 * Add a new token to the registry
 */
tokensRouter.post("/admin/tokens", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const user = await storage.getUser(userId);

    if (!isAdminEmail(user?.email)) {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }

    const { symbol, name, mintAddress, tier, decimals, logoUrl, notes } = req.body;

    if (!symbol || !name || !mintAddress) {
      return res
        .status(400)
        .json({ success: false, error: "Symbol, name, and mintAddress are required" });
    }

    const db = (storage as any).$client;

    const result = await db.query(
      `INSERT INTO accepted_tokens 
       (symbol, name, mint_address, decimals, logo_url, tier, is_active, added_by, notes, added_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, NOW())
       ON CONFLICT (symbol) DO UPDATE SET
         name = EXCLUDED.name,
         mint_address = EXCLUDED.mint_address,
         decimals = EXCLUDED.decimals,
         logo_url = EXCLUDED.logo_url,
         tier = EXCLUDED.tier,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING id, symbol`,
      [
        symbol.toUpperCase(),
        name,
        mintAddress,
        decimals || 9,
        logoUrl,
        tier || "whitelisted",
        userId,
        notes,
      ]
    );

    res.json({
      success: true,
      token: result.rows[0],
    });
  } catch (error: any) {
    console.error("Admin add token error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /admin/tokens/:tokenId/toggle (Admin only)
 * Toggle token by ID
 */
tokensRouter.post("/admin/tokens/:tokenId/toggle", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const user = await storage.getUser(userId);

    if (!isAdminEmail(user?.email)) {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }

    const { tokenId } = req.params;
    const { isActive } = req.body;
    const db = (storage as any).$client;

    const result = await db.query(
      `UPDATE accepted_tokens SET 
         is_active = $1,
         updated_at = NOW()
       WHERE id = $2
       RETURNING id, symbol, is_active`,
      [isActive, tokenId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Token not found" });
    }

    res.json({
      success: true,
      token: result.rows[0],
    });
  } catch (error: any) {
    console.error("Admin toggle token error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /admin/tokens/applications (Admin only)
 * Get all token applications
 */
tokensRouter.get("/admin/tokens/applications", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const user = await storage.getUser(userId);

    if (!isAdminEmail(user?.email)) {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }

    const db = (storage as any).$client;
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not available" });
    }

    const result = await db.query(
      `SELECT ta.id, ta.symbol as token_symbol, ta.name as token_name, ta.mint_address,
              ta.applicant_user_id, ta.reason, ta.website as project_url, ta.status,
              ta.reviewed_by, ta.review_notes, ta.submitted_at, ta.reviewed_at,
              u.email as applicant_email
       FROM token_applications ta
       LEFT JOIN users u ON u.id = ta.applicant_user_id
       ORDER BY 
         CASE ta.status WHEN 'pending' THEN 1 ELSE 2 END,
         ta.submitted_at DESC`
    );

    res.json(
      result.rows.map((a: any) => ({
        id: a.id,
        tokenSymbol: a.token_symbol,
        tokenName: a.token_name,
        mintAddress: a.mint_address,
        applicantUserId: a.applicant_user_id,
        applicantEmail: a.applicant_email,
        reason: a.reason,
        projectUrl: a.project_url,
        status: a.status,
        reviewedBy: a.reviewed_by,
        reviewNotes: a.review_notes,
        submittedAt: a.submitted_at,
        reviewedAt: a.reviewed_at,
      }))
    );
  } catch (error: any) {
    console.error("Admin get applications error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /admin/tokens/applications/:applicationId/review (Admin only)
 * Review a token application
 */
tokensRouter.post(
  "/admin/tokens/applications/:applicationId/review",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (!isAdminEmail(user?.email)) {
        return res.status(403).json({ success: false, error: "Admin access required" });
      }

      const { applicationId } = req.params;
      const { decision, notes } = req.body;

      if (!["approved", "rejected"].includes(decision)) {
        return res
          .status(400)
          .json({ success: false, error: "Decision must be approved or rejected" });
      }

      const db = (storage as any).$client;

      // Get application details
      const appResult = await db.query(`SELECT * FROM token_applications WHERE id = $1`, [
        applicationId,
      ]);

      if (appResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Application not found" });
      }

      const app = appResult.rows[0];

      // Update application status
      await db.query(
        `UPDATE token_applications SET 
         status = $1, reviewed_by = $2, reviewed_at = NOW(), review_notes = $3
       WHERE id = $4`,
        [decision, userId, notes, applicationId]
      );

      // If approved, add token to registry
      if (decision === "approved") {
        await db.query(
          `INSERT INTO accepted_tokens 
         (symbol, name, mint_address, decimals, logo_url, tier, is_active, added_at)
         VALUES ($1, $2, $3, $4, $5, 'community', true, NOW())
         ON CONFLICT (symbol) DO NOTHING`,
          [app.symbol, app.name, app.mint_address, app.decimals || 9, app.logo_url]
        );
      }

      res.json({
        success: true,
        message: `Application ${decision}`,
      });
    } catch (error: any) {
      console.error("Admin review application error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /admin/tokens/seed (Admin only)
 * Seed default tokens
 */
tokensRouter.post("/admin/tokens/seed", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const user = await storage.getUser(userId);

    if (!isAdminEmail(user?.email)) {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }

    const db = (storage as any).$client;

    // Seed default tokens
    const defaultTokens = [
      {
        symbol: "CATH",
        name: "CATH Token",
        mintAddress: "CATHYjt15smqH9JuHGpdxEWaWvTM4mBWqsHSZivhpump",
        tier: "primary",
        decimals: 9,
      },
      {
        symbol: "SOL",
        name: "Solana",
        mintAddress: "So11111111111111111111111111111111111111112",
        tier: "primary",
        decimals: 9,
      },
      {
        symbol: "BONK",
        name: "Bonk",
        mintAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        tier: "whitelisted",
        decimals: 5,
      },
      {
        symbol: "SOLT",
        name: "Solturio Rewards",
        mintAddress: "SOLT_PLACEHOLDER_MINT_ADDRESS",
        tier: "primary",
        decimals: 9,
      },
    ];

    for (const token of defaultTokens) {
      await db.query(
        `INSERT INTO accepted_tokens 
         (symbol, name, mint_address, decimals, tier, is_active, added_at, allowed_for_access, allowed_for_licensing)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), $6, $7)
         ON CONFLICT (symbol) DO UPDATE SET
           name = EXCLUDED.name,
           mint_address = EXCLUDED.mint_address,
           decimals = EXCLUDED.decimals,
           tier = EXCLUDED.tier,
           updated_at = NOW()`,
        [
          token.symbol,
          token.name,
          token.mintAddress,
          token.decimals,
          token.tier,
          token.tier === "primary",
          token.symbol === "SOL",
        ]
      );
    }

    res.json({
      success: true,
      message: "Default tokens seeded",
    });
  } catch (error: any) {
    console.error("Seed tokens error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /admin/rewards/pool (Admin only)
 * Get rewards pool statistics
 */
tokensRouter.get("/admin/rewards/pool", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const user = await storage.getUser(userId);

    if (!isAdminEmail(user?.email)) {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }

    const db = (storage as any).$client;
    const TOTAL_POOL = 50_000_000; // 50M $SOLT

    // Get total distributed from rewards log
    const result = await db.query(
      `SELECT COALESCE(SUM(CAST(final_amount AS NUMERIC)), 0) as total_distributed
       FROM rewards_log`
    );

    const distributed = parseFloat(result.rows[0]?.total_distributed || "0");
    const remaining = TOTAL_POOL - distributed;
    const percentUsed = (distributed / TOTAL_POOL) * 100;

    res.json({
      totalPool: TOTAL_POOL,
      distributed: Math.round(distributed),
      remaining: Math.round(remaining),
      percentUsed: Math.round(percentUsed * 100) / 100,
    });
  } catch (error: any) {
    console.error("Get rewards pool error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
