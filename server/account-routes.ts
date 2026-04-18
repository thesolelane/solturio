import { Router } from "express";
import type { Request } from "express";
import rateLimit from "express-rate-limit";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import {
  generateSolanaWallet as generateSolanaWalletNew,
  getNextAccountNumber,
  decryptData,
} from "./wallet";
import { type User } from "@shared/schema";
import { sendEmailVerificationEmail } from "./services/email";
import { env } from "./env";
import { getNextCeremonyRoute, resolveAppBaseUrl } from "./account-flow";

export const accountRouter = Router();

const sendVerificationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { message: "Too many verification email requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, trustProxy: false },
});

function getAppBaseUrl(req: Request): string {
  return resolveAppBaseUrl(env.baseUrl, req.protocol, req.get("host") ?? undefined);
}

accountRouter.post("/account/link-wallet", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { walletAddress } = req.body;

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({ message: "Invalid wallet address" });
    }

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

accountRouter.post(
  "/account/send-verification",
  sendVerificationRateLimiter,
  isAuthenticated,
  async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.email) {
        return res.status(400).json({ message: "No email address found" });
      }

      if (user.emailVerified) {
        return res.json({ message: "Email already verified", alreadyVerified: true });
      }

      const verification = await storage.createUserEmailVerification(userId);
      if (!verification) {
        return res.status(404).json({ message: "User not found" });
      }

      const verificationUrl =
        `${getAppBaseUrl(req)}/api/account/verify-email/` +
        `${encodeURIComponent(verification.verificationToken)}`;
      const sent = await sendEmailVerificationEmail(
        user.email,
        verificationUrl,
        user.firstName ?? user.lastName
      );

      if (!sent) {
        return res.status(503).json({
          message: "Email service unavailable. Verification email could not be sent.",
        });
      }

      res.json({ message: "Verification email sent" });
    } catch (error: any) {
      console.error("Error sending verification:", error);
      res.status(500).json({ message: error.message || "Failed to send verification email" });
    }
  }
);

accountRouter.get("/account/verify-email/:token", async (req, res) => {
  try {
    const verifiedUser = await storage.verifyUserEmail(req.params.token);
    const status = verifiedUser ? "success" : "invalid";

    res.redirect(`${getAppBaseUrl(req)}/account?emailVerification=${status}`);
  } catch (error: any) {
    console.error("Error verifying email:", error);
    res.redirect(`${getAppBaseUrl(req)}/account?emailVerification=error`);
  }
});

accountRouter.patch("/account/notifications", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { notifyPaymentsDue, notifyRentalReminders } = req.body;

    if (typeof notifyPaymentsDue !== "boolean" || typeof notifyRentalReminders !== "boolean") {
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

accountRouter.patch("/account/social-handles", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const {
      twitterHandle,
      telegramHandle,
      discordHandle,
      instagramHandle,
      telegramGroupLink,
      websiteUrl,
      bio,
    } = req.body;

    const cleanHandles: any = {};
    if (twitterHandle !== undefined) {
      cleanHandles.twitterHandle = twitterHandle ? twitterHandle.replace(/^@/, "") : null;
    }
    if (telegramHandle !== undefined) {
      cleanHandles.telegramHandle = telegramHandle ? telegramHandle.replace(/^@/, "") : null;
    }
    if (discordHandle !== undefined) {
      cleanHandles.discordHandle = discordHandle || null;
    }
    if (instagramHandle !== undefined) {
      cleanHandles.instagramHandle = instagramHandle ? instagramHandle.replace(/^@/, "") : null;
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

accountRouter.post("/account/generate-solturio-wallet", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Email verification required before wallet generation",
        requiresEmailVerification: true,
      });
    }

    if (user.solanaPublicKey) {
      return res.status(400).json({
        message: "Solturio wallet already exists",
        publicKey: user.solanaPublicKey,
      });
    }

    const allUsers = await storage.getAllUsers();
    const existingWalletNames = allUsers.map((u: User) => u.walletName).filter(Boolean) as string[];
    const accountNumber = getNextAccountNumber(existingWalletNames);

    const wallet = await generateSolanaWalletNew({
      walletType: "standard",
      accountNumber,
    });

    const updatedUser = await storage.createSolturioWallet(userId, {
      publicKey: wallet.publicKey,
      encryptedPrivateKey: wallet.encryptedPrivateKey,
      encryptedRecoveryPhrase: wallet.encryptedMnemonic,
      walletSalt: wallet.salt,
      walletType: wallet.walletType,
      walletName: wallet.walletName,
    });

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

accountRouter.post("/account/export-private-key", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.solanaPublicKey) {
      return res.status(400).json({
        message: "No wallet found. Please create a wallet first.",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Email verification required to export private key",
        requiresEmailVerification: true,
      });
    }

    if (!user.ceremonyCompleted || !user.recoveryPhraseVerified) {
      return res.status(403).json({
        message: "Complete the Key Handover Ceremony before exporting your private key.",
        requiresCeremony: true,
        ceremonyRoute: getNextCeremonyRoute(user),
      });
    }

    if (!user.solanaEncryptedPrivateKey || !user.walletSalt || !user.encryptedRecoveryPhrase) {
      return res.status(409).json({
        message:
          "This wallet is missing recovery material required for secure export. Please contact support before continuing.",
        missingExportMaterial: true,
      });
    }

    const privateKeyHex = await decryptData(user.solanaEncryptedPrivateKey, user.walletSalt);
    const privateKeyArray = Array.from(Buffer.from(privateKeyHex, "hex"));

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

accountRouter.post("/dex/verify", async (req, res) => {
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

accountRouter.post("/dex/report-copycat", async (req, res) => {
  try {
    const { originalLogoId, fraudulentTokenAddress, dexPlatform, evidenceUrl, reporterEmail } =
      req.body;
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

accountRouter.get("/verify/hash/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    const logos = await storage.getLogosByFileHash(hash);

    if (logos.length === 0) {
      return res.status(404).json({
        verified: false,
        message: "No registered logo found with this hash",
      });
    }

    const original = logos[0];
    const collection = original.collectionId
      ? await storage.getCollection(original.collectionId)
      : null;

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

accountRouter.get("/documents/solana-foundation-proposal", async (req, res) => {
  try {
    const { generateSolanaFoundationProposal } =
      await import("./documents/solana-foundation-proposal");
    const pdfBuffer = await generateSolanaFoundationProposal();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Solturio-Solana-Foundation-Proposal.pdf"
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating Solana Foundation proposal:", error);
    res.status(500).json({ error: "Failed to generate proposal" });
  }
});

accountRouter.post("/documents/dex-partnership-proposal", async (req, res) => {
  try {
    const { dexName } = req.body;
    const { generateDEXPartnershipProposal } = await import("./documents/dex-partnership-proposal");
    const pdfBuffer = await generateDEXPartnershipProposal(dexName || "Your Platform");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Solturio-DEX-Partnership-${dexName || "Proposal"}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating DEX partnership proposal:", error);
    res.status(500).json({ error: "Failed to generate proposal" });
  }
});
