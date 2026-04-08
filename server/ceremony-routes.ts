import { Router } from "express";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import {
  generateSolanaWallet as generateSolanaWalletNew,
  getNextAccountNumber,
  validateCustomName,
  isWalletNameTaken,
  decryptData,
} from "./wallet";
import { verifyTransactionOnChain } from "./sc-integration";
import { isTransactionUsed } from "./payment-verification";
import {
  sendWalletCreated,
  sendNFTMintingStarted,
  sendDynamicReceipt,
  type LineItem,
} from "./services/email";
import {
  mintNFTCertificate,
  updateLogoWithNFT,
  buildNFTMetadata,
  type MintOptions,
} from "./services/nft-minting";
import { uploadToIPFS } from "./ipfs";
import { buildReceiptData } from "./receipt-routes";
import { type User } from "@shared/schema";

export const ceremonyRouter = Router();

ceremonyRouter.post("/wallet/create", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { walletType, customName, paymentTxHash, nonce, timestamp } = req.body;

    if (!nonce || !timestamp) {
      return res.status(400).json({
        error: "Missing security parameters: nonce and timestamp required",
      });
    }

    const { isValidNonce, isValidTimestamp, checkAndStoreNonce } = await import(
      "./utils/replay-prevention"
    );

    if (!isValidNonce(nonce)) {
      return res.status(400).json({ error: "Invalid nonce format" });
    }

    if (!isValidTimestamp(timestamp)) {
      return res
        .status(400)
        .json({ error: "Request expired (timestamp must be within 5 minutes)" });
    }

    const nonceCheck = await checkAndStoreNonce(storage, nonce);
    if (!nonceCheck.valid) {
      return res.status(400).json({ error: nonceCheck.reason || "Replay attack detected" });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.solanaPublicKey) {
      return res.status(400).json({
        error: "User already has a wallet",
        walletName: user.walletName,
        publicKey: user.solanaPublicKey,
      });
    }

    if (walletType !== "standard" && walletType !== "premium") {
      return res
        .status(400)
        .json({ error: "Invalid wallet type. Must be 'standard' or 'premium'" });
    }

    if (!paymentTxHash || typeof paymentTxHash !== "string") {
      return res.status(400).json({
        error: "Payment transaction hash required",
        requiredAmount: walletType === "standard" ? "0.1 SOL" : "0.15 SOL",
      });
    }

    const txAlreadyUsed = await isTransactionUsed(paymentTxHash, storage);
    if (txAlreadyUsed) {
      return res.status(400).json({
        error: "This transaction has already been used",
        details: "Each payment can only be used once. Please make a new payment.",
      });
    }

    const paymentAmountSOL =
      walletType === "standard" ? BigInt(100_000_000) : BigInt(150_000_000);
    const txVerification = await verifyTransactionOnChain(paymentTxHash, paymentAmountSOL);

    const paymentResult = txVerification.valid
      ? { valid: true, error: null }
      : { valid: false, error: txVerification.error };

    if (!paymentResult.valid) {
      console.error("Payment verification failed:", paymentResult);
      return res.status(402).json({
        error: "Payment verification failed",
        reason: paymentResult.error || "Unknown error",
        details: paymentResult.error,
        requiredAmount: walletType === "standard" ? "0.1 SOL" : "0.15 SOL",
        requiredCurrency: "SOL",
      });
    }

    console.log("Payment verified successfully:", {
      userId,
      txHash: paymentTxHash,
      walletType,
      timestamp: txVerification.valid ? (txVerification as any).timestamp : null,
    });

    const allUsers = await storage.getAllUsers();
    const existingWalletNames = allUsers
      .map((u: User) => u.walletName)
      .filter(Boolean) as string[];

    let accountNumber: number | undefined;
    let finalCustomName: string | undefined;

    if (walletType === "standard") {
      accountNumber = getNextAccountNumber(existingWalletNames);
    } else {
      if (!customName || !validateCustomName(customName)) {
        return res.status(400).json({
          error: "Premium wallet requires custom name (3-32 alphanumeric characters)",
        });
      }

      const proposedWalletName = `${customName.toLowerCase().replace(/[^a-z0-9]/g, "")}.solturio.sol`;
      if (isWalletNameTaken(proposedWalletName, existingWalletNames)) {
        return res.status(409).json({
          error: "Wallet name already taken",
          suggestion: `${customName}${Math.floor(Math.random() * 999)}`,
        });
      }

      finalCustomName = customName;
    }

    const walletResult = await generateSolanaWalletNew({
      walletType,
      customName: finalCustomName,
      accountNumber,
    });

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

    const walletPrice = walletType === "standard" ? "0.1" : "0.15";
    const walletCurrency = "SOL";
    const receiptLineItems: LineItem[] = [
      {
        description: `Solturio ${walletType === "standard" ? "Standard" : "Premium"} Wallet Creation (${walletResult.walletName})`,
        quantity: 1,
        unitPrice: walletPrice,
        currency: walletCurrency,
        subtotal: walletPrice,
      },
    ];

    const walletCustomerName =
      user.firstName || user.lastName
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
        : user.email || "Valued Customer";

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

    sendDynamicReceipt(walletReceipt).catch((err) =>
      console.error("Failed to send wallet receipt:", err)
    );

    if (user.email) {
      sendWalletCreated(user.email, walletResult.walletName).catch((err) =>
        console.error("Failed to send wallet notification:", err)
      );
    }

    res.json({
      success: true,
      wallet: {
        publicKey: walletResult.publicKey,
        walletName: walletResult.walletName,
        walletType: walletResult.walletType,
        isRestricted: true,
      },
      restrictions: {
        message: "This is a certificate wallet - SPL tokens and external NFTs are NOT allowed",
        allowedAssets: [
          "Platform-issued certificates",
          "IP registration records",
          "Smart contracts",
          "SOL (for transaction fees only)",
        ],
        prohibitedAssets: ["SPL tokens", "External NFTs", "Other cryptocurrencies"],
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

ceremonyRouter.get("/wallet/info", isAuthenticated, async (req: any, res) => {
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

ceremonyRouter.post("/wallet/check-name", isAuthenticated, async (req, res) => {
  try {
    const { customName } = req.body;

    if (!customName || typeof customName !== "string") {
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

    const cleanName = customName.toLowerCase().replace(/[^a-z0-9]/g, "");
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

ceremonyRouter.get("/ceremony/progress", isAuthenticated, async (req: any, res) => {
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

ceremonyRouter.post("/ceremony/stage", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { stage, data } = req.body;

    if (!stage || typeof stage !== "string") {
      return res.status(400).json({ error: "Stage name is required" });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const ceremonyStages = (user.ceremonyStages as Record<string, any>) || {};

    ceremonyStages[stage] = {
      completedAt: new Date().toISOString(),
      data: data || {},
    };

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

ceremonyRouter.get("/ceremony/recovery-phrase", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.encryptedRecoveryPhrase || !user.walletSalt) {
      return res.status(404).json({
        error: "No recovery phrase found. Create a wallet first.",
      });
    }

    const recoveryPhrase = await decryptData(user.encryptedRecoveryPhrase, user.walletSalt);

    const words = recoveryPhrase.split(" ");

    if (words.length !== 12) {
      console.error(`Invalid recovery phrase length: ${words.length}`);
      return res.status(500).json({ error: "Invalid recovery phrase format" });
    }

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

ceremonyRouter.get("/ceremony/challenge", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.encryptedRecoveryPhrase || !user.walletSalt) {
      return res
        .status(400)
        .json({ error: "No recovery phrase found. Please complete wallet creation first." });
    }

    const positions: number[] = [];
    while (positions.length < 3) {
      const num = Math.floor(Math.random() * 12) + 1;
      if (!positions.includes(num)) {
        positions.push(num);
      }
    }
    positions.sort((a, b) => a - b);

    const ceremonyStages = (user.ceremonyStages as Record<string, any>) || {};
    ceremonyStages.verificationChallenge = {
      positions,
      generatedAt: new Date().toISOString(),
    };

    await storage.updateUser(userId, {
      ceremonyStages,
    });

    res.json({
      positions,
      attemptsRemaining: Math.max(0, 3 - (user.verificationAttempts || 0)),
    });
  } catch (error) {
    console.error("Error generating challenge:", error);
    res.status(500).json({ error: "Failed to generate challenge" });
  }
});

ceremonyRouter.post("/ceremony/verify-phrase", isAuthenticated, async (req: any, res) => {
  try {
    const { word1, word2, word3 } = req.body;

    const userId = req.user.claims.sub;
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.recoveryPhraseVerified) {
      return res.json({
        verified: true,
        alreadyVerified: true,
        message: "Recovery phrase already verified",
      });
    }

    const currentAttempts = user.verificationAttempts || 0;
    if (currentAttempts >= 3) {
      return res.status(403).json({
        error: "Maximum verification attempts exceeded",
        attemptsRemaining: 0,
        locked: true,
      });
    }

    const ceremonyStages = (user.ceremonyStages as Record<string, any>) || {};
    const challenge = ceremonyStages.verificationChallenge;

    if (!challenge || !challenge.positions) {
      return res.status(400).json({ error: "No active challenge found" });
    }

    if (!user.encryptedRecoveryPhrase || !user.walletSalt) {
      return res
        .status(400)
        .json({ error: "No recovery phrase found. Please complete wallet creation first." });
    }

    const recoveryPhrase = await decryptData(user.encryptedRecoveryPhrase, user.walletSalt);

    const correctPhrase = recoveryPhrase.split(" ");

    if (correctPhrase.length !== 12) {
      console.error(`Invalid recovery phrase length: ${correctPhrase.length}`);
      return res.status(500).json({ error: "Invalid recovery phrase format" });
    }

    const positions = challenge.positions;
    const correctWord1 = correctPhrase[positions[0] - 1];
    const correctWord2 = correctPhrase[positions[1] - 1];
    const correctWord3 = correctPhrase[positions[2] - 1];

    const isValid =
      word1?.trim().toLowerCase() === correctWord1 &&
      word2?.trim().toLowerCase() === correctWord2 &&
      word3?.trim().toLowerCase() === correctWord3;

    const newAttempts = currentAttempts + 1;

    if (isValid) {
      await storage.updateUser(userId, {
        recoveryPhraseVerified: true,
        verificationAttempts: newAttempts,
      });

      res.json({
        verified: true,
        attemptsUsed: newAttempts,
      });
    } else {
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

ceremonyRouter.post("/ceremony/complete", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

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

ceremonyRouter.post("/ceremony/reset", isAuthenticated, async (req: any, res) => {
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

ceremonyRouter.post("/nft/mint", isAuthenticated, async (req: any, res) => {
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

    const logo = await storage.getLogoById(logoId);
    if (!logo) {
      return res.status(404).json({ message: "Logo not found" });
    }

    if (logo.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (logo.nftAddress) {
      return res.status(200).json({
        success: true,
        message: "Logo already minted",
        nftAddress: logo.nftAddress,
        transactionHash: logo.transactionHash,
        explorerUrl: `https://solscan.io/token/${logo.nftAddress}`,
      });
    }

    const mintOptions: MintOptions = {
      userPublicKey: user.solanaPublicKey || "pending",
      encryptedPrivateKey: user.solanaEncryptedPrivateKey || "",
      walletSalt: user.walletSalt || "",
      logoId,
      logoName: logoName || logo.fileName,
      logoDescription: logoDescription || logo.description || "",
      ipfsImageHash: logo.ipfsHash || "pending",
      ipfsMetadataHash: "pending",
      registrationType: (registrationType || logo.registrationType || "logo") as
        | "token_launch"
        | "artwork"
        | "logo",
      ownershipProof: logo.ownershipDescription || undefined,
    };

    const nftMetadata = buildNFTMetadata(mintOptions);

    let ipfsMetadataHash = "pending";
    try {
      const metadataBuffer = Buffer.from(JSON.stringify(nftMetadata));
      const ipfsResult = await uploadToIPFS(metadataBuffer, `${logoId}-metadata.json`);
      if (ipfsResult) {
        ipfsMetadataHash = ipfsResult.ipfsHash;
      }
    } catch (ipfsError) {
      console.error("IPFS metadata upload failed:", ipfsError);
    }

    mintOptions.ipfsMetadataHash = ipfsMetadataHash;

    const mintResult = await mintNFTCertificate(mintOptions);

    if (mintResult.success) {
      await updateLogoWithNFT(storage, logoId, mintResult.nftAddress, mintResult.transactionHash, nftMetadata);

      if (user.email) {
        sendNFTMintingStarted(user.email, logoName || logo.fileName, logoId).catch((err) =>
          console.error("Email send failed:", err)
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
