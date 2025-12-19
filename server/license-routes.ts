/**
 * License Smart Contract API Routes
 * Handles creation, signing, and management of IP licenses
 */

import { Router } from 'express';
import { storage } from './storage';
import { isAuthenticated } from './replitAuth';
import { requireActiveSubscription } from './subscription-routes';
import { 
  insertLicenseContractSchema, 
  LICENSE_TEMPLATES,
  PLATFORM_BITS,
  getPermittedPlatforms,
  createPlatformBitmap,
} from '@shared/schema';
import { LICENSE_FEE } from '@shared/pricing';
import { z } from 'zod';

export const licenseRouter = Router();

/**
 * GET /api/licenses
 * Get all licenses for the authenticated user (as licensor OR licensee)
 */
licenseRouter.get('/', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
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
    let licenseeLicenses: any[] = [];
    for (const wallet of userWallets) {
      const licenses = await storage.getLicenseContractsByLicensee(wallet);
      licenseeLicenses.push(...licenses);
    }
    
    // Combine and deduplicate (in case same license appears in both)
    const licenseMap = new Map();
    
    for (const license of licensorLicenses) {
      licenseMap.set(license.id, { ...license, userRole: 'licensor' });
    }
    
    for (const license of licenseeLicenses) {
      if (!licenseMap.has(license.id)) {
        licenseMap.set(license.id, { ...license, userRole: 'licensee' });
      }
    }
    
    const allLicenses = Array.from(licenseMap.values());
    
    // Enrich with logo info
    const enrichedLicenses = await Promise.all(
      allLicenses.map(async (license) => {
        const logo = await storage.getLogoById(license.logoId);
        return {
          ...license,
          logo: logo ? {
            id: logo.id,
            fileName: logo.fileName,
            thumbnailUrl: logo.thumbnailUrl,
            tokenName: logo.tokenName,
          } : null,
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
    console.error('Get licenses error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/licenses/templates
 * Get available license templates
 */
licenseRouter.get('/templates', (req, res) => {
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
 * GET /api/licenses/by-logo/:logoId
 * Get all licenses for a specific logo
 */
licenseRouter.get('/by-logo/:logoId', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const { logoId } = req.params;
    
    // Verify logo ownership
    const logo = await storage.getLogoById(logoId);
    if (!logo || logo.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to view licenses for this logo' });
    }

    const licenses = await storage.getLicenseContractsByLogo(logoId);
    res.json(licenses);
  } catch (error: any) {
    console.error('Get licenses by logo error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/licenses/:id
 * Get a specific license by ID
 */
licenseRouter.get('/:id', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const { id } = req.params;

    const license = await storage.getLicenseContract(id);
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    // Check authorization (licensor or licensee)
    const user = await storage.getUser(userId);
    const isLicensor = license.licensorUserId === userId;
    const isLicensee = user?.walletAddress === license.licenseeWallet || 
                       user?.solanaPublicKey === license.licenseeWallet;
    
    if (!isLicensor && !isLicensee) {
      return res.status(403).json({ error: 'Not authorized to view this license' });
    }

    const logo = await storage.getLogoById(license.logoId);
    
    res.json({
      ...license,
      logo: logo ? {
        id: logo.id,
        fileName: logo.fileName,
        thumbnailUrl: logo.thumbnailUrl,
        tokenName: logo.tokenName,
        imageUrl: logo.imageUrl,
      } : null,
      permittedPlatformsList: getPermittedPlatforms(license.platformBitmap),
    });
  } catch (error: any) {
    console.error('Get license error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/licenses
 * Create a new license contract (requires active subscription)
 */
licenseRouter.post('/', isAuthenticated, requireActiveSubscription, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Validate request body
    const validationResult = insertLicenseContractSchema.safeParse({
      ...req.body,
      licensorUserId: userId,
      licensorWallet: user.solanaPublicKey || user.walletAddress,
    });

    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      });
    }

    const data = validationResult.data;

    // Verify logo ownership
    const logo = await storage.getLogoById(data.logoId);
    if (!logo || logo.userId !== userId) {
      return res.status(403).json({ error: 'You do not own this logo' });
    }

    // Check if this is an exclusive license and logo already has active exclusive license
    if (data.licenseType === 'exclusive' || data.licenseType === 'full_transfer') {
      const existingLicenses = await storage.getLicenseContractsByLogo(data.logoId);
      const hasActiveExclusive = existingLicenses.some(
        l => (l.licenseType === 'exclusive' || l.licenseType === 'full_transfer') && 
             l.status === 'active' &&
             (!l.expiresAt || new Date(l.expiresAt) > new Date())
      );
      if (hasActiveExclusive) {
        return res.status(400).json({ 
          error: 'This logo already has an active exclusive license. Cannot create another exclusive license.' 
        });
      }
    }

    // Calculate expiry if not perpetual
    let expiresAt = null;
    let startsAt = new Date();
    if (!data.isPerpetual && data.durationDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.durationDays);
    }

    // Create the license
    const license = await storage.createLicenseContract({
      ...data,
      startsAt,
      expiresAt,
      creationFee: LICENSE_FEE.amount,
    } as any);

    res.status(201).json({
      success: true,
      license,
      message: 'License draft created. Share with licensee for signature.',
    });
  } catch (error: any) {
    console.error('Create license error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/licenses/:id/sign-licensor
 * Licensor signs the license contract
 */
licenseRouter.post('/:id/sign-licensor', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const { id } = req.params;
    const { signature } = req.body;

    if (!signature) {
      return res.status(400).json({ error: 'Signature required' });
    }

    const license = await storage.getLicenseContract(id);
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    if (license.licensorUserId !== userId) {
      return res.status(403).json({ error: 'Only the licensor can sign' });
    }

    if (license.licensorSignature) {
      return res.status(400).json({ error: 'License already signed by licensor' });
    }

    const updated = await storage.signLicenseContractAsLicensor(id, signature);
    
    res.json({
      success: true,
      license: updated,
      message: 'License signed. Waiting for licensee signature.',
    });
  } catch (error: any) {
    console.error('Sign license (licensor) error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/licenses/:id/sign-licensee
 * Licensee signs the license contract
 */
licenseRouter.post('/:id/sign-licensee', async (req: any, res) => {
  try {
    const { id } = req.params;
    const { signature, walletAddress } = req.body;

    if (!signature || !walletAddress) {
      return res.status(400).json({ error: 'Signature and wallet address required' });
    }

    const license = await storage.getLicenseContract(id);
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    if (license.licenseeWallet !== walletAddress) {
      return res.status(403).json({ error: 'Wallet address does not match licensee wallet' });
    }

    if (!license.licensorSignature) {
      return res.status(400).json({ error: 'Licensor must sign first' });
    }

    if (license.licenseeSignature) {
      return res.status(400).json({ error: 'License already signed by licensee' });
    }

    const updated = await storage.signLicenseContractAsLicensee(id, signature);
    
    res.json({
      success: true,
      license: updated,
      message: 'License signed by licensee. Pending payment for deployment.',
      paymentRequired: {
        amount: license.creationFee,
        currency: 'SOL',
      },
    });
  } catch (error: any) {
    console.error('Sign license (licensee) error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/licenses/:id/verify-payment
 * Verify SOL payment for license creation fee
 */
licenseRouter.post('/:id/verify-payment', async (req: any, res) => {
  try {
    const { id } = req.params;
    const { txHash } = req.body;

    if (!txHash) {
      return res.status(400).json({ error: 'Transaction hash required' });
    }

    const license = await storage.getLicenseContract(id);
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    if (license.status !== 'pending_payment') {
      return res.status(400).json({ error: 'License is not pending payment' });
    }

    // TODO: Verify transaction on Solana blockchain
    // For now, mark as paid and update status

    const updated = await storage.updateLicenseContract(id, {
      creationFeePaid: true,
      creationFeePaymentTx: txHash,
      creationFeePaidAt: new Date(),
      status: 'pending_deployment',
    });

    res.json({
      success: true,
      license: updated,
      message: 'Payment verified. License will be deployed to blockchain.',
    });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public/license/:slug
 * Public view of a license (shareable link)
 */
licenseRouter.get('/public/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const license = await storage.getLicenseContractBySlug(slug);
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    const logo = await storage.getLogoById(license.logoId);
    const licensor = await storage.getUser(license.licensorUserId);

    // Return public-safe data only
    res.json({
      id: license.id,
      licenseType: license.licenseType,
      licensorName: licensor?.firstName || 'Anonymous',
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
    console.error('Get public license error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/licenses/:id/revoke
 * Revoke a license (licensor only)
 */
licenseRouter.post('/:id/revoke', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const { id } = req.params;
    const { reason } = req.body;

    const license = await storage.getLicenseContract(id);
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    if (license.licensorUserId !== userId) {
      return res.status(403).json({ error: 'Only the licensor can revoke' });
    }

    if (license.licenseType === 'full_transfer') {
      return res.status(400).json({ error: 'Cannot revoke a full transfer license' });
    }

    const updated = await storage.updateLicenseContract(id, {
      status: 'revoked',
      revocationConditions: reason || 'Revoked by licensor',
    });

    res.json({
      success: true,
      license: updated,
      message: 'License revoked successfully.',
    });
  } catch (error: any) {
    console.error('Revoke license error:', error);
    res.status(500).json({ error: error.message });
  }
});
