// Reference: blueprint:javascript_log_in_with_replit, blueprint:javascript_stripe
import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import Stripe from "stripe";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { createHash } from "crypto";
import path from "path";
import fs from "fs/promises";
import { generateSolanaWallet, formatPrivateKeyForPhantom } from "./solana-wallet";

// Stripe is optional in development - only required for payment endpoints
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-09-30.clover",
    })
  : null;

// Setup file upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, and SVG are allowed.'));
    }
  },
});

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);

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
import { PRICING, isEligibleForFreeUpload, getRemainingFreeUploads } from "@shared/pricing";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

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

  // Logo metadata registration endpoint (NO file storage - files stored in user's .centurio.sol wallet)
  app.post('/api/logos/upload', isAuthenticated, upload.array('logos', 50), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      // Create a new collection
      const collection = await storage.createCollection({
        userId,
        name: `Collection ${new Date().toISOString().split('T')[0]}`,
        companyName: req.body.companyName || 'My Company',
        status: 'draft',
      });

      // Process each file - extract metadata only, no storage
      const registeredLogos = [];
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

        // Generate storage path for user's .centurio.sol wallet
        const userWalletDomain = user?.solanaPublicKey ? 
          `${user.solanaPublicKey.slice(0, 8).toLowerCase()}.centurio.sol` : 
          'pending.centurio.sol';
        const storagePath = `${userWalletDomain}/logos/${randomUUID()}-${file.originalname}`;

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

      res.json({
        collectionId: collection.id,
        logos: registeredLogos,
        message: "Logo metadata registered. Please store the image files in your .centurio.sol wallet.",
        walletDomain: registeredLogos[0]?.instructions.split('/')[0] || 'pending.centurio.sol',
      });
    } catch (error: any) {
      console.error("Error registering logo metadata:", error);
      res.status(500).json({ message: error.message || "Failed to register logo metadata" });
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

  // Get pricing and free upload status
  app.get('/api/pricing/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logos = await storage.getLogosByUserId(userId);
      const logoCount = logos.length;

      const freeUploadsRemaining = getRemainingFreeUploads(logoCount);
      const isEligible = isEligibleForFreeUpload(logoCount);

      res.json({
        logoCount,
        freeUploadsRemaining,
        isEligibleForFreeUpload: isEligible,
        freeUploadLimit: PRICING.FREE_UPLOADS_LIMIT,
        pricing: {
          minting: PRICING.MINTING_FEE,
          monthlyRental: PRICING.MONTHLY_RENTAL,
        },
        promotion: {
          active: true,
          message: `Launch Special: First ${PRICING.FREE_UPLOADS_LIMIT} uploads free for small communities!`,
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
      const { twitterHandle, telegramHandle, discordHandle } = req.body;

      // Basic validation - remove @ symbols if included
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

      const user = await storage.updateSocialHandles(userId, cleanHandles);

      res.json({ message: "Social handles updated", user });
    } catch (error: any) {
      console.error("Error updating social handles:", error);
      res.status(500).json({ message: error.message || "Failed to update social handles" });
    }
  });

  // Generate Centurio Solana wallet (after email verification)
  app.post('/api/account/generate-centurio-wallet', isAuthenticated, async (req: any, res) => {
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
          message: "Centurio wallet already exists",
          publicKey: user.solanaPublicKey,
        });
      }

      // Generate new Solana wallet
      const wallet = generateSolanaWallet();
      
      // Save to database
      const updatedUser = await storage.createCenturioWallet(
        userId,
        wallet.publicKey,
        wallet.encryptedPrivateKey
      );

      res.json({ 
        message: "Centurio wallet created successfully",
        publicKey: wallet.publicKey,
        createdAt: updatedUser.solanaWalletCreatedAt,
      });
    } catch (error: any) {
      console.error("Error generating Centurio wallet:", error);
      res.status(500).json({ message: error.message || "Failed to generate wallet" });
    }
  });

  // Export private key for Phantom import (requires email verification)
  app.post('/api/account/export-private-key', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Security checks
      if (!user.emailVerified) {
        return res.status(403).json({ 
          message: "Email verification required to export private key",
          requiresEmailVerification: true,
        });
      }

      if (!user.solanaEncryptedPrivateKey) {
        return res.status(404).json({ message: "No Centurio wallet found" });
      }

      // Decrypt and format private key for Phantom
      const privateKeyArray = formatPrivateKeyForPhantom(user.solanaEncryptedPrivateKey);

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

  // Note: No file serving endpoint - files are stored in user's .centurio.sol wallet

  const httpServer = createServer(app);
  return httpServer;
}
