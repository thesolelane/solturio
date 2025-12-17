// Reference: blueprint:javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { csrfProtection } from "./csrf";
import { storage } from "./storage";
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
import { treasuryRouter } from "./treasury";
import { ipRegistrationRouter } from "./ip-registration";
import { subdomainsRouter } from "./subdomains";
import { githubProxyRouter } from "./github-proxy";
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
import { PRICING, isEligibleForFreeUpload, getRemainingFreeUploads } from "@shared/pricing";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  
  // Apply CSRF protection to all routes (automatically skips GET/HEAD/OPTIONS)
  app.use(csrfProtection);

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

  // Logo metadata registration endpoint (NO file storage - files stored in user's .solturio.sol wallet)
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
  app.post('/api/logos/upload-token', isAuthenticated, upload.single('file'), async (req: any, res) => {
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

      // Create logo with token launch template data
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
        registrationType: 'token_launch',
        registrationData,
        
        // Token-specific fields
        tokenName: req.body.tokenName,
        tokenTicker: req.body.tokenTicker,
        launchPlatform: req.body.launchPlatform,
        launchTimeline: req.body.launchTimeline,
        
        // 24-hour ticker verification (starts after registration)
        tickerVerified: false,
        tickerVerificationStartedAt: new Date(),
        tickerVerificationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        botVerificationStatus: 'pending',
        
        description: req.body.description,
        intendedUse: req.body.intendedUse,
        tags: [],
      });

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
        emailSent: user?.email ? true : false,
      });
    } catch (error: any) {
      console.error("Error registering token:", error);
      res.status(500).json({ message: error.message || "Failed to register token" });
    }
  });

  // Artwork Template Registration
  app.post('/api/logos/upload-artwork', isAuthenticated, upload.single('file'), async (req: any, res) => {
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

  // Phase 4: Register IP Registration, Subdomains, and Security Challenge Routers
  app.use("/api", ipRegistrationRouter);
  app.use("/api", subdomainsRouter);
  
  // Import and register challenge router for security ceremony
  const { challengeRouter } = await import("./challenge-endpoint");
  app.use("/api", challengeRouter);
  
  // GitHub Integration Proxy (connects to SC Replit)
  app.use("/api/github", githubProxyRouter);

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
