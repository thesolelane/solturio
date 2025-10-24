// Reference: blueprint:javascript_log_in_with_replit, blueprint:javascript_stripe
import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import Stripe from "stripe";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

// Stripe is optional in development - only required for payment endpoints
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
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

// Helper to extract color palette from image
async function extractImageMetadata(buffer: Buffer, mimetype: string) {
  try {
    if (mimetype === 'image/svg+xml') {
      // SVG doesn't have pixel dimensions, return defaults
      return {
        width: 512,
        height: 512,
        format: 'SVG',
        colorPalette: [],
        dominantColor: null,
      };
    }

    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    // Get dominant colors
    const stats = await image.stats();
    const dominantColor = `#${Math.round(stats.dominant.r).toString(16).padStart(2, '0')}${Math.round(stats.dominant.g).toString(16).padStart(2, '0')}${Math.round(stats.dominant.b).toString(16).padStart(2, '0')}`;

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format?.toUpperCase() || 'UNKNOWN',
      colorPalette: [dominantColor],
      dominantColor,
    };
  } catch (error) {
    console.error('Error extracting image metadata:', error);
    return {
      width: 0,
      height: 0,
      format: 'UNKNOWN',
      colorPalette: [],
      dominantColor: null,
    };
  }
}

// Pricing tiers
const PRICING_TIERS: Record<string, { max: number; price: number }> = {
  starter: { max: 5, price: 4900 }, // $49
  professional: { max: 20, price: 9900 }, // $99
  enterprise: { max: Infinity, price: 29900 }, // $299
};

function calculatePrice(logoCount: number): { tier: string; amount: number } {
  if (logoCount <= 5) {
    return { tier: 'starter', amount: PRICING_TIERS.starter.price };
  } else if (logoCount <= 20) {
    return { tier: 'professional', amount: PRICING_TIERS.professional.price };
  } else {
    return { tier: 'enterprise', amount: PRICING_TIERS.enterprise.price };
  }
}

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

  // Logo upload endpoint
  app.post('/api/logos/upload', isAuthenticated, upload.array('logos', 50), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

      // Process each file
      const uploadedLogos = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const description = req.body[`description_${i}`] || '';

        // Extract metadata
        const metadata = await extractImageMetadata(file.buffer, file.mimetype);

        // Save file
        const fileName = `${randomUUID()}-${file.originalname}`;
        const filePath = path.join(UPLOAD_DIR, fileName);
        await fs.writeFile(filePath, file.buffer);

        // Create logo record
        const logo = await storage.createLogo({
          userId,
          collectionId: collection.id,
          fileName: file.originalname,
          filePath: `/uploads/${fileName}`,
          fileSize: file.size,
          mimeType: file.mimetype,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          colorPalette: metadata.colorPalette,
          dominantColor: metadata.dominantColor,
          description: description.slice(0, 200),
          tags: [],
        });

        uploadedLogos.push(logo);
      }

      res.json({
        collectionId: collection.id,
        logos: uploadedLogos,
      });
    } catch (error: any) {
      console.error("Error uploading logos:", error);
      res.status(500).json({ message: error.message || "Failed to upload logos" });
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

  // Create payment intent
  app.get('/api/payment/create-intent/:collectionId', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ 
          message: "Payment processing is not configured. Stripe API keys are missing." 
        });
      }

      const userId = req.user.claims.sub;
      const collection = await storage.getCollection(req.params.collectionId);

      if (!collection || collection.userId !== userId) {
        return res.status(404).json({ message: "Collection not found" });
      }

      const logos = await storage.getLogosByCollectionId(collection.id);
      const { tier, amount } = calculatePrice(logos.length);

      // Get or create Stripe customer
      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: {
            userId: user.id,
          },
        });
        user = await storage.updateStripeCustomerId(userId, customer.id);
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        customer: user.stripeCustomerId,
        metadata: {
          collectionId: collection.id,
          logoCount: logos.length.toString(),
          tier,
        },
      });

      // Save payment record
      await storage.createPayment({
        userId,
        collectionId: collection.id,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: user.stripeCustomerId,
        amount,
        currency: 'usd',
        status: 'pending',
        logoCount: logos.length,
        pricingTier: tier,
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        amount,
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: error.message || "Failed to create payment intent" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    // Simple static file serving for uploads
    const filePath = path.join(UPLOAD_DIR, path.basename(req.path));
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).send('File not found');
      }
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
