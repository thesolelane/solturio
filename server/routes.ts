// Reference: blueprint:javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { csrfProtection } from "./csrf";
import { storage } from "./storage";
import { createHash, randomUUID } from "crypto";
import { isSolturioWallet, getRestrictionErrorMessage } from "./wallet-restrictions";
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
import { formatError } from "./error-handler";
import { auditLogger } from "./audit-logger";
import { Connection, PublicKey } from "@solana/web3.js";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { upload } from "./upload-helpers";

import { adminRouter } from "./admin-routes";
import { logoRouter } from "./logo-routes";
import { accountRouter } from "./account-routes";
import { ceremonyRouter } from "./ceremony-routes";
import { quizRouter } from "./quiz-routes";
import { visitorRouter } from "./visitor-routes";
import { receiptRouter } from "./receipt-routes";

const extensionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, trustProxy: false },
});

const extensionRegisterRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { message: "Registration rate limit exceeded, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, trustProxy: false },
});

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  app.use(csrfProtection);

  app.get("/api/health", (req, res) => {
    const telegramStatus = (global as any).telegramBotStatus || "unknown";
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        database: "online",
        telegram: telegramStatus,
        arweave: process.env.ARWEAVE_WALLET_KEY ? "configured" : "not_configured",
        pinata: process.env.PINATA_API_KEY ? "configured" : "not_configured",
        sendgrid: process.env.SENDGRID_API_KEY ? "configured" : "not_configured",
      },
    });
  });

  app.get("/api/tokenomics/on-chain-config", async (req, res) => {
    try {
      const SOLT_MINT_ADDRESS = process.env.SOLT_MINT_ADDRESS;

      if (!SOLT_MINT_ADDRESS) {
        return res.json(null);
      }

      try {
        const connection = new Connection(
          process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
          "confirmed"
        );

        const mintPubkey = new PublicKey(SOLT_MINT_ADDRESS);
        const mintInfo = await connection.getAccountInfo(mintPubkey);

        if (!mintInfo) {
          return res.json(null);
        }

        const data = mintInfo.data;
        const decimals = data[44];

        const supplyBuffer = data.slice(36, 44);
        const supply = supplyBuffer.readBigUInt64LE();
        const formattedSupply = (Number(supply) / Math.pow(10, decimals)).toLocaleString();

        const authorityBytes = data.slice(4, 36);
        const authority = new PublicKey(authorityBytes).toString();

        const freezeAuthorityOption = data[45];
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
            cliff: 180,
            duration: 730,
            interval: 30,
          },
          rewardPoolCap: "50,000,000 SOLT",
          lastUpdated: new Date().toISOString(),
        });
      } catch (rpcError) {
        console.error("Error fetching on-chain data:", rpcError);
        return res.json(null);
      }
    } catch (error) {
      console.error("Error in tokenomics config:", error);
      res.status(500).json({ message: "Failed to fetch on-chain configuration" });
    }
  });

  app.get("/api/public/search", async (req, res) => {
    try {
      const { query, type } = req.query as { query?: string; type?: string };

      if (!query || query.length < 2) {
        return res.json([]);
      }

      const searchQuery = query.toLowerCase().replace(/^[@$]/, "");
      const searchType = type || "all";

      const allCollections = await storage.getAllMintedCollections();

      const publicCollections = allCollections.filter((c) => c.isPublic !== false);
      const results = publicCollections.filter((collection) => {
        if (searchType === "ticker") {
          return collection.symbol?.toLowerCase().includes(searchQuery);
        } else if (searchType === "social") {
          const user = collection.user;
          return (
            user?.twitterHandle?.toLowerCase().includes(searchQuery) ||
            user?.telegramHandle?.toLowerCase().includes(searchQuery) ||
            user?.instagramHandle?.toLowerCase().includes(searchQuery) ||
            user?.discordHandle?.toLowerCase().includes(searchQuery)
          );
        } else {
          const user = collection.user;
          return (
            collection.name?.toLowerCase().includes(searchQuery) ||
            collection.symbol?.toLowerCase().includes(searchQuery) ||
            user?.twitterHandle?.toLowerCase().includes(searchQuery) ||
            user?.telegramHandle?.toLowerCase().includes(searchQuery) ||
            user?.instagramHandle?.toLowerCase().includes(searchQuery) ||
            user?.firstName?.toLowerCase().includes(searchQuery) ||
            user?.lastName?.toLowerCase().includes(searchQuery)
          );
        }
      });

      const publicResults = results.map((c) => ({
        id: c.id,
        name: c.name,
        symbol: c.symbol,
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

  app.get("/api/public/verify-wallet/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;

      if (!walletAddress || walletAddress.length < 32) {
        return res.status(400).json({ message: "Invalid wallet address" });
      }

      const user = await storage.getUserByWalletAddress(walletAddress);

      if (!user) {
        return res.json({
          verified: false,
          message: "No registered creator found for this wallet address",
          walletAddress,
        });
      }

      const collections = await storage.getCollectionsByUserId(user.id);
      const publicCollections = collections.filter(
        (c) => c.isPublic !== false && (c.status === "minted" || c.status === "complete")
      );

      res.json({
        verified: true,
        walletAddress,
        walletDomain: (user as any).solturioWalletDomain || null,
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
        collections: publicCollections.map((c) => ({
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

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post(
    "/api/extension/token",
    extensionRateLimiter,
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const jwtSecret = process.env.SESSION_SECRET;
        if (!jwtSecret) {
          return res.status(500).json({ message: "Server configuration error" });
        }

        const payload = {
          sub: userId,
          email: user.email,
          scopes: ["extension:verify", "extension:register", "read:portfolio"],
        };

        const token = jwt.sign(payload, jwtSecret, {
          expiresIn: "7d",
          issuer: "solturio.app",
          audience: "solturio-extension",
        });

        auditLogger.log({
          action: "extension_token_generated",
          userId,
          details: { scopes: payload.scopes },
        });

        res.json({ token });
      } catch (error) {
        console.error("Error generating extension token:", error);
        res.status(500).json({ message: "Failed to generate extension token" });
      }
    }
  );

  const isExtensionAuthenticated: any = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing or invalid authorization header" });
      }

      const token = authHeader.substring(7);
      const jwtSecret = process.env.SESSION_SECRET;

      if (!jwtSecret) {
        return res.status(500).json({ message: "Server configuration error" });
      }

      const decoded = jwt.verify(token, jwtSecret, {
        issuer: "solturio.app",
        audience: "solturio-extension",
      }) as { sub: string; email: string; scopes: string[] };

      req.extensionUser = {
        userId: decoded.sub,
        email: decoded.email,
        scopes: decoded.scopes,
      };

      next();
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Invalid token" });
      }
      console.error("Extension auth error:", error);
      res.status(401).json({ message: "Authentication failed" });
    }
  };

  const hasScope = (scopes: string[], required: string): boolean => {
    return scopes.includes(required);
  };

  app.post(
    "/api/extension/verify",
    extensionRateLimiter,
    isExtensionAuthenticated,
    async (req: any, res) => {
      try {
        if (!hasScope(req.extensionUser.scopes, "extension:verify")) {
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
        const collection = original.collectionId
          ? await storage.getCollection(original.collectionId)
          : null;

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
    }
  );

  app.get(
    "/api/extension/portfolio",
    extensionRateLimiter,
    isExtensionAuthenticated,
    async (req: any, res) => {
      try {
        if (!hasScope(req.extensionUser.scopes, "read:portfolio")) {
          return res.status(403).json({ message: "Insufficient permissions" });
        }

        const userId = req.extensionUser.userId;

        const collections = await storage.getCollectionsByUserId(userId);
        const logos = await storage.getLogosByUserId(userId);

        const stats = await storage.getUserStats(userId);

        res.json({
          collections: collections.map((c) => ({
            id: c.id,
            companyName: c.companyName,
            description: c.description,
            createdAt: c.createdAt,
          })),
          logos: logos.map((l) => ({
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
    }
  );

  app.post(
    "/api/extension/register",
    extensionRateLimiter,
    extensionRegisterRateLimiter,
    isExtensionAuthenticated,
    upload.single("file"),
    async (req: any, res) => {
      try {
        if (!hasScope(req.extensionUser.scopes, "extension:register")) {
          return res.status(403).json({ message: "Insufficient permissions" });
        }

        const userId = req.extensionUser.userId;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        if (!user.subscriptionStatus || user.subscriptionStatus !== "active") {
          return res.status(403).json({
            message: "Active subscription required",
            code: "SUBSCRIPTION_REQUIRED",
          });
        }

        if (!req.file) {
          return res.status(400).json({ message: "File is required" });
        }

        const { collectionId, description, sourceUrl } = req.body;

        const fileHash = createHash("sha256").update(req.file.buffer).digest("hex");

        const existing = await storage.getLogosByFileHash(fileHash);
        if (existing.length > 0) {
          const isOwner = existing[0].userId === userId;
          return res.status(409).json({
            message: "Content already registered",
            isOwner,
            existingRegistration: {
              id: existing[0].id,
              registrationDate: existing[0].createdAt,
            },
          });
        }

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
          description:
            description || `Registered via extension from ${sourceUrl || "unknown source"}`,
          ownershipDescription: "Registered via Solturio browser extension",
          intendedUse: "Digital content protection",
        });

        auditLogger.log({
          action: "extension_register",
          userId,
          details: {
            logoId,
            fileName: req.file.originalname,
            sourceUrl,
          },
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
    }
  );

  app.get(
    "/api/extension/me",
    extensionRateLimiter,
    isExtensionAuthenticated,
    async (req: any, res) => {
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
    }
  );

  app.get("/api/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Domain routers
  app.use("/api", adminRouter);
  app.use("/api", logoRouter);
  app.use("/api", accountRouter);
  app.use("/api", ceremonyRouter);
  app.use("/api", quizRouter);
  app.use("/api", visitorRouter);
  app.use("/api", receiptRouter);

  // Phase 2: License Management & Treasury
  app.use("/api", licensesRouter);
  app.use("/api", treasuryRouter);

  // Payment Model Routes
  app.use("/api", subscriptionRouter);
  app.use("/api", rewardsRouter);
  app.use("/api", tokensRouter);

  // License Smart Contract Routes
  app.use("/api/licenses", licenseRouter);

  // Phase 4: IP Registration, Subdomains, Security Challenge
  app.use("/api", ipRegistrationRouter);
  app.use("/api", subdomainsRouter);

  const { challengeRouter } = await import("./challenge-endpoint");
  app.use("/api", challengeRouter);

  // GitHub Integration Proxy
  app.use("/api/github", githubProxyRouter);

  // Music IP Protection Routes
  app.use("/api/music", musicRouter);

  // Watermark Protection API
  app.use("/api/watermark", watermarkRouter);

  applyValidationToRoutes(app);

  app.use((err: any, req: any, res: any, next: any) => {
    const requestId = req.requestId || `req_${Date.now()}`;
    const formatted = formatError(err, requestId);

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
