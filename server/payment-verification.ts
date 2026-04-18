/**
 * Crypto Payment Verification System
 *
 * CRITICAL SECURITY: All payments MUST be verified on-chain before granting access
 *
 * Supported Cryptocurrencies:
 * - SOL (native Solana token)
 * - BONK (SPL token)
 * - Arweave (AR)
 * - CATH (SPL token with 50% discount)
 *
 * Verification Process:
 * 1. User submits transaction hash
 * 2. Backend fetches transaction from blockchain
 * 3. Validates transaction exists and is confirmed
 * 4. Checks correct recipient address (platform wallet)
 * 5. Validates payment amount matches expected price
 * 6. Verifies transaction is recent (within 24 hours)
 * 7. Prevents double-spending (transaction not already used)
 */

import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { env } from "./env";
import { getErrorMessage } from "./http-types";

/**
 * Platform wallet addresses (recipient addresses)
 * IMPORTANT: These should be stored in environment variables in production
 */
const PLATFORM_WALLETS = {
  SOL: env.platformSolWallet || "PLACEHOLDER_SOL_WALLET_ADDRESS",
  BONK: env.platformBonkWallet || "PLACEHOLDER_BONK_WALLET_ADDRESS",
  CATH: env.platformCathWallet || "PLACEHOLDER_CATH_WALLET_ADDRESS",
};

/**
 * Pricing in each cryptocurrency
 */
export const CRYPTO_PRICING = {
  WALLET_STANDARD: {
    SOL: 0.1,
    BONK: 100000, // Example: 100k BONK
    CATH: 50000, // 50% discount when using CATH
    ARWEAVE: 0.05, // Example: 0.05 AR
  },
  WALLET_PREMIUM: {
    SOL: 0.15,
    BONK: 150000,
    CATH: 75000, // 50% discount
    ARWEAVE: 0.075,
  },
  LOGO_REGISTRATION: {
    SOL: 0.05,
    BONK: 50000,
    CATH: 25000,
    ARWEAVE: 0.025,
  },
};

/**
 * SPL Token Program IDs
 */
const TOKEN_MINTS = {
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  CATH: "CATH_TOKEN_MINT_ADDRESS_PLACEHOLDER", // Replace with actual CATH mint address
};

interface ParsedTransferInstruction {
  type?: string;
  info: {
    destination?: string;
    source?: string;
    lamports?: number;
    mint?: string;
    amount?: string;
    tokenAmount?: {
      uiAmount?: number | string | null;
    };
  };
}

interface PaymentLookupStorage {
  getPaymentByTxHash(txHash: string): Promise<unknown>;
}

export interface PaymentVerificationResult {
  valid: boolean;
  reason?: string;
  transactionDetails?: {
    signature: string;
    amount: number;
    currency: string;
    sender: string;
    recipient: string;
    timestamp: number;
    confirmed: boolean;
  };
  error?: string;
}

/**
 * Create Solana connection
 * Uses environment variable or defaults to devnet for testing
 */
function getSolanaConnection(): Connection {
  const rpcUrl = env.solanaRpcUrl || "https://api.devnet.solana.com";
  return new Connection(rpcUrl, "confirmed");
}

/**
 * Verify SOL payment transaction
 * @param txHash Transaction signature/hash
 * @param expectedAmount Expected amount in SOL
 * @param expectedRecipient Expected recipient wallet address
 * @returns Verification result
 */
export async function verifySOLPayment(
  txHash: string,
  expectedAmount: number,
  expectedRecipient: string = PLATFORM_WALLETS.SOL
): Promise<PaymentVerificationResult> {
  try {
    const connection = getSolanaConnection();

    // Fetch transaction
    const transaction = await connection.getParsedTransaction(txHash, {
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction) {
      return {
        valid: false,
        reason: "Transaction not found on blockchain",
        error: "TRANSACTION_NOT_FOUND",
      };
    }

    // Check if transaction is confirmed
    if (!transaction.meta) {
      return {
        valid: false,
        reason: "Transaction not confirmed yet",
        error: "NOT_CONFIRMED",
      };
    }

    // Check if transaction succeeded
    if (transaction.meta.err) {
      return {
        valid: false,
        reason: "Transaction failed on blockchain",
        error: "TRANSACTION_FAILED",
      };
    }

    // Get transaction timestamp
    const timestamp = transaction.blockTime ? transaction.blockTime * 1000 : Date.now();
    const hoursSinceTransaction = (Date.now() - timestamp) / (1000 * 60 * 60);

    // Check if transaction is within 24 hours
    if (hoursSinceTransaction > 24) {
      return {
        valid: false,
        reason: "Transaction is too old (must be within 24 hours)",
        error: "TRANSACTION_EXPIRED",
      };
    }

    // Find the SOL transfer instruction
    const instructions = transaction.transaction.message.instructions;
    let foundTransfer = false;
    let actualAmount = 0;
    let sender = "";
    let recipient = "";

    for (const instruction of instructions) {
      // Check for system program transfer (SOL transfer)
      if ("parsed" in instruction && instruction.program === "system") {
        const parsed = instruction.parsed as ParsedTransferInstruction;
        if (parsed.type === "transfer") {
          const info = parsed.info;
          recipient = info.destination || "";
          sender = info.source || "";
          actualAmount = (info.lamports || 0) / LAMPORTS_PER_SOL;

          // Check if recipient matches expected wallet
          if (recipient === expectedRecipient) {
            foundTransfer = true;
            break;
          }
        }
      }
    }

    if (!foundTransfer) {
      return {
        valid: false,
        reason: `No SOL transfer found to platform wallet ${expectedRecipient}`,
        error: "RECIPIENT_MISMATCH",
      };
    }

    // Check amount (allow 1% variance for floating point)
    const amountVariance = Math.abs(actualAmount - expectedAmount) / expectedAmount;
    if (amountVariance > 0.01) {
      return {
        valid: false,
        reason: `Payment amount mismatch. Expected ${expectedAmount} SOL, got ${actualAmount} SOL`,
        error: "AMOUNT_MISMATCH",
        transactionDetails: {
          signature: txHash,
          amount: actualAmount,
          currency: "SOL",
          sender,
          recipient,
          timestamp,
          confirmed: true,
        },
      };
    }

    // All checks passed
    return {
      valid: true,
      transactionDetails: {
        signature: txHash,
        amount: actualAmount,
        currency: "SOL",
        sender,
        recipient,
        timestamp,
        confirmed: true,
      },
    };
  } catch (error: unknown) {
    console.error("Error verifying SOL payment:", error);
    return {
      valid: false,
      reason: "Failed to verify payment on blockchain",
      error: getErrorMessage(error) || "VERIFICATION_ERROR",
    };
  }
}

/**
 * Verify SPL token payment (BONK, CATH)
 * @param txHash Transaction signature
 * @param expectedAmount Expected token amount
 * @param tokenMint Token mint address (BONK or CATH)
 * @param expectedRecipient Expected recipient wallet
 * @returns Verification result
 */
export async function verifySPLTokenPayment(
  txHash: string,
  expectedAmount: number,
  tokenMint: string,
  expectedRecipient: string
): Promise<PaymentVerificationResult> {
  try {
    const connection = getSolanaConnection();

    // Fetch transaction
    const transaction = await connection.getParsedTransaction(txHash, {
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction) {
      return {
        valid: false,
        reason: "Transaction not found on blockchain",
        error: "TRANSACTION_NOT_FOUND",
      };
    }

    // Check confirmation
    if (!transaction.meta) {
      return {
        valid: false,
        reason: "Transaction not confirmed yet",
        error: "NOT_CONFIRMED",
      };
    }

    // Check success
    if (transaction.meta.err) {
      return {
        valid: false,
        reason: "Transaction failed on blockchain",
        error: "TRANSACTION_FAILED",
      };
    }

    // Check timestamp
    const timestamp = transaction.blockTime ? transaction.blockTime * 1000 : Date.now();
    const hoursSinceTransaction = (Date.now() - timestamp) / (1000 * 60 * 60);

    if (hoursSinceTransaction > 24) {
      return {
        valid: false,
        reason: "Transaction is too old (must be within 24 hours)",
        error: "TRANSACTION_EXPIRED",
      };
    }

    // Find token transfer instruction
    const instructions = transaction.transaction.message.instructions;
    let foundTransfer = false;
    let actualAmount = 0;
    let sender = "";
    let recipient = "";
    let tokenName = "Unknown Token";

    for (const instruction of instructions) {
      if ("parsed" in instruction && instruction.program === "spl-token") {
        const parsed = instruction.parsed as ParsedTransferInstruction;

        // Check for transfer or transferChecked
        if (parsed.type === "transfer" || parsed.type === "transferChecked") {
          const info = parsed.info;

          // Verify token mint matches
          if (info.mint && info.mint !== tokenMint) {
            continue;
          }

          sender = info.source || "";
          recipient = info.destination || "";
          actualAmount =
            parsed.type === "transferChecked"
              ? parseFloat(String(info.tokenAmount?.uiAmount || "0"))
              : parseFloat(info.amount || "0");

          // Determine token name
          if (tokenMint === TOKEN_MINTS.BONK) {
            tokenName = "BONK";
          } else if (tokenMint === TOKEN_MINTS.CATH) {
            tokenName = "CATH";
          }

          // Check recipient
          if (recipient === expectedRecipient) {
            foundTransfer = true;
            break;
          }
        }
      }
    }

    if (!foundTransfer) {
      return {
        valid: false,
        reason: `No ${tokenName} transfer found to platform wallet`,
        error: "RECIPIENT_MISMATCH",
      };
    }

    // Check amount (1% variance tolerance)
    const amountVariance = Math.abs(actualAmount - expectedAmount) / expectedAmount;
    if (amountVariance > 0.01) {
      return {
        valid: false,
        reason: `Payment amount mismatch. Expected ${expectedAmount} ${tokenName}, got ${actualAmount} ${tokenName}`,
        error: "AMOUNT_MISMATCH",
        transactionDetails: {
          signature: txHash,
          amount: actualAmount,
          currency: tokenName,
          sender,
          recipient,
          timestamp,
          confirmed: true,
        },
      };
    }

    // Success
    return {
      valid: true,
      transactionDetails: {
        signature: txHash,
        amount: actualAmount,
        currency: tokenName,
        sender,
        recipient,
        timestamp,
        confirmed: true,
      },
    };
  } catch (error: unknown) {
    console.error("Error verifying SPL token payment:", error);
    return {
      valid: false,
      reason: "Failed to verify token payment on blockchain",
      error: getErrorMessage(error) || "VERIFICATION_ERROR",
    };
  }
}

/**
 * Main payment verification function
 * Routes to appropriate verification based on payment type
 */
export async function verifyPayment(
  txHash: string,
  paymentType: "WALLET_STANDARD" | "WALLET_PREMIUM" | "LOGO_REGISTRATION",
  currency: "SOL" | "BONK" | "CATH" | "ARWEAVE"
): Promise<PaymentVerificationResult> {
  // Get expected amount based on payment type and currency
  const expectedAmount = CRYPTO_PRICING[paymentType][currency];

  if (!expectedAmount) {
    return {
      valid: false,
      reason: `Invalid payment type or currency: ${paymentType} / ${currency}`,
      error: "INVALID_PAYMENT_CONFIG",
    };
  }

  // Route to appropriate verification function
  switch (currency) {
    case "SOL":
      return verifySOLPayment(txHash, expectedAmount, PLATFORM_WALLETS.SOL);

    case "BONK":
      return verifySPLTokenPayment(txHash, expectedAmount, TOKEN_MINTS.BONK, PLATFORM_WALLETS.BONK);

    case "CATH":
      return verifySPLTokenPayment(txHash, expectedAmount, TOKEN_MINTS.CATH, PLATFORM_WALLETS.CATH);

    case "ARWEAVE":
      // TODO: Implement Arweave verification
      return {
        valid: false,
        reason: "Arweave payment verification not yet implemented",
        error: "NOT_IMPLEMENTED",
      };

    default:
      return {
        valid: false,
        reason: `Unsupported currency: ${currency}`,
        error: "UNSUPPORTED_CURRENCY",
      };
  }
}

/**
 * Check if transaction hash has already been used
 * Prevents double-spending attacks
 */
export async function isTransactionUsed(
  txHash: string,
  storage: PaymentLookupStorage
): Promise<boolean> {
  try {
    // Check if this transaction hash exists in payments table
    const existingPayment = await storage.getPaymentByTxHash(txHash);
    return !!existingPayment;
  } catch (error) {
    console.error("Error checking transaction usage:", error);
    // Fail-safe: assume transaction is used if we can't check
    return true;
  }
}
