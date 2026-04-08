/**
 * License Smart Contract API Routes
 * Handles creation, signing, and management of IP licenses
 */

import { Router } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { requireActiveSubscription } from "./subscription-routes";
import {
  insertLicenseContractSchema,
  LICENSE_TEMPLATES,
  JURISDICTION_TEMPLATES,
  LICENSE_TYPE_DESCRIPTIONS,
  PLATFORM_BITS,
  getPermittedPlatforms,
  createPlatformBitmap,
  type JurisdictionCode,
} from "@shared/schema";
import { LICENSE_FEE } from "@shared/pricing";
import { z } from "zod";

export const licenseRouter = Router();

/**
 * GET /api/licenses
 * Get all licenses for the authenticated user (as licensor OR licensee)
 */
licenseRouter.get("/", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user's wallet addresses to find licensee licenses
    const user = await storage.getUser(userId);

    // Collect all possible wallet identifiers for the user
    const userWallets: string[] = [];
    if (user?.walletAddress) userWallets.push(user.walletAddress);
    if (user?.solanaPublicKey) userWallets.push(user.solanaPublicKey);

    // Get licenses as licensor
    const licensorLicenses = await storage.getLicenseContractsByLicensor(userId);

    // Get licenses as licensee (by all wallet addresses)
    const licenseeLicenses: any[] = [];
    for (const wallet of userWallets) {
      const licenses = await storage.getLicenseContractsByLicensee(wallet);
      licenseeLicenses.push(...licenses);
    }

    // Combine and deduplicate (in case same license appears in both)
    const licenseMap = new Map();

    for (const license of licensorLicenses) {
      licenseMap.set(license.id, { ...license, userRole: "licensor" });
    }

    for (const license of licenseeLicenses) {
      if (!licenseMap.has(license.id)) {
        licenseMap.set(license.id, { ...license, userRole: "licensee" });
      }
    }

    const allLicenses = Array.from(licenseMap.values());

    // Enrich with logo info
    const enrichedLicenses = await Promise.all(
      allLicenses.map(async (license) => {
        const logo = await storage.getLogoById(license.logoId ?? "");
        return {
          ...license,
          logo: logo
            ? {
                id: logo.id,
                fileName: logo.fileName,
                thumbnailUrl: logo.thumbnailUrl,
                tokenName: logo.tokenName,
              }
            : null,
          permittedPlatformsList: getPermittedPlatforms(license.platformBitmap),
        };
      })
    );

    // Sort by creation date
    enrichedLicenses.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    res.json(enrichedLicenses);
  } catch (error: any) {
    console.error("Get licenses error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/licenses/templates
 * Get available license templates
 */
licenseRouter.get("/templates", (req, res) => {
  const templates = Object.entries(LICENSE_TEMPLATES).map(([key, template]) => ({
    id: key,
    ...template,
    permittedPlatformsList: getPermittedPlatforms(template.platformBitmap),
  }));

  res.json({
    templates,
    platformOptions: Object.keys(PLATFORM_BITS),
    fee: LICENSE_FEE,
  });
});

/**
 * GET /api/licenses/jurisdictions
 * Get available jurisdiction templates with requirements
 */
licenseRouter.get("/jurisdictions", (req, res) => {
  const jurisdictions = Object.entries(JURISDICTION_TEMPLATES).map(([code, template]) => ({
    code,
    name: template.name,
    version: template.version,
    governingLaw: template.governingLaw,
    disputeVenue: template.disputeVenue,
    requirements: template.requirements,
    clauses: template.clauses,
  }));

  res.json({
    jurisdictions,
    licenseTypeDescriptions: LICENSE_TYPE_DESCRIPTIONS,
  });
});

/**
 * GET /api/licenses/by-logo/:logoId
 * Get all licenses for a specific logo
 */
licenseRouter.get("/by-logo/:logoId", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const { logoId } = req.params;

    // Verify logo ownership
    const logo = await storage.getLogoById(logoId);
    if (!logo || logo.userId !== userId) {
      return res.status(403).json({ error: "Not authorized to view licenses for this logo" });
    }

    const licenses = await storage.getLicenseContractsByLogo(logoId);
    res.json(licenses);
  } catch (error: any) {
    console.error("Get licenses by logo error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/licenses/search-transaction
 * Search user's licenses by transaction hash or wallet address
 */
licenseRouter.get("/search-transaction", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const { q } = req.query;

    if (!q || typeof q !== "string" || q.length < 10) {
      return res.status(400).json({
        error: "Search query must be at least 10 characters (transaction hash or wallet address)",
      });
    }

    const results = await storage.searchLicensesByTransaction(q, userId);

    const enriched = await Promise.all(
      results.map(async (license) => {
        const logo = await storage.getLogoById(license.logoId ?? "");
        return {
          ...license,
          logo: logo
            ? {
                id: logo.id,
                fileName: logo.fileName,
                thumbnailUrl: logo.thumbnailUrl,
                tokenName: logo.tokenName,
              }
            : null,
        };
      })
    );

    res.json(enriched);
  } catch (error: any) {
    console.error("Search transaction error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/licenses/:id
 * Get a specific license by ID
 */
licenseRouter.get("/:id", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const { id } = req.params;

    const license = await storage.getLicenseContract(id);
    if (!license) {
      return res.status(404).json({ error: "License not found" });
    }

    // Check authorization (licensor or licensee)
    const user = await storage.getUser(userId);
    const isLicensor = license.licensorUserId === userId;
    const isLicensee =
      user?.walletAddress === license.licenseeWallet ||
      user?.solanaPublicKey === license.licenseeWallet;

    if (!isLicensor && !isLicensee) {
      return res.status(403).json({ error: "Not authorized to view this license" });
    }

    const logo = await storage.getLogoById(license.logoId ?? "");

    res.json({
      ...license,
      logo: logo
        ? {
            id: logo.id,
            fileName: logo.fileName,
            thumbnailUrl: logo.thumbnailUrl,
            tokenName: logo.tokenName,
            imageUrl: logo.imageUrl,
          }
        : null,
      permittedPlatformsList: getPermittedPlatforms(license.platformBitmap),
    });
  } catch (error: any) {
    console.error("Get license error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/licenses
 * Create a new license contract (requires active subscription)
 */
licenseRouter.post("/", isAuthenticated, requireActiveSubscription, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Validate request body
    const validationResult = insertLicenseContractSchema.safeParse({
      ...req.body,
      licensorUserId: userId,
      licensorWallet: user.solanaPublicKey || user.walletAddress,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.errors,
      });
    }

    const data = validationResult.data;

    // Verify logo ownership
    const logo = await storage.getLogoById(data.logoId ?? "");
    if (!logo || logo.userId !== userId) {
      return res.status(403).json({ error: "You do not own this logo" });
    }

    // Check if this is an exclusive license and logo already has active exclusive license
    if (data.licenseType === "exclusive" || data.licenseType === "full_transfer") {
      const existingLicenses = await storage.getLicenseContractsByLogo(data.logoId ?? "");
      const hasActiveExclusive = existingLicenses.some(
        (l) =>
          (l.licenseType === "exclusive" || l.licenseType === "full_transfer") &&
          l.status === "active" &&
          (!l.expiresAt || new Date(l.expiresAt) > new Date())
      );
      if (hasActiveExclusive) {
        return res.status(400).json({
          error:
            "This logo already has an active exclusive license. Cannot create another exclusive license.",
        });
      }
    }

    // Calculate expiry if not perpetual
    let expiresAt = null;
    const startsAt = new Date();
    if (!data.isPerpetual && data.durationDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.durationDays);
    }

    // Get jurisdiction template details
    const jurisdictionCode = (data.jurisdictionCode || "US") as JurisdictionCode;
    const jurisdictionTemplate =
      JURISDICTION_TEMPLATES[jurisdictionCode] || JURISDICTION_TEMPLATES.US;

    // Get license type description
    const licenseTypeDescription =
      LICENSE_TYPE_DESCRIPTIONS[data.licenseType as keyof typeof LICENSE_TYPE_DESCRIPTIONS] || "";

    // Prepare image metadata from logo
    const imageColorPalette = logo.colorPalette || [];
    const imageDominantColor = imageColorPalette[0] || null;
    const imageCreatedAt = logo.createdAt;

    // Create the license with enriched metadata
    const license = await storage.createLicenseContract({
      ...data,
      startsAt,
      expiresAt,
      creationFee: LICENSE_FEE.amount,
      // Image metadata
      imageColorPalette: imageColorPalette.length > 0 ? imageColorPalette : null,
      imageDominantColor,
      imageCreatedAt,
      licenseIssuedAt: new Date(),
      licenseTypeDescription,
      // Current holder (initially the licensee)
      currentHolderName: data.licenseeName || null,
      currentHolderWallet: data.licenseeWallet,
      currentHolderEmail: data.licenseeEmail || null,
      // Jurisdiction details
      jurisdictionCode,
      jurisdictionVersion: jurisdictionTemplate.version,
      governingLaw: jurisdictionTemplate.governingLaw,
      disputeVenue: jurisdictionTemplate.disputeVenue,
      gdprCompliant: jurisdictionTemplate.requirements.gdprCompliant,
      gdprDataProcessingAgreed:
        (jurisdictionTemplate.requirements as any).gdprDataProcessingAgreed || false,
      gdprWithdrawalRightsAcknowledged:
        (jurisdictionTemplate.requirements as any).gdprWithdrawalRightsAcknowledged || false,
      pipedaCompliant: jurisdictionTemplate.requirements.pipedaCompliant,
      pdpaCompliant: jurisdictionTemplate.requirements.pdpaCompliant,
      appiCompliant: jurisdictionTemplate.requirements.appiCompliant,
      moralRightsWaived: jurisdictionTemplate.requirements.moralRightsWaived,
      bilingualRequired: jurisdictionTemplate.requirements.bilingualRequired,
      regionalClauses: jurisdictionTemplate.clauses,
    } as any);

    res.status(201).json({
      success: true,
      license,
      message: "License draft created. Share with licensee for signature.",
    });
  } catch (error: any) {
    console.error("Create license error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/licenses/:id/link-transaction
 * Link a P2P transaction to an existing ISCL (optional - user-recorded)
 */
licenseRouter.patch("/:id/link-transaction", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const { id } = req.params;
    const { senderWallet, receiverWallet, transactionHash, amount, currency, note } = req.body;

    if (!transactionHash || typeof transactionHash !== "string") {
      return res.status(400).json({ error: "Transaction hash is required" });
    }

    if (transactionHash.length < 32 || transactionHash.length > 128) {
      return res.status(400).json({ error: "Invalid transaction hash format" });
    }

    if (!senderWallet || !receiverWallet) {
      return res
        .status(400)
        .json({ error: "Both sender and receiver wallet addresses are required" });
    }

    if (
      senderWallet.length < 32 ||
      senderWallet.length > 44 ||
      receiverWallet.length < 32 ||
      receiverWallet.length > 44
    ) {
      return res.status(400).json({ error: "Invalid Solana wallet address format" });
    }

    const license = await storage.getLicenseContract(id);
    if (!license) {
      return res.status(404).json({ error: "License not found" });
    }

    const user = await storage.getUser(userId);
    const isLicensor = license.licensorUserId === userId;
    const isLicensee =
      user?.walletAddress === license.licenseeWallet ||
      user?.solanaPublicKey === license.licenseeWallet;

    if (!isLicensor && !isLicensee) {
      return res
        .status(403)
        .json({ error: "Only the licensor or licensee can link a transaction" });
    }

    const updated = await storage.updateLicenseContract(id, {
      p2pSenderWallet: senderWallet,
      p2pReceiverWallet: receiverWallet,
      p2pTransactionHash: transactionHash,
      p2pTransactionAmount: amount || null,
      p2pTransactionCurrency: currency || null,
      p2pTransactionNote: note || null,
      p2pTransactionLinkedAt: new Date(),
    } as any);

    res.json({
      success: true,
      license: updated,
      message: "Transaction linked to license successfully.",
    });
  } catch (error: any) {
    console.error("Link transaction error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/licenses/:id/sign-licensor
 * Licensor signs the license contract
 */
licenseRouter.post("/:id/sign-licensor", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const { id } = req.params;
    const { signature } = req.body;

    if (!signature) {
      return res.status(400).json({ error: "Signature required" });
    }

    const license = await storage.getLicenseContract(id);
    if (!license) {
      return res.status(404).json({ error: "License not found" });
    }

    if (license.licensorUserId !== userId) {
      return res.status(403).json({ error: "Only the licensor can sign" });
    }

    if (license.licensorSignature) {
      return res.status(400).json({ error: "License already signed by licensor" });
    }

    const updated = await storage.signLicenseContractAsLicensor(id, signature);

    res.json({
      success: true,
      license: updated,
      message: "License signed. Waiting for licensee signature.",
    });
  } catch (error: any) {
    console.error("Sign license (licensor) error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/licenses/:id/sign-licensee
 * Licensee signs the license contract
 */
licenseRouter.post("/:id/sign-licensee", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { signature, walletAddress } = req.body;

    if (!signature || !walletAddress) {
      return res.status(400).json({ error: "Signature and wallet address required" });
    }

    const license = await storage.getLicenseContract(id);
    if (!license) {
      return res.status(404).json({ error: "License not found" });
    }

    if (license.licenseeWallet !== walletAddress) {
      return res.status(403).json({ error: "Wallet address does not match licensee wallet" });
    }

    if (!license.licensorSignature) {
      return res.status(400).json({ error: "Licensor must sign first" });
    }

    if (license.licenseeSignature) {
      return res.status(400).json({ error: "License already signed by licensee" });
    }

    const updated = await storage.signLicenseContractAsLicensee(id, signature);

    res.json({
      success: true,
      license: updated,
      message: "License signed by licensee. Pending payment for deployment.",
      paymentRequired: {
        amount: license.creationFee,
        currency: "SOL",
      },
    });
  } catch (error: any) {
    console.error("Sign license (licensee) error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/licenses/:id/verify-payment
 * Verify SOL payment for license creation fee
 */
licenseRouter.post("/:id/verify-payment", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { txHash } = req.body;

    if (!txHash) {
      return res.status(400).json({ error: "Transaction hash required" });
    }

    const license = await storage.getLicenseContract(id);
    if (!license) {
      return res.status(404).json({ error: "License not found" });
    }

    if (license.status !== "pending_payment") {
      return res.status(400).json({ error: "License is not pending payment" });
    }

    // TODO: Verify transaction on Solana blockchain
    // For now, mark as paid and update status

    const updated = await storage.updateLicenseContract(id, {
      creationFeePaid: true,
      creationFeePaymentTx: txHash,
      creationFeePaidAt: new Date(),
      status: "pending_deployment",
    });

    res.json({
      success: true,
      license: updated,
      message: "Payment verified. License will be deployed to blockchain.",
    });
  } catch (error: any) {
    console.error("Verify payment error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public/license/:slug
 * Public view of a license (shareable link)
 */
licenseRouter.get("/public/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const license = await storage.getLicenseContractBySlug(slug);
    if (!license) {
      return res.status(404).json({ error: "License not found" });
    }

    const logo = await storage.getLogoById(license.logoId ?? "");
    const licensor = await storage.getUser(license.licensorUserId);

    // Return public-safe data only
    res.json({
      id: license.id,
      licenseType: license.licenseType,
      licensorName: licensor?.firstName || "Anonymous",
      licenseeWallet: license.licenseeWallet,
      logoName: logo?.tokenName || logo?.fileName,
      logoThumbnail: logo?.thumbnailUrl,
      badgeImageUrl: license.badgeImageArweaveUrl,
      platforms: getPermittedPlatforms(license.platformBitmap),
      otherPlatforms: license.otherPlatforms,
      canTransfer: license.canTransfer,
      canSublicense: license.canSublicense,
      canModify: license.canModify,
      requiresAttribution: license.requiresAttribution,
      isPerpetual: license.isPerpetual,
      expiresAt: license.expiresAt,
      status: license.status,
      pdaAddress: license.pdaAddress,
      transactionHash: license.transactionHash,
      createdAt: license.createdAt,
    });
  } catch (error: any) {
    console.error("Get public license error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/licenses/:id/revoke
 * Revoke a license (licensor only)
 */
licenseRouter.post("/:id/revoke", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const { id } = req.params;
    const { reason } = req.body;

    const license = await storage.getLicenseContract(id);
    if (!license) {
      return res.status(404).json({ error: "License not found" });
    }

    if (license.licensorUserId !== userId) {
      return res.status(403).json({ error: "Only the licensor can revoke" });
    }

    if (license.licenseType === "full_transfer") {
      return res.status(400).json({ error: "Cannot revoke a full transfer license" });
    }

    const updated = await storage.updateLicenseContract(id, {
      status: "revoked",
      revocationConditions: reason || "Revoked by licensor",
    });

    res.json({
      success: true,
      license: updated,
      message: "License revoked successfully.",
    });
  } catch (error: any) {
    console.error("Revoke license error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/licenses/:id/accept
 * Accept a license offer (v1 simplified flow - simulates payment)
 * Licensee accepts and license becomes active immediately
 */
licenseRouter.post("/:id/accept", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const { id } = req.params;

    const license = await storage.getLicenseContract(id);
    if (!license) {
      return res.status(404).json({ error: "License not found" });
    }

    // Only pending licenses can be accepted
    if (
      license.status !== "draft" &&
      license.status !== "pending_acceptance" &&
      license.status !== "pending_licensee_signature"
    ) {
      return res
        .status(400)
        .json({ error: `Cannot accept license with status: ${license.status}` });
    }

    // Check if user is the licensee
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const userWallet = user.solanaPublicKey || user.walletAddress;
    if (license.licenseeWallet !== userWallet) {
      return res.status(403).json({ error: "Only the designated licensee can accept this offer" });
    }

    const now = new Date();
    const startsAt = now;

    // Calculate expiry based on duration
    let expiresAt = license.expiresAt;
    if (!license.isPerpetual && license.durationDays && !expiresAt) {
      expiresAt = new Date(now.getTime() + license.durationDays * 24 * 60 * 60 * 1000);
    }

    // v1: Simulate payment - mark as active immediately
    const updated = await storage.updateLicenseContract(id, {
      status: "active",
      startsAt,
      expiresAt,
      licenseeSignedAt: now,
      currentHolderName: user.firstName
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : undefined,
      currentHolderWallet: userWallet,
      currentHolderEmail: user.email || undefined,
      // Mark fee as paid (simulated for v1)
      creationFeePaid: true,
      creationFeePaidAt: now,
    });

    res.json({
      success: true,
      license: updated,
      message: "License accepted and activated successfully.",
    });
  } catch (error: any) {
    console.error("Accept license error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/licenses/asset/:assetId
 * Get all licenses for a specific asset (track, release, logo, etc.)
 */
licenseRouter.get("/asset/:assetId", isAuthenticated, async (req: any, res) => {
  try {
    const { assetId } = req.params;
    const licenses = await storage.getLicenseContractsByAsset(assetId);

    res.json({ licenses });
  } catch (error: any) {
    console.error("Get licenses by asset error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/licenses/offer
 * Create a simple license offer (v1 simplified flow)
 * Creates license with status 'pending_acceptance'
 */
licenseRouter.post("/offer", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const userWallet = user.solanaPublicKey || user.walletAddress;
    if (!userWallet) {
      return res.status(400).json({ error: "User wallet not configured" });
    }

    const {
      assetId,
      licenseeWallet,
      licenseeEmail,
      licenseeName,
      licenseType = "non_exclusive",
      isPerpetual = false,
      durationDays,
      upfrontPaymentAmount,
      upfrontPaymentCurrency = "SOL",
      canModify = false,
      canSublicense = false,
      canTransfer = false,
      requiresAttribution = true,
    } = req.body;

    if (!assetId) {
      return res.status(400).json({ error: "Asset ID is required" });
    }
    if (!licenseeWallet) {
      return res.status(400).json({ error: "Licensee wallet is required" });
    }

    // Calculate expiry
    let expiresAt = null;
    if (!isPerpetual && durationDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
    }

    const license = await storage.createLicenseContract({
      licensorUserId: userId,
      licensorWallet: userWallet,
      licenseeWallet,
      licenseeEmail,
      licenseeName,
      assetId,
      licenseType,
      isPerpetual,
      durationDays,
      expiresAt,
      upfrontPaymentAmount,
      upfrontPaymentCurrency,
      canModify,
      canSublicense,
      canTransfer,
      requiresAttribution,
      arbitrationAgreed: true,
      indemnificationAgreed: true,
      status: "pending_acceptance",
    } as any);

    res.status(201).json({
      success: true,
      license,
      message: "License offer created. Share with licensee for acceptance.",
    });
  } catch (error: any) {
    console.error("Create license offer error:", error);
    res.status(500).json({ error: error.message });
  }
});
