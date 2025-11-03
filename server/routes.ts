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
import { uploadToIPFS, uploadJSONToIPFS, generateLogoMetadata } from "./ipfs";
import { generatePriorArtCertificate, generateDMCATakedownNotice, generateCeaseAndDesistLetter } from "./legal-documents";

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

      res.json({
        collectionId: collection.id,
        logos: registeredLogos,
        message: hasFiles ? 
          "Logo metadata registered. Please store the image files in your .centurio.sol wallet." :
          "Logo URLs registered successfully.",
        walletDomain: user?.solanaPublicKey ? 
          `${user.solanaPublicKey.slice(0, 8).toLowerCase()}.centurio.sol` : 
          'pending.centurio.sol',
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
          description: logo.description,
          ownershipDescription: logo.ownershipDescription,
          userId,
          timestamp: logo.createdAt,
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
      
      const registration = {
        id: logo.id,
        fileName: logo.fileName,
        fileHash: logo.fileHash,
        ipfsHash: logo.ipfsHash,
        userId,
        userEmail: user.email || 'Not provided',
        companyName: collection?.companyName || 'Not specified',
        description: logo.description,
        ownershipDescription: logo.ownershipDescription,
        intendedUse: logo.intendedUse,
        registrationDate: logo.createdAt,
        copyrightStatus: logo.copyrightStatus,
        copyrightApplicationNumber: logo.copyrightApplicationNumber,
        trademarkStatus: logo.trademarkStatus,
        trademarkApplicationNumber: logo.trademarkApplicationNumber,
        patentStatus: logo.patentStatus,
        patentApplicationNumber: logo.patentApplicationNumber,
        transactionHash: logo.transactionHash,
        blockNumber: undefined, // Will be set when minted
      };
      
      const certificatePdf = await generatePriorArtCertificate(registration);
      
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
      
      const registration = {
        id: logo.id,
        fileName: logo.fileName,
        fileHash: logo.fileHash,
        ipfsHash: logo.ipfsHash,
        userId,
        userEmail: user?.email || 'Not provided',
        companyName: collection?.companyName || req.body.companyName || 'Not specified',
        description: logo.description,
        ownershipDescription: logo.ownershipDescription,
        intendedUse: logo.intendedUse,
        registrationDate: logo.createdAt,
        copyrightStatus: logo.copyrightStatus,
        copyrightApplicationNumber: logo.copyrightApplicationNumber,
        trademarkStatus: logo.trademarkStatus,
        trademarkApplicationNumber: logo.trademarkApplicationNumber,
        patentStatus: logo.patentStatus,
        patentApplicationNumber: logo.patentApplicationNumber,
        transactionHash: logo.transactionHash,
        blockNumber: undefined,
      };
      
      const dmcaPdf = await generateDMCATakedownNotice(registration, {
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
        platform: req.body.platform,
        platformName: req.body.platformName,
        usageType: req.body.usageType,
        url: req.body.url,
        description: req.body.description,
        isActive: true,
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

  const httpServer = createServer(app);
  return httpServer;
}
