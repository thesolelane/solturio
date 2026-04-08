import { Router } from "express";
import { isAuthenticated } from "./replitAuth";
import { requireActiveSubscription } from "./subscription-routes";
import { storage } from "./storage";
import { upload, generateThumbnail, extractImageMetadata, THUMBNAILS_DIR } from "./upload-helpers";
import { uploadToIPFS, uploadJSONToIPFS, generateLogoMetadata } from "./ipfs";
import {
  generatePriorArtCertificate,
  generateDMCATakedownNotice,
} from "./legal-documents";
import { sendRegistrationConfirmation, sendNFTMintingStarted } from "./services/email";
import { createVerifiedImage, isCompositableImage } from "./services/image-compositing";
import { VERIFICATION_ASSETS } from "@shared/verification-assets";
import { arweaveService } from "./services/arweave";
import {
  PRICING,
  isEligibleForFreeUpload,
  getRemainingFreeUploads,
} from "@shared/pricing";
import { randomUUID } from "crypto";
import { createHash } from "crypto";
import path from "path";
import fs from "fs/promises";

export const logoRouter = Router();

logoRouter.post(
  "/logos/upload",
  isAuthenticated,
  requireActiveSubscription,
  upload.array("logos", 50),
  async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const files = req.files as Express.Multer.File[];

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

      const collection = await storage.createCollection({
        userId,
        name: `Collection ${new Date().toISOString().split("T")[0]}`,
        companyName: req.body.companyName || "My Company",
        status: "draft",
      });

      const registeredLogos = [];

      if (hasFiles) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const description = req.body[`description_${i}`] || "";
          const ownershipDescription = req.body[`ownership_${i}`] || "";
          const intendedUse = req.body[`intended_use_${i}`] || "";
          const copyrightStatus = req.body[`copyright_status_${i}`] || null;
          const copyrightAppNumber = req.body[`copyright_app_${i}`] || null;
          const trademarkStatus = req.body[`trademark_status_${i}`] || null;
          const trademarkAppNumber = req.body[`trademark_app_${i}`] || null;
          const patentStatus = req.body[`patent_status_${i}`] || null;
          const patentAppNumber = req.body[`patent_app_${i}`] || null;

          const metadata = await extractImageMetadata(file.buffer, file.mimetype);

          const userWalletDomain = user?.solanaPublicKey
            ? `${user.solanaPublicKey.slice(0, 8).toLowerCase()}.solturio.sol`
            : "pending.solturio.sol";
          const storagePath = `${userWalletDomain}/logos/${randomUUID()}-${file.originalname}`;

          const logoId = randomUUID();

          const thumbnailUrl = await generateThumbnail(file.buffer, file.mimetype, logoId);

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
            copyrightFilingDate:
              copyrightStatus === "pending" || copyrightStatus === "registered"
                ? new Date()
                : null,
            trademarkStatus,
            trademarkApplicationNumber: trademarkAppNumber,
            trademarkFilingDate:
              trademarkStatus === "pending" || trademarkStatus === "registered"
                ? new Date()
                : null,
            patentStatus,
            patentApplicationNumber: patentAppNumber,
            patentFilingDate:
              patentStatus === "pending" || patentStatus === "registered" ? new Date() : null,
            tags: [],
          });

          registeredLogos.push({
            ...logo,
            instructions: `Store this file in your wallet at: ${storagePath}`,
            fileDataUrl: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
          });
        }
      }

      if (hasUrls) {
        for (let i = 0; i < imageUrls.length; i++) {
          const imageUrl = imageUrls[i];
          const index = files?.length || 0 + i;
          const description = req.body[`description_${index}`] || "";
          const ownershipDescription = req.body[`ownership_${index}`] || "";
          const intendedUse = req.body[`intended_use_${index}`] || "";
          const copyrightStatus = req.body[`copyright_status_${index}`] || null;
          const copyrightAppNumber = req.body[`copyright_app_${index}`] || null;
          const trademarkStatus = req.body[`trademark_status_${index}`] || null;
          const trademarkAppNumber = req.body[`trademark_app_${index}`] || null;
          const patentStatus = req.body[`patent_status_${index}`] || null;
          const patentAppNumber = req.body[`patent_app_${index}`] || null;

          const fileName = imageUrl.split("/").pop() || "image.png";
          const format = fileName.split(".").pop()?.toUpperCase() || "PNG";

          const logo = await storage.createLogo({
            userId,
            collectionId: collection.id,
            fileName,
            imageUrl,
            userWalletStoragePath: imageUrl,
            fileSize: 0,
            mimeType: `image/${format.toLowerCase()}`,
            fileHash: createHash("sha256").update(imageUrl).digest("hex"),
            width: 0,
            height: 0,
            format,
            colorPalette: [],
            dominantColor: null,
            description,
            ownershipDescription,
            intendedUse,
            copyrightStatus,
            copyrightApplicationNumber: copyrightAppNumber,
            copyrightFilingDate:
              copyrightStatus === "pending" || copyrightStatus === "registered"
                ? new Date()
                : null,
            trademarkStatus,
            trademarkApplicationNumber: trademarkAppNumber,
            trademarkFilingDate:
              trademarkStatus === "pending" || trademarkStatus === "registered"
                ? new Date()
                : null,
            patentStatus,
            patentApplicationNumber: patentAppNumber,
            patentFilingDate:
              patentStatus === "pending" || patentStatus === "registered" ? new Date() : null,
            tags: [],
          });

          registeredLogos.push({
            ...logo,
            imageUrl,
            message: `Image URL registered: ${imageUrl}`,
          });
        }
      }

      if (user?.email && registeredLogos.length > 0) {
        const firstLogo = registeredLogos[0];
        sendRegistrationConfirmation(user.email, firstLogo.fileName, collection.id).catch((err) =>
          console.error("Email send failed:", err)
        );
      }

      res.json({
        collectionId: collection.id,
        logos: registeredLogos,
        message: hasFiles
          ? "Logo metadata registered. Please store the image files in your .solturio.sol wallet."
          : "Logo URLs registered successfully.",
        walletDomain: user?.solanaPublicKey
          ? `${user.solanaPublicKey.slice(0, 8).toLowerCase()}.solturio.sol`
          : "pending.solturio.sol",
        emailSent: user?.email ? true : false,
      });
    } catch (error: any) {
      console.error("Error registering logo metadata:", error);
      res.status(500).json({ message: error.message || "Failed to register logo metadata" });
    }
  }
);

logoRouter.post(
  "/logos/upload-token",
  isAuthenticated,
  requireActiveSubscription,
  upload.single("file"),
  async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const file = req.file as Express.Multer.File;

      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const registrationData = JSON.parse(req.body.registrationData || "{}");

      const metadata = await extractImageMetadata(file.buffer, file.mimetype);

      const userWalletDomain = user?.solanaPublicKey
        ? `${user.solanaPublicKey.slice(0, 8).toLowerCase()}.solturio.sol`
        : "pending.solturio.sol";
      const storagePath = `${userWalletDomain}/tokens/${randomUUID()}-${file.originalname}`;

      const tokenCollection = await storage.createCollection({
        userId,
        name: req.body.tokenName || `Token ${req.body.tokenTicker || "Launch"}`,
        companyName: req.body.tokenName || "Token Project",
        symbol: req.body.tokenTicker || undefined,
        status: "draft",
        isPublic: req.body.isPublic !== "false",
      });

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

        registrationType: "token_launch",
        registrationData,

        tokenName: req.body.tokenName,
        tokenTicker: req.body.tokenTicker,
        launchPlatform: req.body.launchPlatform,
        launchTimeline: req.body.launchTimeline,

        tokenContractAddress: req.body.tokenContractAddress || null,
        tokenContractChain: req.body.tokenContractChain || null,
        tokenPoolAddress: req.body.tokenPoolAddress || null,
        tokenContractAddedAt: req.body.tokenContractAddress ? new Date() : null,

        tickerVerified: false,
        tickerVerificationStartedAt: new Date(),
        tickerVerificationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        botVerificationStatus: "pending",

        description: req.body.description,
        intendedUse: req.body.intendedUse,
        tags: [],
      });

      const { calculateRegistrationStrength } = await import("@shared/registration-strength");
      const strength = calculateRegistrationStrength({
        tokenName: req.body.tokenName,
        tokenTicker: req.body.tokenTicker,
        file: true,
        launchPlatform: req.body.launchPlatform,
        launchTimeline: req.body.launchTimeline,
        ...registrationData,
      });

      const rewardNote = strength.rewardsEligible
        ? "Rewards pending ticker verification"
        : "Complete required fields and verify ticker to earn rewards";

      if (user?.email) {
        sendRegistrationConfirmation(
          user.email,
          file.originalname,
          logo.id || "token-" + randomUUID()
        ).catch((err) => console.error("Email send failed:", err));
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
  }
);

logoRouter.post("/logos/:id/bind-contract", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const logoId = req.params.id;
    const { tokenContractAddress, tokenContractChain, tokenPoolAddress } = req.body;

    if (!tokenContractAddress || typeof tokenContractAddress !== "string") {
      return res.status(400).json({ message: "Contract address is required" });
    }
    if (tokenContractAddress.length < 20 || tokenContractAddress.length > 100) {
      return res.status(400).json({ message: "Invalid contract address length" });
    }

    const validChains = ["solana", "ethereum", "base", "arbitrum", "polygon", "other"];
    if (tokenContractChain && !validChains.includes(tokenContractChain)) {
      return res.status(400).json({ message: "Invalid chain specified" });
    }

    const logo = await storage.getLogoById(logoId);
    if (!logo) {
      return res.status(404).json({ message: "Logo not found" });
    }
    if (logo.userId !== userId) {
      return res.status(403).json({ message: "Not authorized to update this registration" });
    }
    if (logo.registrationType !== "token_launch") {
      return res
        .status(400)
        .json({ message: "Only token registrations can bind contract addresses" });
    }

    const updatedLogo = await storage.updateLogo(logoId, {
      tokenContractAddress,
      tokenContractChain: tokenContractChain || "solana",
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

logoRouter.get("/logos/:id/verification-status", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const logoId = req.params.id;
    const logos = await storage.getLogosByUserId(userId);
    const logo = logos.find((l: any) => l.id === logoId);

    if (!logo) {
      return res.status(404).json({ message: "Registration not found" });
    }
    if (logo.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const now = new Date();
    const deadline = logo.tickerVerificationDeadline
      ? new Date(logo.tickerVerificationDeadline)
      : null;
    const isExpired = deadline ? now > deadline : false;
    const isVerified = logo.tickerVerified === true;

    let status: "verified" | "pending" | "expired";
    if (isVerified) {
      status = "verified";
    } else if (isExpired) {
      status = "expired";
      if (logo.botVerificationStatus !== "expired") {
        storage.updateLogo(logoId, { botVerificationStatus: "expired" }).catch(() => {});
      }
    } else {
      status = "pending";
    }

    const { calculateRegistrationStrength } = await import("@shared/registration-strength");
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
      timeRemaining:
        deadline && !isExpired ? Math.max(0, deadline.getTime() - now.getTime()) : 0,
      botVerificationStatus: logo.botVerificationStatus || "pending",
      registrationStrength: strength,
      rewardsBlocked,
      rewardsBlockedReason: rewardsBlocked
        ? "Complete ticker verification to unlock rewards"
        : null,
    });
  } catch (error: any) {
    console.error("Error getting verification status:", error);
    res.status(500).json({ message: error.message || "Failed to get verification status" });
  }
});

logoRouter.post("/logos/:id/confirm-verification", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const logoId = req.params.id;
    const logos = await storage.getLogosByUserId(userId);
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

    const now = new Date();
    const deadline = logo.tickerVerificationDeadline
      ? new Date(logo.tickerVerificationDeadline)
      : null;
    if (deadline && now > deadline) {
      await storage.updateLogo(logoId, { botVerificationStatus: "expired" });
      return res.status(400).json({
        message:
          "Verification window has expired. Please restart the 24-hour verification period.",
        expired: true,
      });
    }

    const registrationData = (logo.registrationData || {}) as Record<string, any>;
    if (!registrationData.proofPostUrl1) {
      return res.status(400).json({
        message: "At least one proof post URL is required for verification",
      });
    }

    const { calculateRegistrationStrength } = await import("@shared/registration-strength");
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
        message:
          "Complete all required fields before confirming verification. Missing: " +
          strength.missingRequiredFields.join(", "),
        missingFields: strength.missingRequiredFields,
      });
    }

    await storage.updateLogo(logoId, {
      tickerVerified: true,
      botVerificationStatus: "verified",
    });

    const { awardReward } = await import("./rewards-service");
    const tokenReward = await awardReward(userId, "token_registered", logoId, "token_launch");

    let strongBonus = null;
    if (strength.tier === "strong" || strength.tier === "verified") {
      strongBonus = await awardReward(userId, "strong_registration", logoId, "token_launch");
    }

    const verifiedReward = await awardReward(userId, "ticker_verified", logoId, "token_launch");

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

logoRouter.post("/logos/:id/restart-verification", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const logoId = req.params.id;
    const logos = await storage.getLogosByUserId(userId);
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
      botVerificationStatus: "pending",
    });

    res.json({
      message: "Verification window restarted. You have 24 hours to complete verification.",
      tickerVerificationDeadline: newDeadline,
      botVerificationStatus: "pending",
    });
  } catch (error: any) {
    console.error("Error restarting verification:", error);
    res.status(500).json({ message: error.message || "Failed to restart verification" });
  }
});

logoRouter.post(
  "/logos/:id/generate-verified-media",
  isAuthenticated,
  async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logoId = req.params.id;
      const { assetTypes } = req.body;

      const logo = await storage.getLogoById(logoId);
      if (!logo) {
        return res.status(404).json({ message: "Logo not found" });
      }
      if (logo.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (!logo.tokenContractAddress) {
        return res.status(400).json({
          message: "Contract address must be bound first. Use /bind-contract endpoint.",
        });
      }

      const verificationMetadata = {
        chain: logo.tokenContractChain || "solana",
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

      const existingVersions = (logo.verifiedMediaVersions as any[]) || [];
      const newVersion = {
        type: assetTypes?.[0] || "logo",
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
  }
);

logoRouter.get("/logos/:id/download-verified", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const logoId = req.params.id;

    const logo = await storage.getLogoById(logoId);
    if (!logo) {
      return res.status(404).json({ message: "Logo not found" });
    }
    if (logo.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!logo.tokenContractAddress) {
      return res.status(400).json({
        message:
          "Contract address must be bound first before downloading the verification manifest.",
      });
    }

    const verifiedVersions = (logo.verifiedMediaVersions as any[]) || [];
    if (verifiedVersions.length === 0) {
      const verificationManifest = {
        version: "1.0",
        type: "solturio_verification_manifest",
        generated: new Date().toISOString(),
        token: {
          name: logo.tokenName,
          ticker: logo.tokenTicker,
          chain: logo.tokenContractChain || "solana",
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
          signature: createHash("sha256")
            .update(`${logo.id}:${logo.fileHash}:${logo.tokenContractAddress}`)
            .digest("hex"),
        },
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${logo.tokenTicker || "token"}_verification_manifest.json"`
      );
      return res.send(JSON.stringify(verificationManifest, null, 2));
    }

    const latestVersion = verifiedVersions[verifiedVersions.length - 1];
    const verificationManifest = {
      version: "1.0",
      type: "solturio_verification_manifest",
      generated: new Date().toISOString(),
      token: {
        name: logo.tokenName,
        ticker: logo.tokenTicker,
        chain: logo.tokenContractChain || "solana",
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
        signature: createHash("sha256")
          .update(`${logo.id}:${logo.fileHash}:${logo.tokenContractAddress}`)
          .digest("hex"),
      },
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${logo.tokenTicker || "token"}_verification_manifest.json"`
    );
    res.send(JSON.stringify(verificationManifest, null, 2));
  } catch (error: any) {
    console.error("Error downloading verification manifest:", error);
    res.status(500).json({ message: error.message || "Failed to download manifest" });
  }
});

logoRouter.post(
  "/logos/upload-artwork",
  isAuthenticated,
  requireActiveSubscription,
  upload.single("file"),
  async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const file = req.file as Express.Multer.File;

      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const registrationData = JSON.parse(req.body.registrationData || "{}");

      const metadata = await extractImageMetadata(file.buffer, file.mimetype);

      const userWalletDomain = user?.solanaPublicKey
        ? `${user.solanaPublicKey.slice(0, 8).toLowerCase()}.solturio.sol`
        : "pending.solturio.sol";
      const storagePath = `${userWalletDomain}/artwork/${randomUUID()}-${file.originalname}`;

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

        registrationType: "artwork",
        registrationData,

        description: req.body.description,
        intendedUse: req.body.intendedUse,
        tags: [],
      });

      if (user?.email) {
        sendRegistrationConfirmation(
          user.email,
          file.originalname,
          logo.id || "artwork-" + randomUUID()
        ).catch((err) => console.error("Email send failed:", err));
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
  }
);

logoRouter.get("/thumbnails/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    const sanitized = path.basename(filename);
    const thumbnailPath = path.join(THUMBNAILS_DIR, sanitized);

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

logoRouter.get("/logos", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const logos = await storage.getLogosByUserId(userId);
    res.json(logos);
  } catch (error) {
    console.error("Error fetching logos:", error);
    res.status(500).json({ message: "Failed to fetch logos" });
  }
});

logoRouter.get("/collections", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const collections = await storage.getCollectionsByUserId(userId);

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

logoRouter.get("/collections/:id", isAuthenticated, async (req: any, res) => {
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

logoRouter.patch("/collections/:id", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const collectionId = req.params.id;
    const { name, description } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
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
      description: description?.trim() || null,
    });
    res.json({ success: true, collection: updated });
  } catch (error) {
    console.error("Error updating collection:", error);
    res.status(500).json({ message: "Failed to update collection" });
  }
});

logoRouter.patch("/collections/:id/visibility", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const collectionId = req.params.id;
    const { isPublic } = req.body;

    if (typeof isPublic !== "boolean") {
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

logoRouter.post("/collections/:id/mint", isAuthenticated, async (req: any, res) => {
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

    if (collection.status === "minted" && collection.collectionAddress) {
      return res.json({
        success: true,
        message: "Collection already minted",
        collectionAddress: collection.collectionAddress,
        transactionHash: collection.transactionHash,
        ipfsMetadataHash: collection.ipfsMetadataHash,
        explorerUrl: collection.explorerUrl,
      });
    }

    const logos = await storage.getLogosByCollectionId(collectionId);
    if (logos.length === 0) {
      return res.status(400).json({ message: "Collection has no files" });
    }

    const verifiedImages: {
      logoId: string;
      verifiedIpfsHash: string;
      verifiedUrl: string;
      arweaveUrl?: string;
    }[] = [];

    const arweaveConfigured = arweaveService.isConfigured();
    if (!arweaveConfigured) {
      console.log("Arweave: Not configured - badge images will only be stored on IPFS");
    }

    for (const logo of logos) {
      if (logo.mimeType && isCompositableImage(logo.mimeType)) {
        try {
          const thumbnailPath = path.join(THUMBNAILS_DIR, `${logo.id}.jpg`);

          try {
            await fs.access(thumbnailPath);
            const thumbnailBuffer = await fs.readFile(thumbnailPath);

            const verifiedBuffer = await createVerifiedImage(thumbnailBuffer);

            const verifiedResult = await uploadToIPFS(
              verifiedBuffer,
              `verified-${logo.fileName?.replace(/\.[^/.]+$/, ".png") || "image.png"}`,
              {
                name: `verified-${logo.fileName || "image"}`,
                keyvalues: {
                  type: "verified_image",
                  originalLogoId: logo.id,
                  collectionId,
                  badgeCid: VERIFICATION_ASSETS.badge.cid,
                },
              }
            );

            let arweaveUrl: string | undefined;
            if (arweaveConfigured) {
              try {
                const arweaveResult = await arweaveService.uploadFile(
                  verifiedBuffer,
                  "image/png",
                  [
                    { name: "Logo-Id", value: logo.id },
                    { name: "Collection-Id", value: collectionId },
                    { name: "Original-Filename", value: logo.fileName || "image.png" },
                    { name: "Type", value: "verified-badge-image" },
                  ]
                );
                if (arweaveResult) {
                  arweaveUrl = arweaveResult.url;
                  console.log(
                    `Arweave: Uploaded verified image for logo ${logo.id}: ${arweaveUrl}`
                  );
                }
              } catch (arweaveError) {
                console.error(
                  `Arweave: Failed to upload verified image for logo ${logo.id}:`,
                  arweaveError
                );
              }
            }

            if (verifiedResult || arweaveUrl) {
              verifiedImages.push({
                logoId: logo.id,
                verifiedIpfsHash: verifiedResult?.ipfsHash || "",
                verifiedUrl:
                  arweaveUrl ||
                  `https://gateway.pinata.cloud/ipfs/${verifiedResult?.ipfsHash}`,
                arweaveUrl,
              });

              await storage.updateLogo(logo.id, {
                verifiedIpfsHash: verifiedResult?.ipfsHash || null,
                arweaveUrl: arweaveUrl || null,
              });
            }
          } catch (accessError) {
            console.log(
              `No thumbnail found for logo ${logo.id}, skipping verified image generation`
            );
          }
        } catch (error) {
          console.error(`Error creating verified image for logo ${logo.id}:`, error);
        }
      }
    }

    const getVerifiedHash = (logoId: string) =>
      verifiedImages.find((v) => v.logoId === logoId)?.verifiedIpfsHash || null;
    const getArweaveUrl = (logoId: string) =>
      verifiedImages.find((v) => v.logoId === logoId)?.arweaveUrl || null;

    const fileEntries = logos.map((logo, index) => ({
      index: index + 1,
      fileName: logo.fileName,
      fileHash: logo.fileHash,
      ipfsHash: logo.ipfsHash || null,
      verifiedIpfsHash: getVerifiedHash(logo.id),
      arweaveUrl: getArweaveUrl(logo.id),
      mimeType: logo.mimeType,
      fileSize: logo.fileSize,
      dimensions: logo.width && logo.height ? `${logo.width}x${logo.height}` : null,
      format: logo.format,
      description: logo.description || null,
    }));

    const nftMetadata = {
      name: collection.name,
      symbol: collection.symbol || "SOLTURIO",
      description:
        collection.description || `IP Protection Certificate for ${collection.name}`,

      owner: user.solanaPublicKey || "pending",
      ownerWallet: user.walletName || `${user.solanaPublicKey?.slice(0, 8)}.solturio.sol`,
      companyName: collection.companyName,
      copyrightYear: collection.copyrightYear || new Date().getFullYear(),

      registeredAt: collection.createdAt?.toISOString() || new Date().toISOString(),
      mintedAt: new Date().toISOString(),

      files: fileEntries,
      fileCount: logos.length,

      platform: "Solturio",
      version: "1.0",
      standard: "Metaplex Token Metadata",

      verificationNote:
        "Each file has a unique SHA-256 hash. Use fileHash to verify authenticity of any file in this collection.",
    };

    let ipfsMetadataHash = "pending";
    try {
      const metadataBuffer = Buffer.from(JSON.stringify(nftMetadata, null, 2));
      const ipfsResult = await uploadToIPFS(
        metadataBuffer,
        `${collection.name.replace(/\s+/g, "-")}-metadata.json`,
        {
          name: `${collection.name} Metadata`,
          keyvalues: {
            userId,
            collectionId,
            companyName: collection.companyName,
            fileCount: logos.length.toString(),
          },
        }
      );
      if (ipfsResult) {
        ipfsMetadataHash = ipfsResult.ipfsHash;
      }
    } catch (ipfsError) {
      console.error("IPFS metadata upload failed:", ipfsError);
    }

    const nftAddress = `cert_${(user.solanaPublicKey || "pending").slice(0, 8)}_${collectionId.slice(0, 8)}`;
    const transactionHash = ipfsMetadataHash;
    const explorerUrl = `https://solscan.io/token/${nftAddress}?cluster=devnet`;

    await storage.updateCollection(collectionId, {
      status: "minted",
      collectionAddress: nftAddress,
      transactionHash,
      explorerUrl,
      ipfsMetadataHash,
      nftMetadataJson: nftMetadata,
      mintedAt: new Date(),
    });

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

    if (user.email) {
      sendNFTMintingStarted(user.email, collection.name, collectionId).catch((err) =>
        console.error("Email send failed:", err)
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
      verifiedImages: verifiedImages.map((v) => ({
        fileName: logos.find((l) => l.id === v.logoId)?.fileName || "unknown",
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

logoRouter.post("/logos/:id/ipfs", isAuthenticated, async (req: any, res) => {
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

    if (logo.ipfsHash) {
      return res.json({
        ipfsHash: logo.ipfsHash,
        ipfsMetadataHash: logo.ipfsMetadataHash,
        gatewayUrl: `https://ipfs.io/ipfs/${logo.ipfsHash}`,
        message: "Already uploaded to IPFS",
      });
    }

    if (logo.imageUrl && !req.body.imageBuffer) {
      return res.status(400).json({
        message: "Please provide image data for IPFS upload",
      });
    }

    if (req.body.imageBuffer) {
      const imageBuffer = Buffer.from(req.body.imageBuffer, "base64");
      const ipfsResult = await uploadToIPFS(imageBuffer, logo.fileName, {
        name: logo.fileName,
        keyvalues: {
          userId,
          logoId,
          companyName: req.body.companyName,
        },
      });

      const metadata = generateLogoMetadata({
        fileName: logo.fileName,
        description: logo.description || "",
        ownershipDescription: logo.ownershipDescription || "",
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

logoRouter.get("/logos/:id/certificate", isAuthenticated, async (req: any, res) => {
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

    const collection = logo.collectionId ? await storage.getCollection(logo.collectionId) : null;

    const certificatePdf = await generatePriorArtCertificate({
      id: logo.id,
      fileName: logo.fileName,
      fileHash: logo.fileHash,
      ipfsHash: logo.ipfsHash ?? undefined,
      userId,
      userEmail: user.email || "Not provided",
      companyName: collection?.companyName || "Not specified",
      description: logo.description || "",
      ownershipDescription: logo.ownershipDescription || "",
      intendedUse: logo.intendedUse || "",
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

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="certificate-${logo.id}.pdf"`);
    res.send(certificatePdf);
  } catch (error: any) {
    console.error("Error generating certificate:", error);
    res.status(500).json({ message: error.message || "Failed to generate certificate" });
  }
});

logoRouter.post("/logos/:id/dmca", isAuthenticated, async (req: any, res) => {
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
    const collection = logo.collectionId ? await storage.getCollection(logo.collectionId) : null;

    const dmcaPdf = await generateDMCATakedownNotice(
      {
        id: logo.id,
        fileName: logo.fileName,
        fileHash: logo.fileHash,
        ipfsHash: logo.ipfsHash ?? undefined,
        userId,
        userEmail: user?.email || "Not provided",
        companyName: collection?.companyName || req.body.companyName || "Not specified",
        description: logo.description || "",
        ownershipDescription: logo.ownershipDescription || "",
        intendedUse: logo.intendedUse || "",
        registrationDate: logo.createdAt || new Date(),
        copyrightStatus: logo.copyrightStatus ?? undefined,
        copyrightApplicationNumber: logo.copyrightApplicationNumber ?? undefined,
        trademarkStatus: logo.trademarkStatus ?? undefined,
        trademarkApplicationNumber: logo.trademarkApplicationNumber ?? undefined,
        patentStatus: logo.patentStatus ?? undefined,
        patentApplicationNumber: logo.patentApplicationNumber ?? undefined,
        transactionHash: logo.transactionHash ?? undefined,
        blockNumber: undefined,
      },
      {
        infringingSite: req.body.infringingSite || "Unknown Site",
        infringementUrl: req.body.infringementUrl || "",
        infringementDescription:
          req.body.infringementDescription || "Unauthorized use of copyrighted material",
        contactEmail: req.body.contactEmail,
      }
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="dmca-${logo.id}.pdf"`);
    res.send(dmcaPdf);
  } catch (error: any) {
    console.error("Error generating DMCA notice:", error);
    res.status(500).json({ message: error.message || "Failed to generate DMCA notice" });
  }
});

logoRouter.post("/logos/:id/authorized-usage", isAuthenticated, async (req: any, res) => {
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

logoRouter.get("/logos/:id/authorized-usage", isAuthenticated, async (req: any, res) => {
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

    const usages = await storage.getAuthorizedUsagesByLogoId(logoId);
    res.json(usages);
  } catch (error: any) {
    console.error("Error fetching authorized usages:", error);
    res.status(500).json({ message: error.message || "Failed to fetch authorized usages" });
  }
});

logoRouter.get("/authorized-usages", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const usages = await storage.getAuthorizedUsagesByUserId(userId);
    res.json(usages);
  } catch (error: any) {
    console.error("Error fetching user authorized usages:", error);
    res.status(500).json({ message: error.message || "Failed to fetch authorized usages" });
  }
});

logoRouter.patch("/authorized-usage/:id", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const usageId = req.params.id;

    const usages = await storage.getAuthorizedUsagesByUserId(userId);
    const usage = usages.find((u) => u.id === usageId);

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

logoRouter.delete("/authorized-usage/:id", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const usageId = req.params.id;

    const usages = await storage.getAuthorizedUsagesByUserId(userId);
    const usage = usages.find((u) => u.id === usageId);

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

logoRouter.get("/pricing/status", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    const logos = await storage.getLogosByUserId(userId);
    const logoCount = logos.length;

    const isPremium = (user as any)?.wallet_type === "premium";
    const freeUploadsRemaining = isPremium ? 999 : getRemainingFreeUploads(logoCount);
    const isEligible = isPremium ? true : isEligibleForFreeUpload(logoCount);

    res.json({
      logoCount,
      freeUploadsRemaining,
      isEligibleForFreeUpload: isEligible,
      freeUploadLimit: isPremium ? "Unlimited" : PRICING.FREE_UPLOADS_LIMIT,
      isPremium,
      pricing: {
        minting: PRICING.MINTING_FEE,
        monthlyRental: PRICING.MONTHLY_RENTAL,
      },
      promotion: {
        active: true,
        message: isPremium
          ? "Premium Account: Unlimited free uploads!"
          : `Launch Special: First ${PRICING.FREE_UPLOADS_LIMIT} uploads free for small communities!`,
      },
    });
  } catch (error: any) {
    console.error("Error fetching pricing status:", error);
    res.status(500).json({ message: error.message || "Failed to fetch pricing status" });
  }
});
