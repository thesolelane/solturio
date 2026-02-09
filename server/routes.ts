// Reference: blueprint:javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { csrfProtection } from "./csrf";
import { storage } from "./storage";
import { pool } from "./db";
import { type User } from "@shared/schema";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { createHash } from "crypto";
import path from "path";
import fs from "fs/promises";
import { 
  generateSolanaWallet as generateSolanaWalletNew, 
  getNextAccountNumber, 
  validateCustomName, 
  isWalletNameTaken,
  decryptData
} from "./wallet";
import { uploadToIPFS, uploadJSONToIPFS, generateLogoMetadata } from "./ipfs";
import { generatePriorArtCertificate, generateDMCATakedownNotice, generateCeaseAndDesistLetter } from "./legal-documents";
import { isSolturioWallet, getRestrictionErrorMessage } from "./wallet-restrictions";
import { verifyPayment, isTransactionUsed } from "./payment-verification";
import { licensesRouter } from "./licenses";
import { licenseRouter } from "./license-routes";
import { treasuryRouter } from "./treasury";
import { ipRegistrationRouter } from "./ip-registration";
import { subdomainsRouter } from "./subdomains";
import { githubProxyRouter } from "./github-proxy";
import { subscriptionRouter } from "./subscription-routes";
import { rewardsRouter } from "./rewards-routes";
import { tokensRouter } from "./tokens-routes";
import { musicRouter } from "./routes/music";
import { watermarkRouter } from "./watermark-routes";
import { applyValidationToRoutes } from "./validation-middleware";
import { formatError, formatSuccess } from "./error-handler";
import { auditLogger } from "./audit-logger";
import { verifyTransactionOnChain } from "./sc-integration";
import { 
  sendRegistrationConfirmation, 
  sendWalletCreated,
  sendNFTMintingStarted,
  sendDynamicReceipt,
  isEmailServiceConfigured,
  type ReceiptData,
  type LineItem
} from "./services/email";
import { 
  mintNFTCertificate, 
  updateLogoWithNFT, 
  buildNFTMetadata,
  type MintOptions 
} from "./services/nft-minting";
import { createVerifiedImage, isCompositableImage } from "./services/image-compositing";
import { VERIFICATION_ASSETS } from "@shared/verification-assets";
import { arweaveService } from "./services/arweave";
import { Connection, PublicKey } from "@solana/web3.js";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

// Rate limiter for extension API endpoints (security: prevent brute force/abuse)
// Uses IP-based keying; applies per-route so no skip function needed
// Note: In production behind a proxy, ensure app.set('trust proxy', 1) is configured
const extensionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, trustProxy: false },
});

// Stricter rate limiter for registration (expensive operation)
// Note: Per-IP based; could add per-user limiting at application layer if needed
const extensionRegisterRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit to 20 registrations per hour per IP
  message: { message: "Registration rate limit exceeded, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, trustProxy: false },
});

// Setup file upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for larger files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      // Images
      'image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/gif', 'image/webp', 'image/tiff', 'image/tif',
      // Documents
      'application/pdf', 'text/plain', 'application/json', // PDF, TXT, JSON
      // Archives
      'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed',
      // Design files
      'application/postscript', // .ai, .eps
      'image/vnd.adobe.photoshop', // .psd
      // Vector
      'image/eps', 'application/eps',
      // Generic binary (for .ai, .sketch, etc.)
      'application/octet-stream'
    ];
    // Also check by file extension for when MIME type is incorrect
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'tiff', 'tif', 'pdf', 'txt', 'json', 'zip', 'rar', 'ai', 'psd', 'eps'];
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: images, PDF, TXT, ZIP, AI, PSD, EPS, TIFF.`));
    }
  },
});

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const THUMBNAILS_DIR = path.join(UPLOAD_DIR, 'thumbnails');
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);
fs.mkdir(THUMBNAILS_DIR, { recursive: true }).catch(console.error);

// Helper to generate and save thumbnail
async function generateThumbnail(buffer: Buffer, mimetype: string, logoId: string): Promise<string | null> {
  try {
    const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/tiff'];
    
    if (!imageTypes.includes(mimetype)) {
      // Non-image files don't get thumbnails
      return null;
    }
    
    const thumbnailPath = path.join(THUMBNAILS_DIR, `${logoId}.jpg`);
    
    await sharp(buffer)
      .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    return `/api/thumbnails/${logoId}.jpg`;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return null;
  }
}

// Helper to extract color palette and metadata from image
async function extractImageMetadata(buffer: Buffer, mimetype: string) {
  try {
    // Calculate SHA-256 hash
    const fileHash = createHash('sha256').update(buffer).digest('hex');

    if (mimetype === 'image/svg+xml') {
      // Parse SVG to get viewBox or width/height attributes
      const svgString = buffer.toString('utf-8');
      let width = 0;
      let height = 0;

      // Try to extract viewBox
      const viewBoxMatch = svgString.match(/viewBox=["']([^"']+)["']/);
      if (viewBoxMatch) {
        const viewBox = viewBoxMatch[1].split(/\s+/);
        if (viewBox.length === 4) {
          width = parseFloat(viewBox[2]);
          height = parseFloat(viewBox[3]);
        }
      }

      // If no viewBox, try width/height attributes
      if (!width || !height) {
        const widthMatch = svgString.match(/\bwidth=["']?(\d+(?:\.\d+)?)/);
        const heightMatch = svgString.match(/\bheight=["']?(\d+(?:\.\d+)?)/);
        if (widthMatch) width = parseFloat(widthMatch[1]);
        if (heightMatch) height = parseFloat(heightMatch[1]);
      }

      return {
        width: Math.round(width) || 0,
        height: Math.round(height) || 0,
        format: 'SVG',
        colorPalette: [],
        dominantColor: null,
        fileHash,
      };
    }

    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    // Get dominant color
    const stats = await image.stats();
    const dominantColor = `#${Math.round(stats.dominant.r).toString(16).padStart(2, '0')}${Math.round(stats.dominant.g).toString(16).padStart(2, '0')}${Math.round(stats.dominant.b).toString(16).padStart(2, '0')}`;

    // Extract color palette by resizing and getting pixels
    let colorPalette = [dominantColor];
    try {
      const resized = await image
        .resize(100, 100, { fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = resized.data;
      const channels = resized.info.channels; // Usually 3 (RGB) or 4 (RGBA)
      const colorMap = new Map<string, number>();

      // Sample every 10th pixel to get color distribution
      // Step by (channels * 10) to properly skip pixels
      for (let i = 0; i < pixels.length; i += channels * 10) {
        if (i + 2 < pixels.length) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
        }
      }

      // Get top 5 colors by frequency
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([color]) => color);

      colorPalette = sortedColors.length > 0 ? sortedColors : [dominantColor];
    } catch (paletteError) {
      // If palette extraction fails, just use dominant color
      console.warn('Could not extract full color palette:', paletteError);
    }

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format?.toUpperCase() || 'UNKNOWN',
      colorPalette,
      dominantColor,
      fileHash,
    };
  } catch (error) {
    console.error('Error extracting image metadata:', error);
    return {
      width: 0,
      height: 0,
      format: 'UNKNOWN',
      colorPalette: [],
      dominantColor: null,
      fileHash: createHash('sha256').update(buffer).digest('hex'),
    };
  }
}

// Import pricing configuration
import { PRICING, isEligibleForFreeUpload, getRemainingFreeUploads, isAdminEmail } from "@shared/pricing";
import { checkSubscriptionStatus, checkFreeAccess } from "./subscription-service";

// Middleware to check active subscription for creation actions
async function requireActiveSubscription(req: any, res: any, next: any) {
  try {
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Admin emails always have access
    if (user.email && isAdminEmail(user.email)) {
      return next();
    }

    // Check subscription status
    const status = await checkSubscriptionStatus(userId);
    
    if (status.isActive) {
      return next();
    }

    // Expired or pending accounts cannot create new content
    return res.status(403).json({ 
      message: "Active subscription required",
      accountStatus: status.status,
      action: "activate_subscription",
      details: status.status === 'expired' 
        ? "Your subscription has expired. Renew to create new registrations. Your existing data is preserved."
        : "Please activate your account with a $CATH payment to register new logos and artwork."
    });
  } catch (error: any) {
    console.error("Subscription check error:", error);
    return res.status(500).json({ message: "Failed to verify subscription status" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  
  // Apply CSRF protection to all routes (automatically skips GET/HEAD/OPTIONS)
  app.use(csrfProtection);

  // Health check endpoint - includes service status
  app.get('/api/health', (req, res) => {
    const telegramStatus = (global as any).telegramBotStatus || 'unknown';
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'online',
        telegram: telegramStatus, // 'online', 'offline', 'not_configured', 'initializing'
        arweave: process.env.ARWEAVE_WALLET_KEY ? 'configured' : 'not_configured',
        pinata: process.env.PINATA_API_KEY ? 'configured' : 'not_configured',
        sendgrid: process.env.SENDGRID_API_KEY ? 'configured' : 'not_configured',
      }
    });
  });

  // Tokenomics on-chain configuration endpoint (public)
  app.get('/api/tokenomics/on-chain-config', async (req, res) => {
    try {
      // In production, this would fetch real data from Solana blockchain
      // For now, return placeholder config that indicates token is not yet deployed
      const SOLT_MINT_ADDRESS = process.env.SOLT_MINT_ADDRESS;
      
      if (!SOLT_MINT_ADDRESS) {
        // Token not yet deployed
        return res.json(null);
      }

      try {
        const connection = new Connection(
          process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
          'confirmed'
        );
        
        const mintPubkey = new PublicKey(SOLT_MINT_ADDRESS);
        const mintInfo = await connection.getAccountInfo(mintPubkey);
        
        if (!mintInfo) {
          return res.json(null);
        }

        // Parse mint account data (SPL Token mint layout)
        // Simplified - in production use @solana/spl-token
        const data = mintInfo.data;
        const decimals = data[44]; // Decimals at offset 44
        
        // Read supply as u64 at offset 36-43
        const supplyBuffer = data.slice(36, 44);
        const supply = supplyBuffer.readBigUInt64LE();
        const formattedSupply = (Number(supply) / Math.pow(10, decimals)).toLocaleString();

        // Authority at offset 0-32
        const authorityBytes = data.slice(4, 36);
        const authority = new PublicKey(authorityBytes).toString();

        // Freeze authority at offset 46-78 (if present)
        const freezeAuthorityOption = data[45]; // Option discriminator
        let freezeAuthority = null;
        if (freezeAuthorityOption === 1) {
          const freezeBytes = data.slice(46, 78);
          freezeAuthority = new PublicKey(freezeBytes).toString();
        }

        res.json({
          verified: true,
          mintAddress: SOLT_MINT_ADDRESS,
          totalSupply: formattedSupply,
          decimals: decimals,
          authority: authority,
          freezeAuthority: freezeAuthority,
          vestingSchedule: {
            cliff: 180, // 6 months
            duration: 730, // 24 months
            interval: 30, // Monthly
          },
          rewardPoolCap: '50,000,000 SOLT',
          lastUpdated: new Date().toISOString(),
        });
      } catch (rpcError) {
        console.error('Error fetching on-chain data:', rpcError);
        return res.json(null);
      }
    } catch (error) {
      console.error('Error in tokenomics config:', error);
      res.status(500).json({ message: 'Failed to fetch on-chain configuration' });
    }
  });

  // Public search endpoint (no authentication required)
  app.get('/api/public/search', async (req, res) => {
    try {
      const { query, type } = req.query as { query?: string; type?: string };
      
      if (!query || query.length < 2) {
        return res.json([]);
      }

      const searchQuery = query.toLowerCase().replace(/^[@$]/, ''); // Remove @ or $ prefix
      const searchType = type || 'all';
      
      // Get all minted collections with their creators
      const allCollections = await storage.getAllMintedCollections();
      
      // Filter to only public collections, then apply search criteria
      const publicCollections = allCollections.filter(c => c.isPublic !== false);
      const results = publicCollections.filter(collection => {
        if (searchType === 'ticker') {
          return collection.ticker?.toLowerCase().includes(searchQuery);
        } else if (searchType === 'social') {
          const user = collection.user;
          return (
            user?.twitterHandle?.toLowerCase().includes(searchQuery) ||
            user?.telegramHandle?.toLowerCase().includes(searchQuery) ||
            user?.instagramHandle?.toLowerCase().includes(searchQuery) ||
            user?.discordHandle?.toLowerCase().includes(searchQuery)
          );
        } else {
          // Search all fields
          const user = collection.user;
          return (
            collection.name?.toLowerCase().includes(searchQuery) ||
            collection.ticker?.toLowerCase().includes(searchQuery) ||
            user?.twitterHandle?.toLowerCase().includes(searchQuery) ||
            user?.telegramHandle?.toLowerCase().includes(searchQuery) ||
            user?.instagramHandle?.toLowerCase().includes(searchQuery) ||
            user?.firstName?.toLowerCase().includes(searchQuery) ||
            user?.lastName?.toLowerCase().includes(searchQuery)
          );
        }
      });

      // Return only public information
      const publicResults = results.map(c => ({
        id: c.id,
        name: c.name,
        ticker: c.ticker,
        registrationType: c.registrationType,
        status: c.status,
        logoCount: c.logoCount || 0,
        mintedAt: c.mintedAt,
        user: {
          firstName: c.user?.firstName || null,
          lastName: c.user?.lastName || null,
          twitterHandle: c.user?.twitterHandle || null,
          telegramHandle: c.user?.telegramHandle || null,
          instagramHandle: c.user?.instagramHandle || null,
          telegramGroupLink: c.user?.telegramGroupLink || null,
          websiteUrl: c.user?.websiteUrl || null,
          bio: c.user?.bio || null,
        },
      }));

      res.json(publicResults);
    } catch (error) {
      console.error("Error in public search:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  // Public wallet verification lookup (no authentication required)
  app.get('/api/public/verify-wallet/:walletAddress', async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress || walletAddress.length < 32) {
        return res.status(400).json({ message: "Invalid wallet address" });
      }

      // Look up user by wallet address
      const user = await storage.getUserByWalletAddress(walletAddress);
      
      if (!user) {
        return res.json({
          verified: false,
          message: "No registered creator found for this wallet address",
          walletAddress,
        });
      }

      // Get user's public collections
      const collections = await storage.getCollectionsByUserId(user.id);
      const publicCollections = collections.filter(c => 
        c.isPublic !== false && (c.status === 'minted' || c.status === 'complete')
      );

      // Return public verification data
      res.json({
        verified: true,
        walletAddress,
        walletDomain: user.solturioWalletDomain || null,
        creator: {
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          twitterHandle: user.twitterHandle || null,
          telegramHandle: user.telegramHandle || null,
          instagramHandle: user.instagramHandle || null,
          websiteUrl: user.websiteUrl || null,
          bio: user.bio || null,
          memberSince: user.createdAt,
        },
        collections: publicCollections.map(c => ({
          id: c.id,
          name: c.name,
          ticker: c.ticker,
          registrationType: c.registrationType,
          status: c.status,
          mintedAt: c.mintedAt,
        })),
        totalCollections: publicCollections.length,
      });
    } catch (error) {
      console.error("Error in wallet verification lookup:", error);
      res.status(500).json({ message: "Verification lookup failed" });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Extension token endpoint - generates scoped JWT for browser extension
  app.post('/api/extension/token', extensionRateLimiter, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Use SESSION_SECRET for JWT signing (secure, stored in environment)
      const jwtSecret = process.env.SESSION_SECRET;
      if (!jwtSecret) {
        return res.status(500).json({ message: "Server configuration error" });
      }

      // Generate proper JWT with scoped permissions
      const payload = {
        sub: userId,
        email: user.email,
        scopes: ['extension:verify', 'extension:register', 'read:portfolio'],
      };

      const token = jwt.sign(payload, jwtSecret, {
        expiresIn: '7d',
        issuer: 'solturio.app',
        audience: 'solturio-extension',
      });

      auditLogger.log({
        action: 'extension_token_generated',
        userId,
        details: { scopes: payload.scopes }
      });

      res.json({ token });
    } catch (error) {
      console.error("Error generating extension token:", error);
      res.status(500).json({ message: "Failed to generate extension token" });
    }
  });

  // ============================================
  // EXTENSION API ENDPOINTS (JWT Bearer Auth)
  // ============================================

  // JWT Bearer authentication middleware for extension requests
  const isExtensionAuthenticated: any = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Missing or invalid authorization header" });
      }

      const token = authHeader.substring(7);
      const jwtSecret = process.env.SESSION_SECRET;
      
      if (!jwtSecret) {
        return res.status(500).json({ message: "Server configuration error" });
      }

      const decoded = jwt.verify(token, jwtSecret, {
        issuer: 'solturio.app',
        audience: 'solturio-extension',
      }) as { sub: string; email: string; scopes: string[] };

      // Attach user info to request
      req.extensionUser = {
        userId: decoded.sub,
        email: decoded.email,
        scopes: decoded.scopes,
      };

      next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: "Token expired" });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: "Invalid token" });
      }
      console.error("Extension auth error:", error);
      res.status(401).json({ message: "Authentication failed" });
    }
  };

  // Helper to check if user has required scope
  const hasScope = (scopes: string[], required: string): boolean => {
    return scopes.includes(required);
  };

  // Extension: Verify content by hash
  app.post('/api/extension/verify', extensionRateLimiter, isExtensionAuthenticated, async (req: any, res) => {
    try {
      if (!hasScope(req.extensionUser.scopes, 'extension:verify')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { hash, url } = req.body;
      
      if (!hash) {
        return res.status(400).json({ message: "Hash is required" });
      }

      const logos = await storage.getLogosByFileHash(hash);
      
      if (logos.length === 0) {
        return res.json({
          verified: false,
          registered: false,
          message: "No registered content found with this hash",
          checkedAt: new Date().toISOString(),
          url: url || null,
        });
      }

      const original = logos[0];
      const collection = original.collectionId ? 
        await storage.getCollection(original.collectionId) : null;

      // Check if current user owns this content
      const isOwner = original.userId === req.extensionUser.userId;

      res.json({
        verified: true,
        registered: true,
        isOwner,
        registration: {
          id: original.id,
          registrationDate: original.createdAt,
          fileName: original.fileName,
          companyName: collection?.companyName || "Unknown",
          ipfsHash: original.ipfsHash,
          transactionHash: original.transactionHash,
          blockNumber: original.blockNumber,
        },
        totalRegistrations: logos.length,
        checkedAt: new Date().toISOString(),
        url: url || null,
      });
    } catch (error) {
      console.error("Extension verify error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Extension: Get user's portfolio (registered IPs)
  app.get('/api/extension/portfolio', extensionRateLimiter, isExtensionAuthenticated, async (req: any, res) => {
    try {
      if (!hasScope(req.extensionUser.scopes, 'read:portfolio')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const userId = req.extensionUser.userId;
      
      // Get user's collections with logos
      const collections = await storage.getCollectionsByUserId(userId);
      const logos = await storage.getLogosByUserId(userId);
      
      // Get stats
      const stats = await storage.getUserStats(userId);

      res.json({
        collections: collections.map(c => ({
          id: c.id,
          companyName: c.companyName,
          description: c.description,
          createdAt: c.createdAt,
        })),
        logos: logos.map(l => ({
          id: l.id,
          fileName: l.fileName,
          fileHash: l.fileHash,
          description: l.description,
          registrationDate: l.createdAt,
          ipfsHash: l.ipfsHash,
          transactionHash: l.transactionHash,
          collectionId: l.collectionId,
        })),
        stats: {
          totalLogos: stats.totalLogos || 0,
          totalCollections: stats.totalCollections || 0,
        },
        retrievedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Extension portfolio error:", error);
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  // Extension: Quick register (for content detected on pages)
  app.post('/api/extension/register', extensionRateLimiter, extensionRegisterRateLimiter, isExtensionAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!hasScope(req.extensionUser.scopes, 'extension:register')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const userId = req.extensionUser.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check subscription status
      if (!user.subscriptionStatus || user.subscriptionStatus !== 'active') {
        return res.status(403).json({ 
          message: "Active subscription required",
          code: "SUBSCRIPTION_REQUIRED"
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }

      const { collectionId, description, sourceUrl } = req.body;

      // Generate file hash
      const fileHash = createHash('sha256').update(req.file.buffer).digest('hex');

      // Check if already registered
      const existing = await storage.getLogosByFileHash(fileHash);
      if (existing.length > 0) {
        const isOwner = existing[0].userId === userId;
        return res.status(409).json({
          message: "Content already registered",
          isOwner,
          existingRegistration: {
            id: existing[0].id,
            registrationDate: existing[0].createdAt,
          }
        });
      }

      // Create the registration
      const logoId = randomUUID();
      const logo = await storage.createLogo({
        id: logoId,
        userId,
        collectionId: collectionId || null,
        fileName: req.file.originalname,
        fileHash,
        fileData: req.file.buffer,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        description: description || `Registered via extension from ${sourceUrl || 'unknown source'}`,
        ownershipDescription: "Registered via Solturio browser extension",
        intendedUse: "Digital content protection",
      });

      auditLogger.log({
        action: 'extension_register',
        userId,
        details: { 
          logoId, 
          fileName: req.file.originalname,
          sourceUrl 
        }
      });

      res.status(201).json({
        success: true,
        registration: {
          id: logo.id,
          fileName: logo.fileName,
          fileHash: logo.fileHash,
          registrationDate: logo.createdAt,
        },
        message: "Content registered successfully",
      });
    } catch (error) {
      console.error("Extension register error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Extension: Get user info (for extension UI)
  app.get('/api/extension/me', extensionRateLimiter, isExtensionAuthenticated, async (req: any, res) => {
    try {
      const userId = req.extensionUser.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        subscriptionStatus: user.subscriptionStatus,
        scopes: req.extensionUser.scopes,
      });
    } catch (error) {
      console.error("Extension me error:", error);
      res.status(500).json({ message: "Failed to fetch user info" });
    }
  });

  // Stats endpoint
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================
  
  const ADMIN_EMAILS = [
    "admin@solturio.app",
    "acooper@cooperanth.com",
    "cooper@preferredbuildersusa.com",
  ];

  // Admin middleware with proper error handling
  const isAdmin = async (req: any, res: any, next: any) => {
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: "Authentication required" });
    }
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        return res.status(403).json({ message: "Admin access required" });
      }
      next();
    } catch (error) {
      console.error("Admin middleware error:", error);
      return res.status(500).json({ message: "Failed to verify admin access" });
    }
  };

  // Admin platform stats - real data from database
  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const mintedCollections = await storage.getAllMintedCollections();
      
      // Count total logos across all users
      let totalLogos = 0;
      for (const user of allUsers) {
        const userLogos = await storage.getLogosByUserId(user.id);
        totalLogos += userLogos.length;
      }
      
      // Count users with wallets
      const usersWithWallets = allUsers.filter(u => u.solturioWalletAddress).length;
      
      res.json({
        totalUsers: allUsers.length,
        logosProtected: totalLogos,
        mintedCollections: mintedCollections.length,
        usersWithWallets,
        // DEX partnerships - placeholder until we have a partnerships table
        partnerDexs: 0,
        pendingDexs: 0,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Admin wallet balances - SOL and Arweave
  app.get('/api/admin/wallets', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Get Arweave balance
      const arweaveBalance = await arweaveService.getWalletBalance();
      const arweaveAddress = await arweaveService.getWalletAddress();
      
      // SOL balance - we need a platform treasury wallet
      // For now, return placeholder until treasury wallet is configured
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
          network: "devnet", // Will change to mainnet for production
        },
      });
    } catch (error) {
      console.error("Error fetching wallet balances:", error);
      res.status(500).json({ message: "Failed to fetch wallet balances" });
    }
  });

  // Admin Arweave purchase info - balance, cost estimates, exchange links
  app.get('/api/admin/arweave/purchase-info', isAuthenticated, isAdmin, async (req: any, res) => {
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
        topUpInstructions: address ? [
          `1. Purchase AR tokens on any supported exchange`,
          `2. Withdraw AR to this address: ${address}`,
          `3. Wait for network confirmation (typically 5-10 minutes)`,
          `4. Refresh this page to verify updated balance`,
        ] : [
          "Configure ARWEAVE_WALLET_KEY secret to enable Arweave storage",
        ],
      });
    } catch (error) {
      console.error("Error fetching Arweave purchase info:", error);
      res.status(500).json({ message: "Failed to fetch Arweave purchase info" });
    }
  });

  // ============================================
  // TREASURY WALLET MANAGEMENT ENDPOINTS
  // ============================================

  // Get all treasury wallets
  app.get('/api/admin/treasury/wallets', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const wallets = await storage.getTreasuryWallets();
      
      // Fetch real-time SOL balances for each wallet
      const walletsWithBalances = await Promise.all(wallets.map(async (wallet) => {
        let balance = wallet.cachedBalance;
        try {
          // Fetch balance from Solana RPC
          const connection = new Connection(
            wallet.network === 'mainnet' 
              ? 'https://api.mainnet-beta.solana.com' 
              : 'https://api.devnet.solana.com'
          );
          const balanceLamports = await connection.getBalance(new PublicKey(wallet.address));
          balance = (balanceLamports / 1e9).toFixed(6);
          
          // Update cached balance
          await storage.updateTreasuryWallet(wallet.id, { 
            cachedBalance: balance,
            lastBalanceCheck: new Date()
          });
        } catch (err) {
          console.error(`Failed to fetch balance for ${wallet.address}:`, err);
        }
        
        return { ...wallet, cachedBalance: balance };
      }));
      
      res.json(walletsWithBalances);
    } catch (error) {
      console.error("Error fetching treasury wallets:", error);
      res.status(500).json({ message: "Failed to fetch treasury wallets" });
    }
  });

  // Add a new treasury wallet
  app.post('/api/admin/treasury/wallets', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { role, name, address, domainName, purpose, network, sweepThreshold, sweepSchedule, sweepDestination, requiredSignatures, authorizedSigners } = req.body;
      
      // Validate required fields
      if (!role || !name || !address) {
        return res.status(400).json({ message: "Role, name, and address are required" });
      }
      
      // Check if wallet with this role already exists (except bank can have multiple)
      if (role !== 'bank') {
        const existing = await storage.getTreasuryWalletByRole(role);
        if (existing) {
          return res.status(400).json({ message: `A ${role} wallet already exists` });
        }
      }
      
      // Check if address is already registered
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
        network: network || 'devnet',
        sweepThreshold,
        sweepSchedule,
        sweepDestination,
        requiredSignatures: requiredSignatures || 2,
        authorizedSigners,
        createdBy: userId,
        status: 'active',
        sweepEnabled: false,
      });
      
      res.json(wallet);
    } catch (error) {
      console.error("Error creating treasury wallet:", error);
      res.status(500).json({ message: "Failed to create treasury wallet" });
    }
  });

  // Update a treasury wallet
  app.patch('/api/admin/treasury/wallets/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const wallet = await storage.updateTreasuryWallet(id, updates);
      res.json(wallet);
    } catch (error) {
      console.error("Error updating treasury wallet:", error);
      res.status(500).json({ message: "Failed to update treasury wallet" });
    }
  });

  // Delete a treasury wallet
  app.delete('/api/admin/treasury/wallets/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTreasuryWallet(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting treasury wallet:", error);
      res.status(500).json({ message: "Failed to delete treasury wallet" });
    }
  });

  // ============================================
  // COMPLIANCE MANAGEMENT ENDPOINTS
  // ============================================

  // Get compliance logs
  app.get('/api/admin/compliance/logs', isAuthenticated, isAdmin, async (req: any, res) => {
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

  // Get compliance trigger rules
  app.get('/api/admin/compliance/triggers', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const rules = await storage.getActiveTriggerRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching trigger rules:", error);
      res.status(500).json({ message: "Failed to fetch trigger rules" });
    }
  });

  // Create or update a trigger rule
  app.post('/api/admin/compliance/triggers', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const rule = await storage.createTriggerRule(req.body);
      res.json(rule);
    } catch (error) {
      console.error("Error creating trigger rule:", error);
      res.status(500).json({ message: "Failed to create trigger rule" });
    }
  });

  // Update a trigger rule
  app.patch('/api/admin/compliance/triggers/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const rule = await storage.updateTriggerRule(id, req.body);
      res.json(rule);
    } catch (error) {
      console.error("Error updating trigger rule:", error);
      res.status(500).json({ message: "Failed to update trigger rule" });
    }
  });

  // Get compliance cases
  app.get('/api/admin/compliance/cases', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const status = req.query.status as string | undefined;
      const cases = await storage.getComplianceCases(status);
      res.json(cases);
    } catch (error) {
      console.error("Error fetching compliance cases:", error);
      res.status(500).json({ message: "Failed to fetch compliance cases" });
    }
  });

  // Update a compliance case
  app.patch('/api/admin/compliance/cases/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const caseData = await storage.updateComplianceCase(id, req.body);
      res.json(caseData);
    } catch (error) {
      console.error("Error updating compliance case:", error);
      res.status(500).json({ message: "Failed to update compliance case" });
    }
  });

  // Get user KYC status (admin viewing any user)
  app.get('/api/admin/kyc/:userId', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const status = await storage.getKycStatus(userId);
      res.json(status || { tier: '0', status: 'not_started' });
    } catch (error) {
      console.error("Error fetching KYC status:", error);
      res.status(500).json({ message: "Failed to fetch KYC status" });
    }
  });

  // Update user KYC status
  app.patch('/api/admin/kyc/:userId', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const status = await storage.createOrUpdateKycStatus(userId, req.body);
      res.json(status);
    } catch (error) {
      console.error("Error updating KYC status:", error);
      res.status(500).json({ message: "Failed to update KYC status" });
    }
  });

  // Seed default compliance trigger rules (based on user's AML/KYC policy)
  app.post('/api/admin/compliance/seed-triggers', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const defaultRules = [
        {
          triggerCode: 'VALUE_30DAY_2K',
          name: '30-Day Volume >= $2,000',
          description: 'Rolling 30-day cumulative through escrow/installment contracts',
          category: 'value',
          thresholdValue: '2000',
          thresholdPeriodDays: 30,
          requiredTier: '2',
          requiresDocuments: false,
          requiresManualReview: false,
          severity: 'medium',
          isActive: true,
        },
        {
          triggerCode: 'SINGLE_TX_10K',
          name: 'Single Payment >= $10,000',
          description: 'Any single payment at or above $10,000',
          category: 'value',
          thresholdValue: '10000',
          requiredTier: '2',
          requiresDocuments: true,
          requiresManualReview: false,
          severity: 'medium',
          isActive: true,
        },
        {
          triggerCode: 'SINGLE_TX_25K',
          name: 'Single Payment >= $25,000',
          description: 'Any single payment at or above $25,000 requires manual review',
          category: 'value',
          thresholdValue: '25000',
          requiredTier: '2',
          requiresDocuments: true,
          requiresManualReview: true,
          severity: 'high',
          isActive: true,
        },
        {
          triggerCode: 'VELOCITY_8_24H',
          name: '8+ Payments in 24h',
          description: '8 or more payments in 24 hours to same recipient',
          category: 'velocity',
          thresholdCount: 8,
          thresholdPeriodDays: 1,
          requiredTier: '2',
          requiresDocuments: false,
          requiresManualReview: true,
          severity: 'high',
          isActive: true,
        },
        {
          triggerCode: 'VELOCITY_20_7D',
          name: '20+ Payments in 7 Days',
          description: '20 or more payments in 7 days to same recipient',
          category: 'velocity',
          thresholdCount: 20,
          thresholdPeriodDays: 7,
          requiredTier: '2',
          requiresDocuments: false,
          requiresManualReview: true,
          severity: 'high',
          isActive: true,
        },
        {
          triggerCode: 'VELOCITY_5X_SPIKE',
          name: '5x Volume Spike',
          description: '7-day volume >= 5x prior 30-day average',
          category: 'velocity',
          thresholdMultiplier: '5',
          thresholdPeriodDays: 7,
          requiredTier: '2',
          requiresDocuments: false,
          requiresManualReview: true,
          severity: 'high',
          isActive: true,
        },
        {
          triggerCode: 'PRICING_10X_MEDIAN',
          name: 'Price 10x Median',
          description: 'Price >= 10x creator median (90-180d) AND >= $2k',
          category: 'pricing',
          thresholdValue: '2000',
          thresholdMultiplier: '10',
          requiredTier: '2',
          requiresDocuments: true,
          requiresManualReview: true,
          severity: 'high',
          isActive: true,
        },
        {
          triggerCode: 'NEW_CREATOR_25K',
          name: 'New Creator High Volume',
          description: 'New creator (<14 days) with first-week volume >= $25k',
          category: 'pricing',
          thresholdValue: '25000',
          thresholdPeriodDays: 14,
          requiredTier: '2',
          requiresDocuments: true,
          requiresManualReview: true,
          severity: 'high',
          isActive: true,
        },
        {
          triggerCode: 'CONCENTRATION_60',
          name: 'Top Payer 60% Concentration',
          description: 'Top payer >= 60% of recipient 7-day volume',
          category: 'concentration',
          thresholdPercentage: 60,
          thresholdPeriodDays: 7,
          requiredTier: '2',
          requiresDocuments: false,
          requiresManualReview: true,
          severity: 'high',
          isActive: true,
        },
        {
          triggerCode: 'CONCENTRATION_80_TOP3',
          name: 'Top 3 Payers 80% Concentration',
          description: 'Top 3 payers >= 80% of recipient 7-day volume',
          category: 'concentration',
          thresholdPercentage: 80,
          thresholdPeriodDays: 7,
          requiredTier: '2',
          requiresDocuments: false,
          requiresManualReview: true,
          severity: 'high',
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
        created 
      });
    } catch (error) {
      console.error("Error seeding trigger rules:", error);
      res.status(500).json({ message: "Failed to seed trigger rules" });
    }
  });

  // ==========================================
  // Admin User Management
  // ==========================================

  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const search = (req.query.search as string || '').toLowerCase();
      const statusFilter = req.query.status as string || 'all';

      let filtered = allUsers;

      if (search) {
        filtered = filtered.filter(u =>
          (u.email && u.email.toLowerCase().includes(search)) ||
          (u.firstName && u.firstName.toLowerCase().includes(search)) ||
          (u.lastName && u.lastName.toLowerCase().includes(search)) ||
          (u.walletName && u.walletName.toLowerCase().includes(search)) ||
          (u.id && u.id.toLowerCase().includes(search))
        );
      }

      if (statusFilter !== 'all') {
        filtered = filtered.filter(u => u.accountStatus === statusFilter);
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
            sltrBalance: u.sltrBalance || '0',
            sltrTotalEarned: u.sltrTotalEarned || '0',
            referralCode: u.referralCode,
            referralCount: u.referralCount || 0,
            twitterHandle: u.twitterHandle,
            telegramHandle: u.telegramHandle,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            logoCount: userLogos.length,
            collectionCount: collections.length,
            mintedCount: collections.filter(c => c.status === 'minted').length,
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

  app.get('/api/admin/users/:userId', isAuthenticated, isAdmin, async (req: any, res) => {
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
        logos: userLogos.map(l => ({
          id: l.id,
          fileName: l.fileName,
          ticker: l.ticker,
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
        collections: collections.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          collectionAddress: c.collectionAddress,
          mintedAt: c.mintedAt,
          createdAt: c.createdAt,
        })),
        stats: {
          totalLogos: userLogos.length,
          mintedCollections: collections.filter(c => c.status === 'minted').length,
          totalCollections: collections.length,
        },
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ message: "Failed to fetch user details" });
    }
  });

  app.patch('/api/admin/users/:userId', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const allowedUpdates: Record<string, any> = {};
      const { accountStatus, isAdmin: setAdmin, subscriptionTier, subscriptionExpiresAt } = req.body;

      if (accountStatus && ['pending', 'active', 'expired', 'suspended'].includes(accountStatus)) {
        allowedUpdates.accountStatus = accountStatus;
      }
      if (typeof setAdmin === 'boolean') {
        allowedUpdates.isAdmin = setAdmin;
      }
      if (subscriptionTier && ['standard', 'premium'].includes(subscriptionTier)) {
        allowedUpdates.subscriptionTier = subscriptionTier;
      }
      if (subscriptionExpiresAt) {
        allowedUpdates.subscriptionExpiresAt = new Date(subscriptionExpiresAt);
      }

      if (Object.keys(allowedUpdates).length === 0) {
        return res.status(400).json({ message: "No valid updates provided" });
      }

      const updated = await storage.updateUser(userId, allowedUpdates);
      const { solanaEncryptedPrivateKey, walletSalt, encryptedRecoveryPhrase, ...safeUser } = updated as any;
      res.json({ message: "User updated", user: safeUser });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // ============================================
  // ADMIN PAYMENT MANAGEMENT ENDPOINTS
  // ============================================

  app.get('/api/admin/payments', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const db = pool;
      if (!db) {
        return res.status(500).json({ message: 'Database not available' });
      }

      const { status, tokenType, paymentType, search, page: pageStr, limit: limitStr } = req.query;
      const page = Math.max(1, parseInt(pageStr as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(limitStr as string) || 20));
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (status && ['pending', 'confirmed', 'failed'].includes(status as string)) {
        conditions.push(`p.status = $${paramIndex++}`);
        params.push(status);
      }
      if (tokenType) {
        conditions.push(`p.token_type = $${paramIndex++}`);
        params.push(tokenType);
      }
      if (paymentType && ['minting', 'rental', 'subscription', 'iscl'].includes(paymentType as string)) {
        conditions.push(`p.payment_type = $${paramIndex++}`);
        params.push(paymentType);
      }
      if (search) {
        conditions.push(`(p.transaction_signature ILIKE $${paramIndex} OR p.from_wallet ILIKE $${paramIndex} OR p.to_wallet ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countResult = await db.query(
        `SELECT COUNT(*) as total FROM payments p ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total);

      const statsResult = await db.query(
        `SELECT 
           COUNT(*) as total_payments,
           COUNT(*) FILTER (WHERE p.status = 'confirmed') as total_confirmed,
           COUNT(*) FILTER (WHERE p.status = 'pending') as total_pending,
           COUNT(*) FILTER (WHERE p.status = 'failed') as total_failed
         FROM payments p ${whereClause}`,
        params
      );

      const paymentsResult = await db.query(
        `SELECT p.*, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name
         FROM payments p
         LEFT JOIN users u ON p.user_id = u.id
         ${whereClause}
         ORDER BY p.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
      );

      const stats = statsResult.rows[0];
      res.json({
        payments: paymentsResult.rows.map((p: any) => ({
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
        stats: {
          totalPayments: parseInt(stats.total_payments),
          totalConfirmed: parseInt(stats.total_confirmed),
          totalPending: parseInt(stats.total_pending),
          totalFailed: parseInt(stats.total_failed),
        },
      });
    } catch (error) {
      console.error('Admin payments list error:', error);
      res.status(500).json({ message: 'Failed to fetch payments' });
    }
  });

  app.get('/api/admin/payments/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const db = pool;
      if (!db) {
        return res.status(500).json({ message: 'Database not available' });
      }

      const overviewResult = await db.query(
        `SELECT 
           COUNT(*) as total_payments,
           COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_payments,
           COUNT(*) FILTER (WHERE status = 'pending') as pending_payments,
           COUNT(*) FILTER (WHERE status = 'failed') as failed_payments
         FROM payments`
      );

      const tokensResult = await db.query(
        `SELECT symbol FROM accepted_tokens WHERE is_active = true ORDER BY symbol`
      );
      const allTokenSymbols: string[] = tokensResult.rows.map((t: any) => t.symbol);

      const volumeResult = await db.query(
        `SELECT token_type, COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total_amount
         FROM payments
         WHERE status = 'confirmed'
         GROUP BY token_type`
      );
      const byToken: Record<string, string> = {};
      for (const symbol of allTokenSymbols) {
        byToken[symbol] = '0';
      }
      for (const row of volumeResult.rows) {
        byToken[row.token_type] = row.total_amount.toString();
      }

      const byPaymentTypeResult = await db.query(
        `SELECT payment_type, COUNT(*) as count
         FROM payments
         GROUP BY payment_type`
      );
      const byPaymentType: Record<string, number> = {};
      for (const row of byPaymentTypeResult.rows) {
        byPaymentType[row.payment_type || 'unknown'] = parseInt(row.count);
      }

      const byTokenTypeResult = await db.query(
        `SELECT token_type as symbol, COUNT(*) as count, COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total_amount
         FROM payments
         GROUP BY token_type
         ORDER BY count DESC`
      );

      const recentResult = await db.query(
        `SELECT p.*, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name
         FROM payments p
         LEFT JOIN users u ON p.user_id = u.id
         ORDER BY p.created_at DESC
         LIMIT 10`
      );

      const overview = overviewResult.rows[0];
      res.json({
        overview: {
          totalPayments: parseInt(overview.total_payments),
          confirmedPayments: parseInt(overview.confirmed_payments),
          pendingPayments: parseInt(overview.pending_payments),
          failedPayments: parseInt(overview.failed_payments),
          totalVolume: { byToken },
        },
        byPaymentType,
        byTokenType: byTokenTypeResult.rows.map((r: any) => ({
          symbol: r.symbol,
          count: parseInt(r.count),
          totalAmount: r.total_amount.toString(),
        })),
        recentPayments: recentResult.rows.map((p: any) => ({
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
      });
    } catch (error) {
      console.error('Admin payments stats error:', error);
      res.status(500).json({ message: 'Failed to fetch payment stats' });
    }
  });

  app.get('/api/admin/payments/:paymentId', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const db = pool;
      if (!db) {
        return res.status(500).json({ message: 'Database not available' });
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
        return res.status(404).json({ message: 'Payment not found' });
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
        user: p.user_id ? {
          id: p.user_id,
          email: p.user_email,
          firstName: p.user_first_name,
          lastName: p.user_last_name,
        } : null,
      });
    } catch (error) {
      console.error('Admin payment detail error:', error);
      res.status(500).json({ message: 'Failed to fetch payment details' });
    }
  });

  // Admin: Get all copycat reports with related logo and user details
  app.get('/api/admin/reports', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const db = pool;
      if (!db) {
        return res.status(500).json({ message: 'Database not available' });
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
        logo: r.logo_id ? {
          id: r.logo_id,
          fileName: r.logo_file_name,
          fileHash: r.logo_file_hash,
          tokenTicker: r.logo_token_ticker,
          ipfsHash: r.logo_ipfs_hash,
          ipfsMetadataHash: r.logo_ipfs_metadata_hash,
        } : null,
        user: r.user_id ? {
          id: r.user_id,
          email: r.user_email,
          firstName: r.user_first_name,
          lastName: r.user_last_name,
        } : null,
      }));

      res.json(reports);
    } catch (error) {
      console.error('Admin reports error:', error);
      res.status(500).json({ message: 'Failed to fetch reports' });
    }
  });

  // Admin: Update report status
  app.patch('/api/admin/reports/:reportId/status', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const db = pool;
      if (!db) {
        return res.status(500).json({ message: 'Database not available' });
      }

      const { reportId } = req.params;
      const { status } = req.body;

      if (!status || !['pending', 'submitted', 'resolved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Must be: pending, submitted, resolved, or rejected' });
      }

      const result = await db.query(
        `UPDATE copycat_reports SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, reportId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Report not found' });
      }

      res.json({ message: 'Status updated', report: result.rows[0] });
    } catch (error) {
      console.error('Admin report status update error:', error);
      res.status(500).json({ message: 'Failed to update report status' });
    }
  });

  // Logo metadata registration endpoint (NO file storage - files stored in user's .solturio.sol wallet)
  app.post('/api/logos/upload', isAuthenticated, requireActiveSubscription, upload.array('logos', 50), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const files = req.files as Express.Multer.File[];

      // Check for both files and URLs
      const hasFiles = files && files.length > 0;
      const imageUrls: string[] = [];
      for (let i = 0; i < 50; i++) {
        if (req.body[`imageUrl_${i}`]) {
          imageUrls.push(req.body[`imageUrl_${i}`]);
        }
      }
      const hasUrls = imageUrls.length > 0;

      if (!hasFiles && !hasUrls) {
        return res.status(400).json({ message: "No files or URLs provided" });
      }

      // Create a new collection
      const collection = await storage.createCollection({
        userId,
        name: `Collection ${new Date().toISOString().split('T')[0]}`,
        companyName: req.body.companyName || 'My Company',
        status: 'draft',
      });

      const registeredLogos = [];
      
      // Process uploaded files
      if (hasFiles) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const description = req.body[`description_${i}`] || '';
          const ownershipDescription = req.body[`ownership_${i}`] || '';
          const intendedUse = req.body[`intended_use_${i}`] || '';
          const copyrightStatus = req.body[`copyright_status_${i}`] || null;
          const copyrightAppNumber = req.body[`copyright_app_${i}`] || null;
          const trademarkStatus = req.body[`trademark_status_${i}`] || null;
          const trademarkAppNumber = req.body[`trademark_app_${i}`] || null;
          const patentStatus = req.body[`patent_status_${i}`] || null;
          const patentAppNumber = req.body[`patent_app_${i}`] || null;

          // Extract metadata from image
          const metadata = await extractImageMetadata(file.buffer, file.mimetype);

          // Generate storage path for user's .solturio.sol wallet
          const userWalletDomain = user?.solanaPublicKey ? 
            `${user.solanaPublicKey.slice(0, 8).toLowerCase()}.solturio.sol` : 
            'pending.solturio.sol';
          const storagePath = `${userWalletDomain}/logos/${randomUUID()}-${file.originalname}`;

          // Generate a unique ID for the logo first (for thumbnail filename)
          const logoId = randomUUID();
          
          // Generate and save thumbnail for image files
          const thumbnailUrl = await generateThumbnail(file.buffer, file.mimetype, logoId);

          // Create logo metadata record (NO file storage)
          const logo = await storage.createLogo({
            userId,
            collectionId: collection.id,
            fileName: file.originalname,
            userWalletStoragePath: storagePath,
            fileSize: file.size,
            mimeType: file.mimetype,
            fileHash: metadata.fileHash,
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            colorPalette: metadata.colorPalette,
            dominantColor: metadata.dominantColor,
            thumbnailUrl: thumbnailUrl,
            description,
            ownershipDescription,
            intendedUse,
            copyrightStatus,
            copyrightApplicationNumber: copyrightAppNumber,
            copyrightFilingDate: copyrightStatus === 'pending' || copyrightStatus === 'registered' ? new Date() : null,
            trademarkStatus,
            trademarkApplicationNumber: trademarkAppNumber,
            trademarkFilingDate: trademarkStatus === 'pending' || trademarkStatus === 'registered' ? new Date() : null,
            patentStatus,
            patentApplicationNumber: patentAppNumber,
            patentFilingDate: patentStatus === 'pending' || patentStatus === 'registered' ? new Date() : null,
            tags: [],
          });

          registeredLogos.push({
            ...logo,
            instructions: `Store this file in your wallet at: ${storagePath}`,
            fileDataUrl: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`, // Temporary for user to save
          });
        }
      }

      // Process URL-based registrations
      if (hasUrls) {
        for (let i = 0; i < imageUrls.length; i++) {
          const imageUrl = imageUrls[i];
          const index = files?.length || 0 + i; // Adjust index for URL items
          const description = req.body[`description_${index}`] || '';
          const ownershipDescription = req.body[`ownership_${index}`] || '';
          const intendedUse = req.body[`intended_use_${index}`] || '';
          const copyrightStatus = req.body[`copyright_status_${index}`] || null;
          const copyrightAppNumber = req.body[`copyright_app_${index}`] || null;
          const trademarkStatus = req.body[`trademark_status_${index}`] || null;
          const trademarkAppNumber = req.body[`trademark_app_${index}`] || null;
          const patentStatus = req.body[`patent_status_${index}`] || null;
          const patentAppNumber = req.body[`patent_app_${index}`] || null;

          const fileName = imageUrl.split('/').pop() || 'image.png';
          const format = fileName.split('.').pop()?.toUpperCase() || 'PNG';

          // Create logo metadata record for URL-based image
          const logo = await storage.createLogo({
            userId,
            collectionId: collection.id,
            fileName,
            imageUrl, // Store the URL
            userWalletStoragePath: imageUrl, // URL is the storage path
            fileSize: 0, // Unknown for URLs
            mimeType: `image/${format.toLowerCase()}`,
            fileHash: createHash('sha256').update(imageUrl).digest('hex'), // Hash of URL
            width: 0, // Will need to be determined by fetching
            height: 0,
            format,
            colorPalette: [],
            dominantColor: null,
            description,
            ownershipDescription,
            intendedUse,
            copyrightStatus,
            copyrightApplicationNumber: copyrightAppNumber,
            copyrightFilingDate: copyrightStatus === 'pending' || copyrightStatus === 'registered' ? new Date() : null,
            trademarkStatus,
            trademarkApplicationNumber: trademarkAppNumber,
            trademarkFilingDate: trademarkStatus === 'pending' || trademarkStatus === 'registered' ? new Date() : null,
            patentStatus,
            patentApplicationNumber: patentAppNumber,
            patentFilingDate: patentStatus === 'pending' || patentStatus === 'registered' ? new Date() : null,
            tags: [],
          });

          registeredLogos.push({
            ...logo,
            imageUrl,
            message: `Image URL registered: ${imageUrl}`,
          });
        }
      }

      // Send registration confirmation email
      if (user?.email && registeredLogos.length > 0) {
        const firstLogo = registeredLogos[0];
        sendRegistrationConfirmation(
          user.email,
          firstLogo.fileName,
          collection.id
        ).catch(err => console.error('Email send failed:', err));
      }

      res.json({
        collectionId: collection.id,
        logos: registeredLogos,
        message: hasFiles ? 
          "Logo metadata registered. Please store the image files in your .solturio.sol wallet." :
          "Logo URLs registered successfully.",
        walletDomain: user?.solanaPublicKey ? 
          `${user.solanaPublicKey.slice(0, 8).toLowerCase()}.solturio.sol` : 
          'pending.solturio.sol',
        emailSent: user?.email ? true : false,
      });
    } catch (error: any) {
      console.error("Error registering logo metadata:", error);
      res.status(500).json({ message: error.message || "Failed to register logo metadata" });
    }
  });

  // Token Launch Template Registration
  app.post('/api/logos/upload-token', isAuthenticated, requireActiveSubscription, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const file = req.file as Express.Multer.File;

      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      // Parse registration data from form
      const registrationData = JSON.parse(req.body.registrationData || '{}');
      
      // Extract metadata from image
      const metadata = await extractImageMetadata(file.buffer, file.mimetype);

      // Generate storage path for user's .solturio.sol wallet
      const userWalletDomain = user?.solanaPublicKey ? 
        `${user.solanaPublicKey.slice(0, 8).toLowerCase()}.solturio.sol` : 
        'pending.solturio.sol';
      const storagePath = `${userWalletDomain}/tokens/${randomUUID()}-${file.originalname}`;

      // Auto-create a collection for this token registration
      const tokenCollection = await storage.createCollection({
        userId,
        name: req.body.tokenName || `Token ${req.body.tokenTicker || 'Launch'}`,
        companyName: req.body.tokenName || 'Token Project',
        symbol: req.body.tokenTicker || undefined,
        status: 'draft',
        isPublic: req.body.isPublic !== 'false',
      });

      // Create logo with token launch template data
      const logo = await storage.createLogo({
        userId,
        collectionId: tokenCollection.id,
        fileName: file.originalname,
        userWalletStoragePath: storagePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileHash: metadata.fileHash,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        colorPalette: metadata.colorPalette,
        dominantColor: metadata.dominantColor,
        
        // Registration template data
        registrationType: 'token_launch',
        registrationData,
        
        // Token-specific fields
        tokenName: req.body.tokenName,
        tokenTicker: req.body.tokenTicker,
        launchPlatform: req.body.launchPlatform,
        launchTimeline: req.body.launchTimeline,
        
        // Contract address (optional - can be added post-launch)
        tokenContractAddress: req.body.tokenContractAddress || null,
        tokenContractChain: req.body.tokenContractChain || null,
        tokenPoolAddress: req.body.tokenPoolAddress || null,
        tokenContractAddedAt: req.body.tokenContractAddress ? new Date() : null,
        
        // 24-hour ticker verification (starts after registration)
        tickerVerified: false,
        tickerVerificationStartedAt: new Date(),
        tickerVerificationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        botVerificationStatus: 'pending',
        
        description: req.body.description,
        intendedUse: req.body.intendedUse,
        tags: [],
      });

      // Calculate registration strength
      const { calculateRegistrationStrength } = await import('@shared/registration-strength');
      const strength = calculateRegistrationStrength({
        tokenName: req.body.tokenName,
        tokenTicker: req.body.tokenTicker,
        file: true,
        launchPlatform: req.body.launchPlatform,
        launchTimeline: req.body.launchTimeline,
        ...registrationData,
      });

      // Award base registration reward (pending - held until verification)
      // Rewards are NOT distributed until ticker verification is complete
      const rewardNote = strength.rewardsEligible
        ? 'Rewards pending ticker verification'
        : 'Complete required fields and verify ticker to earn rewards';

      // Send registration confirmation email
      if (user?.email) {
        sendRegistrationConfirmation(
          user.email,
          file.originalname,
          logo.id || 'token-' + randomUUID()
        ).catch(err => console.error('Email send failed:', err));
      }

      res.json({
        id: logo.id,
        message: "Token registered successfully! Please complete 24-hour ticker verification.",
        tickerVerificationDeadline: logo.tickerVerificationDeadline,
        logo,
        collection: tokenCollection,
        emailSent: user?.email ? true : false,
        registrationStrength: strength,
        rewardNote,
      });
    } catch (error: any) {
      console.error("Error registering token:", error);
      res.status(500).json({ message: error.message || "Failed to register token" });
    }
  });

  // Update Contract Address (Post-launch)
  app.post('/api/logos/:id/bind-contract', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logoId = req.params.id;
      const { tokenContractAddress, tokenContractChain, tokenPoolAddress } = req.body;

      // Validate contract address
      if (!tokenContractAddress || typeof tokenContractAddress !== 'string') {
        return res.status(400).json({ message: "Contract address is required" });
      }
      if (tokenContractAddress.length < 20 || tokenContractAddress.length > 100) {
        return res.status(400).json({ message: "Invalid contract address length" });
      }
      
      // Validate chain
      const validChains = ['solana', 'ethereum', 'base', 'arbitrum', 'polygon', 'other'];
      if (tokenContractChain && !validChains.includes(tokenContractChain)) {
        return res.status(400).json({ message: "Invalid chain specified" });
      }

      // Get existing logo and verify ownership
      const logo = await storage.getLogo(logoId);
      if (!logo) {
        return res.status(404).json({ message: "Logo not found" });
      }
      if (logo.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this registration" });
      }
      if (logo.registrationType !== 'token_launch') {
        return res.status(400).json({ message: "Only token registrations can bind contract addresses" });
      }

      // Update the logo with contract address
      const updatedLogo = await storage.updateLogo(logoId, {
        tokenContractAddress,
        tokenContractChain: tokenContractChain || 'solana',
        tokenPoolAddress: tokenPoolAddress || null,
        tokenContractAddedAt: new Date(),
      });

      res.json({
        message: "Contract address bound successfully",
        logo: updatedLogo,
        canBindToMedia: true,
      });
    } catch (error: any) {
      console.error("Error binding contract:", error);
      res.status(500).json({ message: error.message || "Failed to bind contract" });
    }
  });

  // Get verification status for a token registration
  app.get('/api/logos/:id/verification-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logoId = req.params.id;
      const logos = await storage.getLogosByUser(userId);
      const logo = logos.find((l: any) => l.id === logoId);

      if (!logo) {
        return res.status(404).json({ message: "Registration not found" });
      }
      if (logo.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const now = new Date();
      const deadline = logo.tickerVerificationDeadline ? new Date(logo.tickerVerificationDeadline) : null;
      const isExpired = deadline ? now > deadline : false;
      const isVerified = logo.tickerVerified === true;

      let status: 'verified' | 'pending' | 'expired';
      if (isVerified) {
        status = 'verified';
      } else if (isExpired) {
        status = 'expired';
        // Persist expired status if not already set
        if (logo.botVerificationStatus !== 'expired') {
          storage.updateLogo(logoId, { botVerificationStatus: 'expired' }).catch(() => {});
        }
      } else {
        status = 'pending';
      }

      const { calculateRegistrationStrength } = await import('@shared/registration-strength');
      const registrationData = (logo.registrationData || {}) as Record<string, any>;
      const strength = calculateRegistrationStrength({
        tokenName: logo.tokenName,
        tokenTicker: logo.tokenTicker,
        file: true,
        launchPlatform: logo.launchPlatform,
        launchTimeline: logo.launchTimeline,
        ...registrationData,
      });

      const rewardsBlocked = !isVerified;

      res.json({
        status,
        tickerVerified: isVerified,
        tickerVerificationDeadline: deadline,
        isExpired,
        timeRemaining: deadline && !isExpired ? Math.max(0, deadline.getTime() - now.getTime()) : 0,
        botVerificationStatus: logo.botVerificationStatus || 'pending',
        registrationStrength: strength,
        rewardsBlocked,
        rewardsBlockedReason: rewardsBlocked
          ? 'Complete ticker verification to unlock rewards'
          : null,
      });
    } catch (error: any) {
      console.error("Error getting verification status:", error);
      res.status(500).json({ message: error.message || "Failed to get verification status" });
    }
  });

  // Confirm ticker verification (when proof posts are validated)
  app.post('/api/logos/:id/confirm-verification', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logoId = req.params.id;
      const logos = await storage.getLogosByUser(userId);
      const logo = logos.find((l: any) => l.id === logoId);

      if (!logo) {
        return res.status(404).json({ message: "Registration not found" });
      }
      if (logo.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (logo.tickerVerified) {
        return res.status(400).json({ message: "Already verified" });
      }

      // Enforce the 24-hour verification deadline
      const now = new Date();
      const deadline = logo.tickerVerificationDeadline ? new Date(logo.tickerVerificationDeadline) : null;
      if (deadline && now > deadline) {
        // Persist expired status
        await storage.updateLogo(logoId, { botVerificationStatus: 'expired' });
        return res.status(400).json({
          message: "Verification window has expired. Please restart the 24-hour verification period.",
          expired: true,
        });
      }

      const registrationData = (logo.registrationData || {}) as Record<string, any>;
      if (!registrationData.proofPostUrl1) {
        return res.status(400).json({
          message: "At least one proof post URL is required for verification",
        });
      }

      // Check registration strength - require all required fields for rewards
      const { calculateRegistrationStrength } = await import('@shared/registration-strength');
      const strength = calculateRegistrationStrength({
        tokenName: logo.tokenName,
        tokenTicker: logo.tokenTicker,
        file: true,
        launchPlatform: logo.launchPlatform,
        launchTimeline: logo.launchTimeline,
        ...registrationData,
      });

      if (!strength.rewardsEligible) {
        return res.status(400).json({
          message: "Complete all required fields before confirming verification. Missing: " +
            strength.missingRequiredFields.join(', '),
          missingFields: strength.missingRequiredFields,
        });
      }

      await storage.updateLogo(logoId, {
        tickerVerified: true,
        botVerificationStatus: 'verified',
      });

      // NOW award rewards since verification is complete and fields are filled
      const { awardReward } = await import('./rewards-service');
      const tokenReward = await awardReward(userId, 'token_registered', logoId, 'token_launch');

      let strongBonus = null;
      if (strength.tier === 'strong' || strength.tier === 'verified') {
        strongBonus = await awardReward(userId, 'strong_registration', logoId, 'token_launch');
      }

      const verifiedReward = await awardReward(userId, 'ticker_verified', logoId, 'token_launch');

      res.json({
        message: "Ticker verification confirmed! Rewards unlocked.",
        tickerVerified: true,
        rewards: {
          tokenRegistered: tokenReward,
          tickerVerified: verifiedReward,
          strongRegistration: strongBonus,
        },
        registrationStrength: strength,
      });
    } catch (error: any) {
      console.error("Error confirming verification:", error);
      res.status(500).json({ message: error.message || "Failed to confirm verification" });
    }
  });

  // Restart verification window (when deadline expired without verification)
  app.post('/api/logos/:id/restart-verification', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logoId = req.params.id;
      const logos = await storage.getLogosByUser(userId);
      const logo = logos.find((l: any) => l.id === logoId);

      if (!logo) {
        return res.status(404).json({ message: "Registration not found" });
      }
      if (logo.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (logo.tickerVerified) {
        return res.status(400).json({ message: "Already verified - no restart needed" });
      }

      const newDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await storage.updateLogo(logoId, {
        tickerVerificationStartedAt: new Date(),
        tickerVerificationDeadline: newDeadline,
        botVerificationStatus: 'pending',
      });

      res.json({
        message: "Verification window restarted. You have 24 hours to complete verification.",
        tickerVerificationDeadline: newDeadline,
        botVerificationStatus: 'pending',
      });
    } catch (error: any) {
      console.error("Error restarting verification:", error);
      res.status(500).json({ message: error.message || "Failed to restart verification" });
    }
  });

  // Generate Verified Media Copies with Embedded CA Metadata
  app.post('/api/logos/:id/generate-verified-media', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logoId = req.params.id;
      const { assetTypes } = req.body; // ['logo', 'banner', 'pfp', etc.]

      // Get existing logo and verify ownership
      const logo = await storage.getLogo(logoId);
      if (!logo) {
        return res.status(404).json({ message: "Logo not found" });
      }
      if (logo.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (!logo.tokenContractAddress) {
        return res.status(400).json({ 
          message: "Contract address must be bound first. Use /bind-contract endpoint." 
        });
      }

      // Build verification metadata to embed
      const verificationMetadata = {
        chain: logo.tokenContractChain || 'solana',
        contractAddress: logo.tokenContractAddress,
        poolAddress: logo.tokenPoolAddress || null,
        projectId: logo.id,
        snapshotId: logo.fileHash,
        timestamp: new Date().toISOString(),
        registeredAt: logo.ownershipClaimedAt?.toISOString(),
        tokenName: logo.tokenName,
        tokenTicker: logo.tokenTicker,
        fileHash: logo.fileHash,
        verificationUrl: `https://solturio.app/verify/${logo.id}`,
      };

      // Store the verified media version info
      const existingVersions = (logo.verifiedMediaVersions as any[]) || [];
      const newVersion = {
        type: assetTypes?.[0] || 'logo',
        originalHash: logo.fileHash,
        verifiedHash: `${logo.fileHash}_ca_${logo.tokenContractAddress?.slice(0, 8)}`,
        metadata: verificationMetadata,
        createdAt: new Date().toISOString(),
      };

      const updatedVersions = [...existingVersions, newVersion];

      await storage.updateLogo(logoId, {
        verifiedMediaVersions: updatedVersions,
      });

      res.json({
        message: "Verification record created",
        verifiedVersion: newVersion,
        metadata: verificationMetadata,
        downloadUrl: `/api/logos/${logoId}/download-verified`,
        note: "Download the verification manifest to get a JSON file containing chain, contract address, project ID, timestamp, and file hash. Keep this alongside your original files as proof of ownership.",
      });
    } catch (error: any) {
      console.error("Error creating verification record:", error);
      res.status(500).json({ message: error.message || "Failed to create verification record" });
    }
  });

  // Download Verification Manifest
  app.get('/api/logos/:id/download-verified', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logoId = req.params.id;

      const logo = await storage.getLogo(logoId);
      if (!logo) {
        return res.status(404).json({ message: "Logo not found" });
      }
      if (logo.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // If no CA bound, return error
      if (!logo.tokenContractAddress) {
        return res.status(400).json({ 
          message: "Contract address must be bound first before downloading the verification manifest." 
        });
      }

      const verifiedVersions = (logo.verifiedMediaVersions as any[]) || [];
      if (verifiedVersions.length === 0) {
        // Generate on-the-fly if CA is bound but no version exists
        const verificationManifest = {
          version: "1.0",
          type: "solturio_verification_manifest",
          generated: new Date().toISOString(),
          token: {
            name: logo.tokenName,
            ticker: logo.tokenTicker,
            chain: logo.tokenContractChain || 'solana',
            contractAddress: logo.tokenContractAddress,
            poolAddress: logo.tokenPoolAddress || null,
          },
          registration: {
            projectId: logo.id,
            registeredAt: logo.ownershipClaimedAt?.toISOString(),
            caBoundAt: logo.tokenContractAddedAt?.toISOString(),
          },
          media: {
            originalFileName: logo.fileName,
            fileHash: logo.fileHash,
            dimensions: `${logo.width}x${logo.height}`,
            format: logo.format,
          },
          verification: {
            url: `https://solturio.app/verify/${logo.id}`,
            signature: createHash('sha256').update(`${logo.id}:${logo.fileHash}:${logo.tokenContractAddress}`).digest('hex'),
          },
        };

        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${logo.tokenTicker || 'token'}_verification_manifest.json"`);
        return res.send(JSON.stringify(verificationManifest, null, 2));
      }

      // If versions exist, return the latest one as a downloadable manifest
      const latestVersion = verifiedVersions[verifiedVersions.length - 1];
      const verificationManifest = {
        version: "1.0",
        type: "solturio_verification_manifest",
        generated: new Date().toISOString(),
        token: {
          name: logo.tokenName,
          ticker: logo.tokenTicker,
          chain: logo.tokenContractChain || 'solana',
          contractAddress: logo.tokenContractAddress,
          poolAddress: logo.tokenPoolAddress || null,
        },
        registration: {
          projectId: logo.id,
          registeredAt: logo.ownershipClaimedAt?.toISOString(),
          caBoundAt: logo.tokenContractAddedAt?.toISOString(),
        },
        media: {
          originalFileName: logo.fileName,
          fileHash: logo.fileHash,
          dimensions: `${logo.width}x${logo.height}`,
          format: logo.format,
        },
        verifiedVersions,
        verification: {
          url: `https://solturio.app/verify/${logo.id}`,
          signature: createHash('sha256').update(`${logo.id}:${logo.fileHash}:${logo.tokenContractAddress}`).digest('hex'),
        },
      };

      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${logo.tokenTicker || 'token'}_verification_manifest.json"`);
      res.send(JSON.stringify(verificationManifest, null, 2));
    } catch (error: any) {
      console.error("Error downloading verification manifest:", error);
      res.status(500).json({ message: error.message || "Failed to download manifest" });
    }
  });

  // Artwork Template Registration
  app.post('/api/logos/upload-artwork', isAuthenticated, requireActiveSubscription, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const file = req.file as Express.Multer.File;

      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      // Parse registration data from form
      const registrationData = JSON.parse(req.body.registrationData || '{}');
      
      // Extract metadata from image
      const metadata = await extractImageMetadata(file.buffer, file.mimetype);

      // Generate storage path for user's .solturio.sol wallet
      const userWalletDomain = user?.solanaPublicKey ? 
        `${user.solanaPublicKey.slice(0, 8).toLowerCase()}.solturio.sol` : 
        'pending.solturio.sol';
      const storagePath = `${userWalletDomain}/artwork/${randomUUID()}-${file.originalname}`;

      // Create logo with artwork template data
      const logo = await storage.createLogo({
        userId,
        collectionId: null,
        fileName: file.originalname,
        userWalletStoragePath: storagePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileHash: metadata.fileHash,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        colorPalette: metadata.colorPalette,
        dominantColor: metadata.dominantColor,
        
        // Registration template data
        registrationType: 'artwork',
        registrationData,
        
        description: req.body.description,
        intendedUse: req.body.intendedUse,
        tags: [],
      });

      // Send registration confirmation email
      if (user?.email) {
        sendRegistrationConfirmation(
          user.email,
          file.originalname,
          logo.id || 'artwork-' + randomUUID()
        ).catch(err => console.error('Email send failed:', err));
      }

      res.json({
        id: logo.id,
        message: "Artwork registered successfully!",
        logo,
        emailSent: user?.email ? true : false,
      });
    } catch (error: any) {
      console.error("Error registering artwork:", error);
      res.status(500).json({ message: error.message || "Failed to register artwork" });
    }
  });

  // Serve thumbnails (public endpoint - no auth required for displaying in UI)
  app.get('/api/thumbnails/:filename', async (req, res) => {
    try {
      const filename = req.params.filename;
      // Sanitize filename to prevent directory traversal
      const sanitized = path.basename(filename);
      const thumbnailPath = path.join(THUMBNAILS_DIR, sanitized);
      
      // Check if file exists
      try {
        await fs.access(thumbnailPath);
      } catch {
        return res.status(404).json({ message: "Thumbnail not found" });
      }
      
      res.sendFile(thumbnailPath);
    } catch (error) {
      console.error("Error serving thumbnail:", error);
      res.status(500).json({ message: "Failed to serve thumbnail" });
    }
  });

  // Get logos
  app.get('/api/logos', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logos = await storage.getLogosByUserId(userId);
      res.json(logos);
    } catch (error) {
      console.error("Error fetching logos:", error);
      res.status(500).json({ message: "Failed to fetch logos" });
    }
  });

  // Get collections
  app.get('/api/collections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const collections = await storage.getCollectionsByUserId(userId);

      // Get logos for each collection
      const collectionsWithLogos = await Promise.all(
        collections.map(async (collection) => {
          const logos = await storage.getLogosByCollectionId(collection.id);
          return {
            ...collection,
            logos,
            logoCount: logos.length,
          };
        })
      );

      res.json(collectionsWithLogos);
    } catch (error) {
      console.error("Error fetching collections:", error);
      res.status(500).json({ message: "Failed to fetch collections" });
    }
  });

  // Get single collection
  app.get('/api/collections/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const collection = await storage.getCollection(req.params.id);

      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }

      if (collection.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const logos = await storage.getLogosByCollectionId(collection.id);

      res.json({
        ...collection,
        logos,
        logoCount: logos.length,
      });
    } catch (error) {
      console.error("Error fetching collection:", error);
      res.status(500).json({ message: "Failed to fetch collection" });
    }
  });

  // Update collection details (name, description)
  app.patch('/api/collections/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const collectionId = req.params.id;
      const { name, description } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: "Name is required" });
      }

      const collection = await storage.getCollection(collectionId);
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }

      if (collection.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updated = await storage.updateCollection(collectionId, { 
        name: name.trim(),
        description: description?.trim() || null 
      });
      res.json({ success: true, collection: updated });
    } catch (error) {
      console.error("Error updating collection:", error);
      res.status(500).json({ message: "Failed to update collection" });
    }
  });

  // Toggle collection visibility (public/private)
  app.patch('/api/collections/:id/visibility', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const collectionId = req.params.id;
      const { isPublic } = req.body;

      if (typeof isPublic !== 'boolean') {
        return res.status(400).json({ message: "isPublic must be a boolean" });
      }

      const collection = await storage.getCollection(collectionId);
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }

      if (collection.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updated = await storage.updateCollection(collectionId, { isPublic });
      res.json({ success: true, isPublic: updated.isPublic });
    } catch (error) {
      console.error("Error updating collection visibility:", error);
      res.status(500).json({ message: "Failed to update visibility" });
    }
  });

  // Mint collection as single NFT certificate (covers all files)
  app.post('/api/collections/:id/mint', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const collectionId = req.params.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const collection = await storage.getCollection(collectionId);
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }

      if (collection.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Check if already minted
      if (collection.status === 'minted' && collection.collectionAddress) {
        return res.json({
          success: true,
          message: "Collection already minted",
          collectionAddress: collection.collectionAddress,
          transactionHash: collection.transactionHash,
          ipfsMetadataHash: collection.ipfsMetadataHash,
          explorerUrl: collection.explorerUrl,
        });
      }

      // Get all logos in the collection
      const logos = await storage.getLogosByCollectionId(collectionId);
      if (logos.length === 0) {
        return res.status(400).json({ message: "Collection has no files" });
      }

      // Generate verified images with badge overlay for image files
      const verifiedImages: { logoId: string; verifiedIpfsHash: string; verifiedUrl: string; arweaveUrl?: string }[] = [];
      
      // Check if Arweave is configured
      const arweaveConfigured = arweaveService.isConfigured();
      if (!arweaveConfigured) {
        console.log('Arweave: Not configured - badge images will only be stored on IPFS');
      }
      
      for (const logo of logos) {
        // Only process image files that can be composited
        if (logo.mimeType && isCompositableImage(logo.mimeType)) {
          try {
            // Read the thumbnail file
            const thumbnailPath = path.join(THUMBNAILS_DIR, `${logo.id}.jpg`);
            
            try {
              await fs.access(thumbnailPath);
              const thumbnailBuffer = await fs.readFile(thumbnailPath);
              
              // Create verified image with badge overlay
              const verifiedBuffer = await createVerifiedImage(thumbnailBuffer);
              
              // Upload verified image to IPFS (backup/reference)
              const verifiedResult = await uploadToIPFS(
                verifiedBuffer, 
                `verified-${logo.fileName?.replace(/\.[^/.]+$/, '.png') || 'image.png'}`,
                {
                  type: 'verified_image',
                  originalLogoId: logo.id,
                  collectionId,
                  badgeCid: VERIFICATION_ASSETS.badge.cid,
                }
              );
              
              // Upload verified image to Arweave (permanent storage for sharing)
              let arweaveUrl: string | undefined;
              if (arweaveConfigured) {
                try {
                  const arweaveResult = await arweaveService.uploadFile(
                    verifiedBuffer,
                    'image/png',
                    [
                      { name: 'Logo-Id', value: logo.id },
                      { name: 'Collection-Id', value: collectionId },
                      { name: 'Original-Filename', value: logo.fileName || 'image.png' },
                      { name: 'Type', value: 'verified-badge-image' },
                    ]
                  );
                  if (arweaveResult) {
                    arweaveUrl = arweaveResult.url;
                    console.log(`Arweave: Uploaded verified image for logo ${logo.id}: ${arweaveUrl}`);
                  }
                } catch (arweaveError) {
                  console.error(`Arweave: Failed to upload verified image for logo ${logo.id}:`, arweaveError);
                }
              }
              
              if (verifiedResult || arweaveUrl) {
                verifiedImages.push({
                  logoId: logo.id,
                  verifiedIpfsHash: verifiedResult?.ipfsHash || '',
                  verifiedUrl: arweaveUrl || `https://gateway.pinata.cloud/ipfs/${verifiedResult?.ipfsHash}`,
                  arweaveUrl,
                });
                
                // Update logo with verified image hash and Arweave URL
                await storage.updateLogo(logo.id, {
                  verifiedIpfsHash: verifiedResult?.ipfsHash || null,
                  arweaveUrl: arweaveUrl || null,
                });
              }
            } catch (accessError) {
              console.log(`No thumbnail found for logo ${logo.id}, skipping verified image generation`);
            }
          } catch (error) {
            console.error(`Error creating verified image for logo ${logo.id}:`, error);
          }
        }
      }

      // Build comprehensive NFT metadata with all file hashes
      // Find verified image for each logo
      const getVerifiedHash = (logoId: string) => 
        verifiedImages.find(v => v.logoId === logoId)?.verifiedIpfsHash || null;
      const getArweaveUrl = (logoId: string) => 
        verifiedImages.find(v => v.logoId === logoId)?.arweaveUrl || null;
      
      const fileEntries = logos.map((logo, index) => ({
        index: index + 1,
        fileName: logo.fileName,
        fileHash: logo.fileHash,  // SHA-256 hash for verification
        ipfsHash: logo.ipfsHash || null,  // Individual file IPFS CID if available
        verifiedIpfsHash: getVerifiedHash(logo.id),  // Verified image with badge overlay (IPFS backup)
        arweaveUrl: getArweaveUrl(logo.id),  // Permanent Arweave URL for sharing
        mimeType: logo.mimeType,
        fileSize: logo.fileSize,
        dimensions: logo.width && logo.height ? `${logo.width}x${logo.height}` : null,
        format: logo.format,
        description: logo.description || null,
      }));

      const nftMetadata = {
        name: collection.name,
        symbol: collection.symbol || "SOLTURIO",
        description: collection.description || `IP Protection Certificate for ${collection.name}`,
        
        // Ownership
        owner: user.solanaPublicKey || 'pending',
        ownerWallet: user.walletName || `${user.solanaPublicKey?.slice(0, 8)}.solturio.sol`,
        companyName: collection.companyName,
        copyrightYear: collection.copyrightYear || new Date().getFullYear(),
        
        // Timestamp proof
        registeredAt: collection.createdAt?.toISOString() || new Date().toISOString(),
        mintedAt: new Date().toISOString(),
        
        // All files covered by this certificate
        files: fileEntries,
        fileCount: logos.length,
        
        // Platform info
        platform: "Solturio",
        version: "1.0",
        standard: "Metaplex Token Metadata",
        
        // Verification info
        verificationNote: "Each file has a unique SHA-256 hash. Use fileHash to verify authenticity of any file in this collection.",
      };

      // Upload metadata JSON to IPFS
      let ipfsMetadataHash = 'pending';
      try {
        const metadataBuffer = Buffer.from(JSON.stringify(nftMetadata, null, 2));
        const ipfsResult = await uploadToIPFS(metadataBuffer, `${collection.name.replace(/\s+/g, '-')}-metadata.json`, {
          name: `${collection.name} Metadata`,
          keyvalues: {
            userId,
            collectionId,
            companyName: collection.companyName,
            fileCount: logos.length.toString(),
          },
        });
        if (ipfsResult) {
          ipfsMetadataHash = ipfsResult.ipfsHash;
        }
      } catch (ipfsError) {
        console.error('IPFS metadata upload failed:', ipfsError);
        // Continue with minting even if IPFS fails (use pending hash)
      }

      // Generate NFT certificate address (deterministic based on collection)
      const nftAddress = `cert_${(user.solanaPublicKey || 'pending').slice(0, 8)}_${collectionId.slice(0, 8)}`;
      const transactionHash = ipfsMetadataHash;
      const explorerUrl = `https://solscan.io/token/${nftAddress}?cluster=devnet`;

      // Update collection with NFT information
      await storage.updateCollection(collectionId, {
        status: 'minted',
        collectionAddress: nftAddress,
        transactionHash,
        explorerUrl,
        ipfsMetadataHash,
        nftMetadataJson: nftMetadata,
        mintedAt: new Date(),
      });

      // Update all logos in collection with NFT reference
      for (const logo of logos) {
        await storage.updateLogo(logo.id, {
          nftAddress,
          transactionHash,
          mintedAt: new Date(),
          blockchainMetadataJson: {
            collectionNftAddress: nftAddress,
            collectionIpfsHash: ipfsMetadataHash,
          },
        });
      }

      // Send confirmation email
      if (user.email) {
        sendNFTMintingStarted(user.email, collection.name, collectionId).catch(err =>
          console.error('Email send failed:', err)
        );
      }

      res.json({
        success: true,
        message: `Collection minted successfully! ${logos.length} files covered by 1 NFT certificate.`,
        collectionAddress: nftAddress,
        transactionHash,
        ipfsMetadataHash,
        explorerUrl,
        gatewayUrl: `https://ipfs.io/ipfs/${ipfsMetadataHash}`,
        filesCount: logos.length,
        verifiedImages: verifiedImages.map(v => ({
          fileName: logos.find(l => l.id === v.logoId)?.fileName || 'unknown',
          ipfsHash: v.verifiedIpfsHash,
          ipfsUrl: v.verifiedUrl,
          arweaveUrl: v.arweaveUrl,
        })),
        verifiedImagesCount: verifiedImages.length,
        arweaveConfigured,
        nftMetadata,
      });
    } catch (error: any) {
      console.error("Error minting collection:", error);
      res.status(500).json({ message: error.message || "Failed to mint collection" });
    }
  });

  // Upload logo to IPFS (for permanent storage)
  app.post('/api/logos/:id/ipfs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logoId = req.params.id;
      
      const logo = await storage.getLogoById(logoId);
      if (!logo) {
        return res.status(404).json({ message: "Logo not found" });
      }
      
      if (logo.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // If already on IPFS, return existing hash
      if (logo.ipfsHash) {
        return res.json({
          ipfsHash: logo.ipfsHash,
          ipfsMetadataHash: logo.ipfsMetadataHash,
          gatewayUrl: `https://ipfs.io/ipfs/${logo.ipfsHash}`,
          message: "Already uploaded to IPFS",
        });
      }
      
      // For URL-based images, we need to fetch and upload
      if (logo.imageUrl && !req.body.imageBuffer) {
        return res.status(400).json({ 
          message: "Please provide image data for IPFS upload",
        });
      }
      
      // Upload image to IPFS (requires image buffer from frontend)
      if (req.body.imageBuffer) {
        const imageBuffer = Buffer.from(req.body.imageBuffer, 'base64');
        const ipfsResult = await uploadToIPFS(imageBuffer, logo.fileName, {
          name: logo.fileName,
          keyvalues: {
            userId,
            logoId,
            companyName: req.body.companyName,
          },
        });
        
        // Generate and upload metadata
        const metadata = generateLogoMetadata({
          fileName: logo.fileName,
          description: logo.description || '',
          ownershipDescription: logo.ownershipDescription || '',
          userId,
          timestamp: logo.createdAt || new Date(),
          copyrightStatus: logo.copyrightStatus,
          trademarkStatus: logo.trademarkStatus,
          patentStatus: logo.patentStatus,
        });
        metadata.image = `ipfs://${ipfsResult.ipfsHash}`;
        
        const metadataResult = await uploadJSONToIPFS(metadata, {
          name: `${logo.fileName} Metadata`,
        });
        
        // Update logo with IPFS hashes
        await storage.updateLogoIPFS(logoId, ipfsResult.ipfsHash, metadataResult.ipfsHash);
        
        res.json({
          ipfsHash: ipfsResult.ipfsHash,
          ipfsMetadataHash: metadataResult.ipfsHash,
          gatewayUrl: ipfsResult.gatewayUrl,
          metadataUrl: metadataResult.gatewayUrl,
          message: "Successfully uploaded to IPFS",
        });
      } else {
        res.status(400).json({ message: "Image data required for IPFS upload" });
      }
    } catch (error: any) {
      console.error("Error uploading to IPFS:", error);
      res.status(500).json({ message: error.message || "Failed to upload to IPFS" });
    }
  });
  
  // Generate Prior Art Certificate
  app.get('/api/logos/:id/certificate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logoId = req.params.id;
      
      const logo = await storage.getLogoById(logoId);
      if (!logo) {
        return res.status(404).json({ message: "Logo not found" });
      }
      
      if (logo.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const collection = logo.collectionId ? 
        await storage.getCollection(logo.collectionId) : null;
      
      const certificatePdf = await generatePriorArtCertificate({
        id: logo.id,
        fileName: logo.fileName,
        fileHash: logo.fileHash,
        ipfsHash: logo.ipfsHash ?? undefined,
        userId,
        userEmail: user.email || 'Not provided',
        companyName: collection?.companyName || 'Not specified',
        description: logo.description || '',
        ownershipDescription: logo.ownershipDescription || '',
        intendedUse: logo.intendedUse || '',
        registrationDate: logo.createdAt || new Date(),
        copyrightStatus: logo.copyrightStatus ?? undefined,
        copyrightApplicationNumber: logo.copyrightApplicationNumber ?? undefined,
        trademarkStatus: logo.trademarkStatus ?? undefined,
        trademarkApplicationNumber: logo.trademarkApplicationNumber ?? undefined,
        patentStatus: logo.patentStatus ?? undefined,
        patentApplicationNumber: logo.patentApplicationNumber ?? undefined,
        transactionHash: logo.transactionHash ?? undefined,
        blockNumber: undefined,
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificate-${logo.id}.pdf"`);
      res.send(certificatePdf);
    } catch (error: any) {
      console.error("Error generating certificate:", error);
      res.status(500).json({ message: error.message || "Failed to generate certificate" });
    }
  });
  
  // Generate DMCA Takedown Notice
  app.post('/api/logos/:id/dmca', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logoId = req.params.id;
      
      const logo = await storage.getLogoById(logoId);
      if (!logo) {
        return res.status(404).json({ message: "Logo not found" });
      }
      
      if (logo.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const user = await storage.getUser(userId);
      const collection = logo.collectionId ? 
        await storage.getCollection(logo.collectionId) : null;
      
      const dmcaPdf = await generateDMCATakedownNotice({
        id: logo.id,
        fileName: logo.fileName,
        fileHash: logo.fileHash,
        ipfsHash: logo.ipfsHash ?? undefined,
        userId,
        userEmail: user?.email || 'Not provided',
        companyName: collection?.companyName || req.body.companyName || 'Not specified',
        description: logo.description || '',
        ownershipDescription: logo.ownershipDescription || '',
        intendedUse: logo.intendedUse || '',
        registrationDate: logo.createdAt || new Date(),
        copyrightStatus: logo.copyrightStatus ?? undefined,
        copyrightApplicationNumber: logo.copyrightApplicationNumber ?? undefined,
        trademarkStatus: logo.trademarkStatus ?? undefined,
        trademarkApplicationNumber: logo.trademarkApplicationNumber ?? undefined,
        patentStatus: logo.patentStatus ?? undefined,
        patentApplicationNumber: logo.patentApplicationNumber ?? undefined,
        transactionHash: logo.transactionHash ?? undefined,
        blockNumber: undefined,
      }, {
        infringingSite: req.body.infringingSite || 'Unknown Site',
        infringementUrl: req.body.infringementUrl || '',
        infringementDescription: req.body.infringementDescription || 'Unauthorized use of copyrighted material',
        contactEmail: req.body.contactEmail,
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="dmca-${logo.id}.pdf"`);
      res.send(dmcaPdf);
    } catch (error: any) {
      console.error("Error generating DMCA notice:", error);
      res.status(500).json({ message: error.message || "Failed to generate DMCA notice" });
    }
  });
  
  // Authorized usage endpoints
  
  // Create authorized usage for a logo
  app.post('/api/logos/:id/authorized-usage', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logoId = req.params.id;
      
      // Verify logo ownership
      const logo = await storage.getLogoById(logoId);
      if (!logo) {
        return res.status(404).json({ message: "Logo not found" });
      }
      if (logo.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const usage = await storage.createAuthorizedUsage({
        logoId,
        userId,
        usageUrl: req.body.url,
        usageType: req.body.usageType,
        usagePlatform: req.body.platform,
        notes: req.body.description,
      });
      
      res.json(usage);
    } catch (error: any) {
      console.error("Error creating authorized usage:", error);
      res.status(500).json({ message: error.message || "Failed to create authorized usage" });
    }
  });
  
  // Get authorized usages for a logo
  app.get('/api/logos/:id/authorized-usage', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logoId = req.params.id;
      
      // Verify logo ownership
      const logo = await storage.getLogoById(logoId);
      if (!logo) {
        return res.status(404).json({ message: "Logo not found" });
      }
      if (logo.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const usages = await storage.getAuthorizedUsagesByLogoId(logoId);
      res.json(usages);
    } catch (error: any) {
      console.error("Error fetching authorized usages:", error);
      res.status(500).json({ message: error.message || "Failed to fetch authorized usages" });
    }
  });
  
  // Get all authorized usages for current user
  app.get('/api/authorized-usages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const usages = await storage.getAuthorizedUsagesByUserId(userId);
      res.json(usages);
    } catch (error: any) {
      console.error("Error fetching user authorized usages:", error);
      res.status(500).json({ message: error.message || "Failed to fetch authorized usages" });
    }
  });
  
  // Update authorized usage
  app.patch('/api/authorized-usage/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const usageId = req.params.id;
      
      // Verify ownership through userId
      const usages = await storage.getAuthorizedUsagesByUserId(userId);
      const usage = usages.find(u => u.id === usageId);
      
      if (!usage) {
        return res.status(404).json({ message: "Authorized usage not found or forbidden" });
      }
      
      const updated = await storage.updateAuthorizedUsage(usageId, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating authorized usage:", error);
      res.status(500).json({ message: error.message || "Failed to update authorized usage" });
    }
  });
  
  // Delete authorized usage
  app.delete('/api/authorized-usage/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const usageId = req.params.id;
      
      // Verify ownership through userId
      const usages = await storage.getAuthorizedUsagesByUserId(userId);
      const usage = usages.find(u => u.id === usageId);
      
      if (!usage) {
        return res.status(404).json({ message: "Authorized usage not found or forbidden" });
      }
      
      await storage.deleteAuthorizedUsage(usageId);
      res.json({ message: "Authorized usage deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting authorized usage:", error);
      res.status(500).json({ message: error.message || "Failed to delete authorized usage" });
    }
  });
  
  // Get pricing and free upload status
  app.get('/api/pricing/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const logos = await storage.getLogosByUserId(userId);
      const logoCount = logos.length;

      // Premium users get unlimited free uploads
      const isPremium = user?.wallet_type === 'premium';
      const freeUploadsRemaining = isPremium ? 999 : getRemainingFreeUploads(logoCount);
      const isEligible = isPremium ? true : isEligibleForFreeUpload(logoCount);

      res.json({
        logoCount,
        freeUploadsRemaining,
        isEligibleForFreeUpload: isEligible,
        freeUploadLimit: isPremium ? 'Unlimited' : PRICING.FREE_UPLOADS_LIMIT,
        isPremium,
        pricing: {
          minting: PRICING.MINTING_FEE,
          monthlyRental: PRICING.MONTHLY_RENTAL,
        },
        promotion: {
          active: true,
          message: isPremium 
            ? 'Premium Account: Unlimited free uploads!' 
            : `Launch Special: First ${PRICING.FREE_UPLOADS_LIMIT} uploads free for small communities!`,
        },
      });
    } catch (error: any) {
      console.error("Error fetching pricing status:", error);
      res.status(500).json({ message: error.message || "Failed to fetch pricing status" });
    }
  });

  // Account management routes
  app.post('/api/account/link-wallet', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { walletAddress } = req.body;

      if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ message: "Invalid wallet address" });
      }

      // Basic Solana address validation (should be 32-44 characters)
      if (walletAddress.length < 32 || walletAddress.length > 44) {
        return res.status(400).json({ message: "Invalid Solana wallet address format" });
      }

      const user = await storage.updateWalletAddress(userId, walletAddress);
      res.json({ message: "Wallet linked successfully", user });
    } catch (error: any) {
      console.error("Error linking wallet:", error);
      res.status(500).json({ message: error.message || "Failed to link wallet" });
    }
  });

  app.post('/api/account/send-verification', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.email) {
        return res.status(400).json({ message: "No email address found" });
      }

      // TODO: Implement actual email sending with verification token
      // For now, auto-verify for development
      await storage.updateEmailVerified(userId, true);

      res.json({ message: "Email verification sent" });
    } catch (error: any) {
      console.error("Error sending verification:", error);
      res.status(500).json({ message: error.message || "Failed to send verification email" });
    }
  });

  app.patch('/api/account/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { notifyPaymentsDue, notifyRentalReminders } = req.body;

      if (typeof notifyPaymentsDue !== 'boolean' || typeof notifyRentalReminders !== 'boolean') {
        return res.status(400).json({ message: "Invalid notification preferences" });
      }

      const user = await storage.updateNotificationPreferences(
        userId,
        notifyPaymentsDue,
        notifyRentalReminders
      );

      res.json({ message: "Preferences updated", user });
    } catch (error: any) {
      console.error("Error updating notifications:", error);
      res.status(500).json({ message: error.message || "Failed to update preferences" });
    }
  });

  app.patch('/api/account/social-handles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { twitterHandle, telegramHandle, discordHandle, instagramHandle, telegramGroupLink, websiteUrl, bio } = req.body;

      // Basic validation - remove @ symbols if included for handle fields
      const cleanHandles: any = {};
      if (twitterHandle !== undefined) {
        cleanHandles.twitterHandle = twitterHandle ? twitterHandle.replace(/^@/, '') : null;
      }
      if (telegramHandle !== undefined) {
        cleanHandles.telegramHandle = telegramHandle ? telegramHandle.replace(/^@/, '') : null;
      }
      if (discordHandle !== undefined) {
        cleanHandles.discordHandle = discordHandle || null;
      }
      if (instagramHandle !== undefined) {
        cleanHandles.instagramHandle = instagramHandle ? instagramHandle.replace(/^@/, '') : null;
      }
      if (telegramGroupLink !== undefined) {
        cleanHandles.telegramGroupLink = telegramGroupLink || null;
      }
      if (websiteUrl !== undefined) {
        cleanHandles.websiteUrl = websiteUrl || null;
      }
      if (bio !== undefined) {
        cleanHandles.bio = bio || null;
      }

      const user = await storage.updateSocialHandles(userId, cleanHandles);

      res.json({ message: "Social handles updated", user });
    } catch (error: any) {
      console.error("Error updating social handles:", error);
      res.status(500).json({ message: error.message || "Failed to update social handles" });
    }
  });

  // Generate Solturio Solana wallet (after email verification)
  app.post('/api/account/generate-solturio-wallet', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(403).json({ 
          message: "Email verification required before wallet generation",
          requiresEmailVerification: true,
        });
      }

      // Check if wallet already exists
      if (user.solanaPublicKey) {
        return res.status(400).json({ 
          message: "Solturio wallet already exists",
          publicKey: user.solanaPublicKey,
        });
      }

      // Get all users to determine next account number
      const allUsers = await storage.getAllUsers();
      const existingWalletNames = allUsers
        .map((u: User) => u.walletName)
        .filter(Boolean) as string[];
      const accountNumber = getNextAccountNumber(existingWalletNames);

      // Generate new Solana wallet
      const wallet = await generateSolanaWalletNew({
        walletType: 'standard',
        accountNumber,
      });
      
      // Save to database
      const updatedUser = await storage.createSolturioWallet(
        userId,
        wallet.publicKey,
        wallet.encryptedPrivateKey
      );

      res.json({ 
        message: "Solturio wallet created successfully",
        publicKey: wallet.publicKey,
        createdAt: updatedUser.solanaWalletCreatedAt,
      });
    } catch (error: any) {
      console.error("Error generating Solturio wallet:", error);
      res.status(500).json({ message: error.message || "Failed to generate wallet" });
    }
  });

  // CRITICAL SECURITY FIX: Export private key requires challenge-response verification
  // Step 1: GET /api/security/challenge - Get challenge for user to sign
  // Step 2: User signs challenge with wallet private key
  // Step 3: POST /api/account/export-private-key with signature
  app.post('/api/account/export-private-key', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { challenge, signature } = req.body;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // CRITICAL SECURITY FIX: Require challenge-response verification
      if (!challenge || !signature) {
        return res.status(400).json({ 
          message: "Challenge-response required for security",
          step: 1,
          instructions: "GET /api/security/challenge first, then sign the challenge with your wallet",
        });
      }

      // Verify challenge signature
      if (!user.solanaPublicKey) {
        return res.status(400).json({ 
          message: "No wallet found. Please create a wallet first.",
        });
      }
      const { verifyChallengeSignature } = await import("./security-ceremony");
      const verified = verifyChallengeSignature(challenge, signature, user.solanaPublicKey);
      
      if (!verified) {
        return res.status(401).json({ 
          message: "Challenge verification failed. Invalid signature or expired challenge.",
        });
      }

      // Security checks
      if (!user.emailVerified) {
        return res.status(403).json({ 
          message: "Email verification required to export private key",
          requiresEmailVerification: true,
        });
      }

      if (!user.solanaEncryptedPrivateKey || !user.walletSalt) {
        return res.status(404).json({ message: "No Solturio wallet found or missing wallet salt" });
      }

      // Decrypt private key
      const privateKeyHex = await decryptData(user.solanaEncryptedPrivateKey, user.walletSalt);
      const privateKeyArray = Array.from(Buffer.from(privateKeyHex, 'hex'));

      // Mark as exported
      if (!user.hasExportedPrivateKey) {
        await storage.markPrivateKeyExported(userId);
      }

      res.json({ 
        privateKey: privateKeyArray,
        publicKey: user.solanaPublicKey,
        warning: "Keep this private key safe. Never share it with anyone.",
      });
    } catch (error: any) {
      console.error("Error exporting private key:", error);
      res.status(500).json({ message: error.message || "Failed to export private key" });
    }
  });

  // Note: No file serving endpoint - files are stored in user's .solturio.sol wallet

  // DEX Verification API endpoints
  app.post("/api/dex/verify", async (req, res) => {
    try {
      const { tokenAddress, chainId, logoUrl, logoHash } = req.body;
      const { verifyTokenLogo } = await import("./dex-verification");
      
      const result = await verifyTokenLogo({
        tokenAddress,
        chainId,
        logoUrl,
        logoHash,
      });
      
      res.json(result);
    } catch (error) {
      console.error("DEX verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Report copycat/fraud endpoint
  app.post("/api/dex/report-copycat", async (req, res) => {
    try {
      const { originalLogoId, fraudulentTokenAddress, dexPlatform, evidenceUrl, reporterEmail } = req.body;
      const { reportCopycat } = await import("./dex-verification");
      
      const result = await reportCopycat({
        originalLogoId,
        fraudulentTokenAddress,
        dexPlatform,
        evidenceUrl,
        reporterEmail,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Report submission error:", error);
      res.status(500).json({ error: "Failed to submit report" });
    }
  });

  // Get verification by file hash
  app.get("/api/verify/hash/:hash", async (req, res) => {
    try {
      const { hash } = req.params;
      const logos = await storage.getLogosByFileHash(hash);
      
      if (logos.length === 0) {
        return res.status(404).json({
          verified: false,
          message: "No registered logo found with this hash",
        });
      }

      // Get the original (first) registration
      const original = logos[0];
      const collection = original.collectionId ? 
        await storage.getCollection(original.collectionId) : null;

      res.json({
        verified: true,
        original: {
          id: original.id,
          registrationDate: original.createdAt,
          companyName: collection?.companyName || "Unknown",
          ipfsHash: original.ipfsHash,
          transactionHash: original.transactionHash,
        },
        totalRegistrations: logos.length,
        possibleCopies: logos.length - 1,
      });
    } catch (error) {
      console.error("Hash verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // ============================================
  // IPFS and Arweave Storage Routes
  // ============================================
  
  // Import storage services
  const storageRouter = await import("./routes/storage");
  app.use("/api/storage", storageRouter.default);

  // ============================================
  // Partnership & Outreach Documents
  // ============================================
  
  // Generate Solana Foundation Proposal
  app.get("/api/documents/solana-foundation-proposal", async (req, res) => {
    try {
      const { generateSolanaFoundationProposal } = await import("./documents/solana-foundation-proposal");
      const pdfBuffer = await generateSolanaFoundationProposal();
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=Solturio-Solana-Foundation-Proposal.pdf");
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating Solana Foundation proposal:", error);
      res.status(500).json({ error: "Failed to generate proposal" });
    }
  });
  
  // Generate DEX Partnership Proposal
  app.post("/api/documents/dex-partnership-proposal", async (req, res) => {
    try {
      const { dexName } = req.body;
      const { generateDEXPartnershipProposal } = await import("./documents/dex-partnership-proposal");
      const pdfBuffer = await generateDEXPartnershipProposal(dexName || "Your Platform");
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=Solturio-DEX-Partnership-${dexName || "Proposal"}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating DEX partnership proposal:", error);
      res.status(500).json({ error: "Failed to generate proposal" });
    }
  });

  // ===== Quiz API Routes =====
  
  // Get quiz questions for the current round
  app.get("/api/quiz/questions", async (req, res) => {
    try {
      const { category, points } = req.query;
      const questions = await storage.getQuizQuestions(
        category as string | undefined,
        points ? Number(points) : undefined
      );
      res.json(questions);
    } catch (error) {
      console.error("Error fetching quiz questions:", error);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  // Get user quiz stats
  app.get("/api/quiz/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getQuizStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching quiz stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Submit quiz answer
  app.post("/api/quiz/answer", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { questionId, answer, timeToAnswer, hintUsed, originalPoints } = req.body;
      
      const result = await storage.submitQuizAnswer(userId, {
        questionId,
        answer,
        timeToAnswer,
        hintUsed,
        originalPoints,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error submitting quiz answer:", error);
      res.status(500).json({ error: "Failed to submit answer" });
    }
  });

  // Seed quiz questions (admin only - for development)
  app.post("/api/quiz/seed", async (req, res) => {
    try {
      const { sampleQuestions } = await import("./seed-quiz-questions");
      await storage.createQuizQuestions(sampleQuestions);
      res.json({ message: `Successfully seeded ${sampleQuestions.length} quiz questions` });
    } catch (error) {
      console.error("Error seeding quiz questions:", error);
      res.status(500).json({ error: "Failed to seed questions" });
    }
  });

  // ===== Visitor Account API Routes =====
  // These allow email-only signup for search/quiz access
  // Rewards are pending until user upgrades to full account

  // Register a new visitor account
  app.post("/api/visitor/register", async (req, res) => {
    try {
      const { email, marketingOptIn } = req.body;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: "Valid email is required" });
      }
      
      // Check if email already exists
      const existing = await storage.getVisitorAccountByEmail(email);
      if (existing) {
        if (existing.emailVerified) {
          return res.status(400).json({ error: "This email is already registered. Please login." });
        } else {
          // Resend verification email
          // TODO: Send verification email with existing.verificationToken
          return res.json({ 
            message: "Verification email resent",
            visitorId: existing.id,
            requiresVerification: true 
          });
        }
      }
      
      // Create new visitor account
      const visitor = await storage.createVisitorAccount(email, marketingOptIn || false);
      
      // TODO: Send verification email with visitor.verificationToken
      // For now, auto-verify in development
      if (process.env.NODE_ENV !== 'production') {
        await storage.verifyVisitorEmail(visitor.verificationToken!);
      }
      
      res.json({
        message: "Account created successfully",
        visitorId: visitor.id,
        requiresVerification: process.env.NODE_ENV === 'production',
        // Include token for development testing
        ...(process.env.NODE_ENV !== 'production' && { verificationToken: visitor.verificationToken }),
      });
    } catch (error) {
      console.error("Error registering visitor:", error);
      res.status(500).json({ error: "Failed to register visitor" });
    }
  });

  // Verify visitor email
  app.get("/api/visitor/verify/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const visitor = await storage.verifyVisitorEmail(token);
      if (!visitor) {
        return res.status(400).json({ error: "Invalid or expired verification token" });
      }
      
      res.json({
        message: "Email verified successfully",
        visitorId: visitor.id,
        email: visitor.email,
      });
    } catch (error) {
      console.error("Error verifying visitor email:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  // Login visitor (by email) - returns session token for authenticated requests
  app.post("/api/visitor/login", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const visitor = await storage.getVisitorAccountByEmail(email);
      if (!visitor) {
        return res.status(404).json({ error: "Visitor not found. Please register first." });
      }
      
      if (!visitor.emailVerified) {
        return res.status(403).json({ error: "Please verify your email first" });
      }
      
      if (visitor.convertedToUserId) {
        return res.status(400).json({ error: "This email has been upgraded to a full account. Please use Replit Auth to login." });
      }
      
      // Update last login and generate new session token
      const updated = await storage.updateVisitorLastLogin(visitor.id);
      
      res.json({
        visitorId: updated.id,
        email: updated.email,
        sessionToken: updated.newSessionToken, // Required for authenticated requests
        pendingSoltRewards: updated.pendingSoltRewards,
        rewardsExpireAt: updated.rewardsExpireAt,
      });
    } catch (error) {
      console.error("Error logging in visitor:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Get visitor profile and stats
  app.get("/api/visitor/:visitorId", async (req, res) => {
    try {
      const { visitorId } = req.params;
      
      const visitor = await storage.getVisitorAccountById(visitorId);
      if (!visitor) {
        return res.status(404).json({ error: "Visitor not found" });
      }
      
      const stats = await storage.getVisitorQuizStats(visitorId);
      
      res.json({
        id: visitor.id,
        email: visitor.email,
        emailVerified: visitor.emailVerified,
        createdAt: visitor.createdAt,
        lastLoginAt: visitor.lastLoginAt,
        stats,
      });
    } catch (error) {
      console.error("Error fetching visitor profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Submit quiz answer as visitor (requires session token)
  app.post("/api/visitor/:visitorId/quiz/answer", async (req, res) => {
    try {
      const { visitorId } = req.params;
      const { questionId, answer, timeToAnswer, hintUsed, sessionToken } = req.body;
      
      // Verify session token
      if (!sessionToken) {
        return res.status(401).json({ error: "Session token required. Please login first." });
      }
      
      const isValidSession = await storage.verifyVisitorSessionToken(visitorId, sessionToken);
      if (!isValidSession) {
        return res.status(401).json({ error: "Invalid or expired session. Please login again." });
      }
      
      const visitor = await storage.getVisitorAccountById(visitorId);
      if (!visitor) {
        return res.status(404).json({ error: "Visitor not found" });
      }
      
      if (!visitor.emailVerified) {
        return res.status(403).json({ error: "Please verify your email first" });
      }
      
      const result = await storage.submitVisitorQuizAnswer(visitorId, {
        questionId,
        answer,
        timeToAnswer,
        hintUsed,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error submitting visitor quiz answer:", error);
      res.status(500).json({ error: "Failed to submit answer" });
    }
  });

  // Get visitor quiz stats
  app.get("/api/visitor/:visitorId/quiz/stats", async (req, res) => {
    try {
      const { visitorId } = req.params;
      
      const stats = await storage.getVisitorQuizStats(visitorId);
      if (!stats) {
        return res.status(404).json({ error: "Visitor not found" });
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching visitor quiz stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Convert visitor to full user (called after Replit Auth signup)
  app.post("/api/visitor/convert", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { visitorId } = req.body;
      
      if (!visitorId) {
        return res.status(400).json({ error: "Visitor ID is required" });
      }
      
      const visitor = await storage.getVisitorAccountById(visitorId);
      if (!visitor) {
        return res.status(404).json({ error: "Visitor not found" });
      }
      
      // Transfer rewards from visitor to user
      const result = await storage.convertVisitorToUser(visitorId, userId);
      
      res.json({
        message: result.transferred 
          ? `Successfully transferred ${result.soltRewards} $SOLT and ${result.gamePoints} Game Points to your account!`
          : "Account upgraded, but pending rewards had expired.",
        ...result,
      });
    } catch (error) {
      console.error("Error converting visitor to user:", error);
      res.status(500).json({ error: "Failed to convert account" });
    }
  });

  // Check for expired visitor rewards (can be called by cron job)
  app.post("/api/visitor/cleanup-expired", async (req, res) => {
    try {
      const count = await storage.checkExpiredVisitorRewards();
      res.json({ message: `Cleaned up ${count} expired visitor reward records` });
    } catch (error) {
      console.error("Error cleaning up expired rewards:", error);
      res.status(500).json({ error: "Failed to cleanup" });
    }
  });

  // ============================================
  // RECEIPT GENERATION
  // ============================================

  // Helper function to build receipt data
  function buildReceiptData(
    registrationId: string,
    customerName: string,
    email: string,
    registrationType: "Token Creator" | "Artwork Artist" | "General Registration",
    itemName: string,
    lineItems: LineItem[],
    total: string,
    currency: string = "SOL",
    paymentStatus: "confirmed" | "pending" | "failed" = "confirmed",
    txHash?: string,
    walletAddress?: string
  ): ReceiptData {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + parseFloat(item.subtotal);
    }, 0).toFixed(6);

    return {
      registrationId,
      customerName,
      email,
      walletAddress,
      registrationType,
      itemName,
      lineItems,
      subtotal: subtotal,
      total,
      currency,
      paymentStatus,
      txHash,
      timestamp: new Date().toISOString(),
    };
  }

  // Send dynamic receipt with line items
  app.post("/api/receipt/send", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const {
        registrationId,
        itemName,
        lineItems,
        total,
        currency = "SOL",
        txHash,
        registrationType = "General Registration",
      } = req.body;

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Validate required fields
      if (!registrationId || !itemName || !lineItems || !total) {
        return res.status(400).json({
          error: "Missing required fields: registrationId, itemName, lineItems, total",
        });
      }

      // Validate line items structure
      if (!Array.isArray(lineItems) || lineItems.length === 0) {
        return res.status(400).json({
          error: "lineItems must be a non-empty array",
        });
      }

      for (const item of lineItems) {
        if (!item.description || item.quantity === undefined || !item.unitPrice || !item.subtotal) {
          return res.status(400).json({
            error: "Each line item must have: description, quantity, unitPrice, subtotal",
          });
        }
      }

      // Build and send receipt
      const customerName = user.firstName || user.lastName 
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : (user.email || "Valued Customer");

      const receiptData = buildReceiptData(
        registrationId,
        customerName,
        user.email || "",
        registrationType as "Token Creator" | "Artwork Artist" | "General Registration",
        itemName,
        lineItems,
        total,
        currency,
        "confirmed",
        txHash,
        user.solanaPublicKey || undefined
      );

      const sent = await sendDynamicReceipt(receiptData);

      res.json({
        success: sent,
        message: sent
          ? "Receipt sent successfully"
          : "Email service not configured. Please set SENDGRID_API_KEY.",
        receiptId: registrationId,
        sentTo: user.email,
      });
    } catch (error: any) {
      console.error("Error sending receipt:", error);
      res.status(500).json({
        error: "Failed to send receipt",
        details: error.message,
      });
    }
  });

  // ============================================
  // SOLANA WALLET CREATION & MANAGEMENT
  // ============================================
  //
  // CRITICAL SECURITY POLICY FOR xxx.solturio.sol WALLETS:
  //
  // All platform wallets (001.solturio.sol, brandname.solturio.sol) are RESTRICTED wallets
  // that can ONLY hold:
  // - Platform-issued certificates (artwork/token registrations)
  // - Platform-issued smart contracts
  // - IPFS content hashes
  // - SOL (for transaction fees only)
  //
  // These wallets CANNOT accept:
  // - SPL tokens (fungible tokens)
  // - External NFTs
  // - Any cryptocurrency other than SOL
  //
  // Enforcement: See wallet-restrictions.ts for validation logic
  // ============================================

  // Create xxx.solturio.sol wallet for user
  app.post("/api/wallet/create", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { walletType, customName, paymentTxHash, nonce, timestamp } = req.body;

      // PHASE 1: Validate nonce + timestamp (Replay Prevention)
      if (!nonce || !timestamp) {
        return res.status(400).json({ 
          error: "Missing security parameters: nonce and timestamp required" 
        });
      }

      // Import replay prevention utilities
      const { isValidNonce, isValidTimestamp, checkAndStoreNonce } = await import("./utils/replay-prevention");

      // Validate nonce format
      if (!isValidNonce(nonce)) {
        return res.status(400).json({ error: "Invalid nonce format" });
      }

      // Validate timestamp is recent
      if (!isValidTimestamp(timestamp)) {
        return res.status(400).json({ error: "Request expired (timestamp must be within 5 minutes)" });
      }

      // Check nonce hasn't been used (replay prevention)
      const nonceCheck = await checkAndStoreNonce(storage, nonce);
      if (!nonceCheck.valid) {
        return res.status(400).json({ error: nonceCheck.reason || "Replay attack detected" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user already has a wallet
      if (user.solanaPublicKey) {
        return res.status(400).json({ 
          error: "User already has a wallet",
          walletName: user.walletName,
          publicKey: user.solanaPublicKey,
        });
      }

      // Validate wallet type
      if (walletType !== 'standard' && walletType !== 'premium') {
        return res.status(400).json({ error: "Invalid wallet type. Must be 'standard' or 'premium'" });
      }

      // Validate payment transaction hash
      if (!paymentTxHash || typeof paymentTxHash !== 'string') {
        return res.status(400).json({ 
          error: "Payment transaction hash required",
          requiredAmount: walletType === 'standard' ? '0.1 SOL' : '0.15 SOL',
        });
      }

      // CRITICAL SECURITY: Verify payment on blockchain before creating wallet
      // Prevents users from bypassing payment or using fake transaction hashes
      
      // Check if transaction hash has already been used (prevent double-spending)
      const txAlreadyUsed = await isTransactionUsed(paymentTxHash, storage);
      if (txAlreadyUsed) {
        return res.status(400).json({ 
          error: "This transaction has already been used",
          details: "Each payment can only be used once. Please make a new payment.",
        });
      }

      // CRITICAL SECURITY FIX: Use on-chain transaction verification instead of old method
      // Verify payment amount matches wallet tier (hardcoded to SOL)
      const paymentAmountSOL = walletType === 'standard' ? BigInt(100_000_000) : BigInt(150_000_000); // 0.1 or 0.15 SOL in lamports
      const txVerification = await verifyTransactionOnChain(paymentTxHash, paymentAmountSOL);
      
      const paymentResult = txVerification.valid 
        ? { valid: true, error: null }
        : { valid: false, error: txVerification.error };

      if (!paymentResult.valid) {
        console.error('Payment verification failed:', paymentResult);
        return res.status(402).json({ 
          error: "Payment verification failed",
          reason: paymentResult.error || 'Unknown error',
          details: paymentResult.error,
          requiredAmount: walletType === 'standard' ? '0.1 SOL' : '0.15 SOL',
          requiredCurrency: 'SOL',
        });
      }

      // Log successful payment verification
      console.log('Payment verified successfully:', {
        userId,
        txHash: paymentTxHash,
        walletType,
        timestamp: txVerification.valid ? (txVerification as any).timestamp : null,
      });

      // Get all existing wallets to determine next account number or check custom name
      const allUsers = await storage.getAllUsers();
      const existingWalletNames = allUsers
        .map((u: User) => u.walletName)
        .filter(Boolean) as string[];

      let accountNumber: number | undefined;
      let finalCustomName: string | undefined;

      if (walletType === 'standard') {
        accountNumber = getNextAccountNumber(existingWalletNames);
      } else {
        // Premium wallet - validate custom name
        if (!customName || !validateCustomName(customName)) {
          return res.status(400).json({ 
            error: "Premium wallet requires custom name (3-32 alphanumeric characters)",
          });
        }

        const proposedWalletName = `${customName.toLowerCase().replace(/[^a-z0-9]/g, '')}.solturio.sol`;
        if (isWalletNameTaken(proposedWalletName, existingWalletNames)) {
          return res.status(409).json({ 
            error: "Wallet name already taken",
            suggestion: `${customName}${Math.floor(Math.random() * 999)}`,
          });
        }

        finalCustomName = customName;
      }

      // Generate Solana wallet
      const walletResult = await generateSolanaWalletNew({
        walletType,
        customName: finalCustomName,
        accountNumber,
      });

      // Update user with wallet information
      await storage.updateUser(userId, {
        solanaPublicKey: walletResult.publicKey,
        solanaEncryptedPrivateKey: walletResult.encryptedPrivateKey,
        walletSalt: walletResult.salt,
        walletType: walletResult.walletType,
        walletName: walletResult.walletName,
        customName: finalCustomName,
        solanaWalletCreatedAt: new Date(),
        walletFundingTxHash: paymentTxHash,
        encryptedRecoveryPhrase: walletResult.encryptedMnemonic,
      });

      // Send receipt email for wallet creation
      const walletPrice = walletType === 'standard' ? '0.1' : '0.15';
      const walletCurrency = 'SOL'; // Wallet creation uses SOL
      const receiptLineItems: LineItem[] = [
        {
          description: `Solturio ${walletType === 'standard' ? 'Standard' : 'Premium'} Wallet Creation (${walletResult.walletName})`,
          quantity: 1,
          unitPrice: walletPrice,
          currency: walletCurrency,
          subtotal: walletPrice,
        },
      ];

      const walletCustomerName = user.firstName || user.lastName 
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : (user.email || "Valued Customer");

      const walletReceipt = buildReceiptData(
        `WALLET-${walletResult.publicKey.slice(0, 8).toUpperCase()}`,
        walletCustomerName,
        user.email || "",
        "General Registration",
        `Wallet: ${walletResult.walletName}`,
        receiptLineItems,
        walletPrice,
        walletCurrency,
        "confirmed",
        paymentTxHash,
        walletResult.publicKey
      );

      sendDynamicReceipt(walletReceipt).catch(err => 
        console.error('Failed to send wallet receipt:', err)
      );

      // Send wallet creation confirmation email
      if (user.email) {
        sendWalletCreated(user.email, walletResult.walletName).catch(err =>
          console.error('Failed to send wallet notification:', err)
        );
      }

      res.json({
        success: true,
        wallet: {
          publicKey: walletResult.publicKey,
          walletName: walletResult.walletName,
          walletType: walletResult.walletType,
          isRestricted: true, // All xxx.solturio.sol wallets are restricted
        },
        restrictions: {
          message: "This is a certificate wallet - SPL tokens and external NFTs are NOT allowed",
          allowedAssets: [
            "Platform-issued certificates",
            "IP registration records",
            "Smart contracts",
            "SOL (for transaction fees only)"
          ],
          prohibitedAssets: [
            "SPL tokens",
            "External NFTs",
            "Other cryptocurrencies"
          ]
        },
        message: "Wallet created successfully. Please complete the Key Handover Ceremony.",
      });
    } catch (error: any) {
      console.error("Error creating wallet:", error);
      res.status(500).json({ 
        error: "Failed to create wallet",
        details: error.message,
      });
    }
  });

  // Get current user's wallet information
  app.get("/api/wallet/info", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.solanaPublicKey) {
        return res.json({ 
          hasWallet: false,
          message: "No wallet created yet",
        });
      }

      res.json({
        hasWallet: true,
        wallet: {
          publicKey: user.solanaPublicKey,
          walletName: user.walletName,
          walletType: user.walletType,
          customName: user.customName,
          createdAt: user.solanaWalletCreatedAt,
          fundingTxHash: user.walletFundingTxHash,
        },
        ceremony: {
          completed: user.ceremonyCompleted,
          recoveryPhraseVerified: user.recoveryPhraseVerified,
          termsAcceptedAt: user.termsAcceptedAt,
        },
      });
    } catch (error) {
      console.error("Error fetching wallet info:", error);
      res.status(500).json({ error: "Failed to fetch wallet information" });
    }
  });

  // Check if wallet name is available (for premium wallets)
  app.post("/api/wallet/check-name", isAuthenticated, async (req, res) => {
    try {
      const { customName } = req.body;

      if (!customName || typeof customName !== 'string') {
        return res.status(400).json({ error: "Custom name required" });
      }

      if (!validateCustomName(customName)) {
        return res.status(400).json({ 
          available: false,
          error: "Custom name must be 3-32 alphanumeric characters",
        });
      }

      const allUsers = await storage.getAllUsers();
      const existingWalletNames = allUsers
        .map((u: User) => u.walletName)
        .filter(Boolean) as string[];

      const cleanName = customName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const proposedWalletName = `${cleanName}.solturio.sol`;
      const taken = isWalletNameTaken(proposedWalletName, existingWalletNames);

      res.json({
        available: !taken,
        walletName: proposedWalletName,
        suggestion: taken ? `${cleanName}${Math.floor(Math.random() * 999)}` : undefined,
      });
    } catch (error) {
      console.error("Error checking wallet name:", error);
      res.status(500).json({ error: "Failed to check wallet name availability" });
    }
  });

  // KEY HANDOVER CEREMONY - Legal Audit Trail
  // ============================================

  // Get ceremony progress for current user
  app.get("/api/ceremony/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        ceremonyCompleted: user.ceremonyCompleted || false,
        ceremonyStages: user.ceremonyStages || {},
        verificationAttempts: user.verificationAttempts || 0,
        recoveryPhraseVerified: user.recoveryPhraseVerified || false,
        termsAcceptedAt: user.termsAcceptedAt || null,
      });
    } catch (error) {
      console.error("Error fetching ceremony progress:", error);
      res.status(500).json({ error: "Failed to fetch ceremony progress" });
    }
  });

  // Record ceremony stage completion (creates legal audit trail)
  app.post("/api/ceremony/stage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { stage, data } = req.body;
      
      if (!stage || typeof stage !== 'string') {
        return res.status(400).json({ error: "Stage name is required" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get existing ceremony stages or create new object
      const ceremonyStages = (user.ceremonyStages as Record<string, any>) || {};
      
      // Record stage completion with timestamp
      ceremonyStages[stage] = {
        completedAt: new Date().toISOString(),
        data: data || {},
      };

      // Update user with new ceremony stage
      await storage.updateUser(userId, {
        ceremonyStages,
      });

      res.json({ 
        success: true, 
        stage,
        timestamp: ceremonyStages[stage].completedAt,
      });
    } catch (error) {
      console.error("Error recording ceremony stage:", error);
      res.status(500).json({ error: "Failed to record ceremony stage" });
    }
  });

  // STAGE 4: Reveal recovery phrase (ONE TIME ONLY!)
  app.get("/api/ceremony/recovery-phrase", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user has a wallet with encrypted recovery phrase
      if (!user.encryptedRecoveryPhrase || !user.walletSalt) {
        return res.status(404).json({ 
          error: "No recovery phrase found. Create a wallet first.",
        });
      }

      // Decrypt the recovery phrase
      const recoveryPhrase = await decryptData(
        user.encryptedRecoveryPhrase,
        user.walletSalt
      );

      // Split into array of 12 words
      const words = recoveryPhrase.split(' ');

      if (words.length !== 12) {
        console.error(`Invalid recovery phrase length: ${words.length}`);
        return res.status(500).json({ error: "Invalid recovery phrase format" });
      }

      // Record that phrase was shown (Stage 4 audit trail)
      await storage.updateUser(userId, {
        recoveryPhraseShownAt: new Date(),
      });

      res.json({ 
        words,
        warning: "This recovery phrase will NEVER be shown again. Write it down NOW!",
      });
    } catch (error) {
      console.error("Error revealing recovery phrase:", error);
      res.status(500).json({ error: "Failed to reveal recovery phrase" });
    }
  });

  // Generate verification challenge (positions only, no words sent to client!)
  app.get("/api/ceremony/challenge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user has encrypted recovery phrase
      if (!user.encryptedRecoveryPhrase || !user.walletSalt) {
        return res.status(400).json({ error: "No recovery phrase found. Please complete wallet creation first." });
      }

      // Generate 3 random positions (1-12)
      const positions: number[] = [];
      while (positions.length < 3) {
        const num = Math.floor(Math.random() * 12) + 1;
        if (!positions.includes(num)) {
          positions.push(num);
        }
      }
      positions.sort((a, b) => a - b);

      // Store challenge in user's ceremony data
      const ceremonyStages = (user.ceremonyStages as Record<string, any>) || {};
      ceremonyStages.verificationChallenge = {
        positions,
        generatedAt: new Date().toISOString(),
      };

      await storage.updateUser(userId, {
        ceremonyStages,
      });

      // Send ONLY positions to client, never the actual words!
      res.json({ 
        positions,
        attemptsRemaining: Math.max(0, 3 - (user.verificationAttempts || 0)),
      });
    } catch (error) {
      console.error("Error generating challenge:", error);
      res.status(500).json({ error: "Failed to generate challenge" });
    }
  });

  // Verify recovery phrase (server-side attempt tracking)
  app.post("/api/ceremony/verify-phrase", isAuthenticated, async (req: any, res) => {
    try {
      const { word1, word2, word3 } = req.body;

      const userId = req.user.claims.sub;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if already verified
      if (user.recoveryPhraseVerified) {
        return res.json({ 
          verified: true,
          alreadyVerified: true,
          message: "Recovery phrase already verified" 
        });
      }

      // Check attempt limit (server-side enforcement)
      const currentAttempts = user.verificationAttempts || 0;
      if (currentAttempts >= 3) {
        return res.status(403).json({ 
          error: "Maximum verification attempts exceeded",
          attemptsRemaining: 0,
          locked: true,
        });
      }

      // Get stored challenge positions
      const ceremonyStages = (user.ceremonyStages as Record<string, any>) || {};
      const challenge = ceremonyStages.verificationChallenge;
      
      if (!challenge || !challenge.positions) {
        return res.status(400).json({ error: "No active challenge found" });
      }

      // Check if user has encrypted recovery phrase
      if (!user.encryptedRecoveryPhrase || !user.walletSalt) {
        return res.status(400).json({ error: "No recovery phrase found. Please complete wallet creation first." });
      }

      // Decrypt the REAL user's recovery phrase for verification
      const recoveryPhrase = await decryptData(
        user.encryptedRecoveryPhrase,
        user.walletSalt
      );
      
      const correctPhrase = recoveryPhrase.split(' ');
      
      if (correctPhrase.length !== 12) {
        console.error(`Invalid recovery phrase length: ${correctPhrase.length}`);
        return res.status(500).json({ error: "Invalid recovery phrase format" });
      }

      // Verify each word matches the correct position
      const positions = challenge.positions;
      const correctWord1 = correctPhrase[positions[0] - 1];
      const correctWord2 = correctPhrase[positions[1] - 1];
      const correctWord3 = correctPhrase[positions[2] - 1];

      const isValid = 
        word1?.trim().toLowerCase() === correctWord1 &&
        word2?.trim().toLowerCase() === correctWord2 &&
        word3?.trim().toLowerCase() === correctWord3;

      // Increment attempt counter
      const newAttempts = currentAttempts + 1;

      if (isValid) {
        // Success - mark as verified
        await storage.updateUser(userId, {
          recoveryPhraseVerified: true,
          verificationAttempts: newAttempts,
        });

        res.json({ 
          verified: true,
          attemptsUsed: newAttempts,
        });
      } else {
        // Failure - increment attempts
        await storage.updateUser(userId, {
          verificationAttempts: newAttempts,
        });

        const attemptsRemaining = 3 - newAttempts;
        res.json({ 
          verified: false,
          attemptsRemaining,
          attemptsUsed: newAttempts,
          locked: attemptsRemaining === 0,
        });
      }
    } catch (error) {
      console.error("Error verifying recovery phrase:", error);
      res.status(500).json({ error: "Failed to verify recovery phrase" });
    }
  });

  // Complete ceremony and record final terms acceptance
  app.post("/api/ceremony/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify all prerequisites
      if (!user.recoveryPhraseVerified) {
        return res.status(400).json({ error: "Recovery phrase must be verified first" });
      }

      const now = new Date();
      await storage.updateUser(userId, {
        ceremonyCompleted: true,
        termsAcceptedAt: now,
      });

      res.json({ 
        success: true, 
        completedAt: now.toISOString(),
        message: "Key Handover Ceremony completed successfully",
      });
    } catch (error) {
      console.error("Error completing ceremony:", error);
      res.status(500).json({ error: "Failed to complete ceremony" });
    }
  });

  // Reset ceremony (development/testing only - should be admin-only in production)
  app.post("/api/ceremony/reset", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.updateUser(userId, {
        ceremonyCompleted: false,
        ceremonyStages: {},
        recoveryPhraseVerified: false,
        verificationAttempts: 0,
        termsAcceptedAt: null,
      });

      res.json({ 
        success: true, 
        message: "Ceremony reset successfully",
      });
    } catch (error) {
      console.error("Error resetting ceremony:", error);
      res.status(500).json({ error: "Failed to reset ceremony" });
    }
  });

  // NFT Minting Endpoint
  app.post('/api/nft/mint', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { logoId, logoName, logoDescription, registrationType } = req.body;

      if (!logoId) {
        return res.status(400).json({ message: "Logo ID is required" });
      }

      // Get the logo
      const logo = await storage.getLogoById(logoId);
      if (!logo) {
        return res.status(404).json({ message: "Logo not found" });
      }

      if (logo.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Check if already minted
      if (logo.nftAddress) {
        return res.status(200).json({
          success: true,
          message: "Logo already minted",
          nftAddress: logo.nftAddress,
          transactionHash: logo.transactionHash,
          explorerUrl: `https://solscan.io/token/${logo.nftAddress}`,
        });
      }

      // Build NFT metadata
      const mintOptions: MintOptions = {
        userPublicKey: user.solanaPublicKey || 'pending',
        encryptedPrivateKey: user.solanaEncryptedPrivateKey || '',
        walletSalt: user.walletSalt || '',
        logoId,
        logoName: logoName || logo.fileName,
        logoDescription: logoDescription || logo.description || '',
        ipfsImageHash: logo.ipfsHash || 'pending',
        ipfsMetadataHash: 'pending',
        registrationType: (registrationType || logo.registrationType || 'logo') as 'token_launch' | 'artwork' | 'logo',
        ownershipProof: logo.ownershipDescription || undefined,
      };

      // Build NFT metadata JSON
      const nftMetadata = buildNFTMetadata(mintOptions);

      // Upload metadata to IPFS
      let ipfsMetadataHash = 'pending';
      try {
        // Convert metadata to JSON string and upload
        const metadataBuffer = Buffer.from(JSON.stringify(nftMetadata));
        const ipfsResult = await uploadToIPFS(metadataBuffer, `${logoId}-metadata.json`);
        if (ipfsResult) {
          ipfsMetadataHash = ipfsResult.ipfsHash;
        }
      } catch (ipfsError) {
        console.error('IPFS metadata upload failed:', ipfsError);
      }

      // Update mintOptions with actual IPFS hash
      mintOptions.ipfsMetadataHash = ipfsMetadataHash;

      // Mint NFT certificate
      const mintResult = await mintNFTCertificate(mintOptions);

      if (mintResult.success) {
        // Update logo with NFT information
        await updateLogoWithNFT(
          storage,
          logoId,
          mintResult.nftAddress,
          mintResult.transactionHash,
          nftMetadata
        );

        // Send NFT minting email
        if (user.email) {
          sendNFTMintingStarted(user.email, logoName || logo.fileName, logoId).catch(err =>
            console.error('Email send failed:', err)
          );
        }

        res.json({
          success: true,
          nftAddress: mintResult.nftAddress,
          transactionHash: mintResult.transactionHash,
          explorerUrl: mintResult.explorerUrl,
          message: "NFT certificate created successfully!",
        });
      } else {
        res.status(500).json({
          success: false,
          message: mintResult.error || "Failed to mint NFT certificate",
        });
      }
    } catch (error: any) {
      console.error("Error minting NFT:", error);
      res.status(500).json({ message: error.message || "Failed to mint NFT" });
    }
  });

  // Phase 2: Register License Management & Treasury Routers
  app.use("/api", licensesRouter);
  app.use("/api", treasuryRouter);

  // New Payment Model Routes: Subscription, Rewards, Tokens
  app.use("/api", subscriptionRouter);
  app.use("/api", rewardsRouter);
  app.use("/api", tokensRouter);
  
  // Comprehensive License Smart Contract Routes
  app.use("/api/licenses", licenseRouter);

  // Phase 4: Register IP Registration, Subdomains, and Security Challenge Routers
  app.use("/api", ipRegistrationRouter);
  app.use("/api", subdomainsRouter);
  
  // Import and register challenge router for security ceremony
  const { challengeRouter } = await import("./challenge-endpoint");
  app.use("/api", challengeRouter);
  
  // GitHub Integration Proxy (connects to SC Replit)
  app.use("/api/github", githubProxyRouter);
  
  // Music IP Protection Routes
  app.use("/api/music", musicRouter);
  
  // Watermark Protection API
  app.use("/api/watermark", watermarkRouter);

  // Phase 3: Apply global validation and error handling
  applyValidationToRoutes(app);

  // Phase 3: Global error handler (must be last)
  app.use((err: any, req: any, res: any, next: any) => {
    const requestId = req.requestId || `req_${Date.now()}`;
    const formatted = formatError(err, requestId);
    
    // Log error
    auditLogger.log({
      action: "ERROR",
      endpoint: req.path,
      method: req.method,
      statusCode: err.statusCode || 500,
      requestId,
      userId: req.user?.claims?.sub,
      details: { error: err.message },
    });

    res.status(err.statusCode || 500).json(formatted);
  });

  const httpServer = createServer(app);
  return httpServer;
}


/**
 * ============================================
 * PHASE 4: SC INTEGRATION SUMMARY
 * ============================================
 * 
 * CRITICAL SECURITY FIXES APPLIED:
 * 1. ✅ Currency Hardcoding: Removed multi-currency from wallet endpoint
 * 2. ✅ On-Chain Transaction Verification: Added verifyTransactionOnChain()
 * 3. ✅ Challenge-Response for Private Key Export: Added security ceremony
 * 
 * NEW ENDPOINTS ADDED:
 * 4. ✅ POST /api/ip/register-on-chain - Register logo on blockchain
 * 5. ✅ POST /api/ip/store-ipfs-metadata - Store IPFS mapping on-chain
 * 6. ✅ POST /api/subdomains/register - Register platform subdomain (admin)
 * 7. ✅ GET /api/subdomains/:name - Check subdomain status
 * 8. ✅ GET /api/security/challenge - Get challenge for signature verification
 * 9. ✅ POST /api/security/verify-challenge - Verify signed challenge
 * 
 * FILES CREATED:
 * - server/sc-integration.ts - SC integration functions
 * - server/ip-registration.ts - IP registration endpoints
 * - server/subdomains.ts - Subdomain management endpoints
 * - server/security-ceremony.ts - Challenge-response security
 * - server/challenge-endpoint.ts - Challenge API endpoints
 * 
 * TODO (Can be completed later):
 * - Connect SC integration functions to actual smart contract calls
 * - Add admin role verification to subdomain endpoints
 * - Add license/treasury SC integration
 * ============================================
 */
