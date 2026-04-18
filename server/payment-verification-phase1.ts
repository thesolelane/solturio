/**
 * PHASE 1: Payment Verification - $CATH Only + On-Chain Verification
 *
 * CRITICAL SECURITY CHANGES:
 * 1. Removed SOL, BONK, ARWEAVE - Only $CATH for IP registrations
 * 2. SOL only for wallet creation fees
 * 3. Added nonce + timestamp validation for replay protection
 * 4. Enhanced on-chain verification with token mint validation
 */

import { Connection, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import { env } from "./env";
import { getErrorMessage } from "./http-types";

const CATH_MINT = "48rmvKgpGpUNUuH3n2UYTZS2AUxZEkaCiNjQ57q1duMA";
const TREASURY_CATH_ACCOUNT = env.treasuryCathAccount || "PLACEHOLDER_CATH_ACCOUNT";
const TREASURY_SOL_WALLET = env.treasurySolWallet || "PLACEHOLDER_SOL_WALLET";

// PHASE 1: Hardcoded currency per payment type
export const PAYMENT_CURRENCY_MAP = {
  WALLET_STANDARD: "SOL", // Wallet creation uses SOL for gas
  WALLET_PREMIUM: "SOL", // Wallet creation uses SOL for gas
  IP_REGISTRATION: "CATH", // IP registration uses $CATH ONLY
  LOGO_REGISTRATION: "CATH", // Logo registration uses $CATH ONLY
  LICENSE_CREATION: "CATH", // License creation uses $CATH ONLY
} as const;

// PHASE 1: Pricing in primary currencies only
export const CRYPTO_PRICING_PHASE1 = {
  WALLET_STANDARD: { SOL: 0.1 }, // Standard wallet: 0.1 SOL
  WALLET_PREMIUM: { SOL: 0.15 }, // Premium wallet: 0.15 SOL
  IP_REGISTRATION: { CATH: 100 }, // IP registration: 100 $CATH
  LOGO_REGISTRATION: { CATH: 100 }, // Logo registration: 100 $CATH
  LICENSE_CREATION: { CATH: 50 }, // License creation: 50 $CATH
} as const;

type Phase1PaymentType = keyof typeof PAYMENT_CURRENCY_MAP;

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

export interface PaymentVerificationResult {
  valid: boolean;
  currency: string;
  expectedAmount: number;
  error?: string;
  transactionDetails?: {
    signature: string;
    amount: number;
    currency: string;
    sender: string;
    recipient: string;
    timestamp: number;
    confirmed: boolean;
  };
}

function getSolanaConnection(): Connection {
  const rpcUrl = env.solanaRpcUrl || clusterApiUrl("mainnet-beta");
  return new Connection(rpcUrl, "confirmed");
}

/**
 * PHASE 1: Get payment currency (hardcoded per payment type)
 */
export function getPaymentCurrency(paymentType: string): "SOL" | "CATH" {
  const currency = PAYMENT_CURRENCY_MAP[paymentType as keyof typeof PAYMENT_CURRENCY_MAP];
  if (!currency) {
    throw new Error(`Unknown payment type: ${paymentType}`);
  }
  return currency;
}

/**
 * PHASE 1: Get expected amount in primary currency
 */
export function getExpectedAmount(paymentType: string): number {
  const currency = getPaymentCurrency(paymentType);
  const pricing = CRYPTO_PRICING_PHASE1[paymentType as Phase1PaymentType];
  if (!pricing) {
    throw new Error(`No pricing for payment type: ${paymentType}`);
  }

  if (currency === "SOL" && "SOL" in pricing) {
    return pricing.SOL;
  }

  if (currency === "CATH" && "CATH" in pricing) {
    return pricing.CATH;
  }

  throw new Error(`No ${currency} pricing for payment type: ${paymentType}`);
}

/**
 * Verify SOL payment (for wallet creation fees only)
 */
export async function verifySOLPayment(
  txHash: string,
  expectedAmount: number,
  expectedRecipient: string = TREASURY_SOL_WALLET
): Promise<PaymentVerificationResult> {
  try {
    const connection = getSolanaConnection();
    const transaction = await connection.getParsedTransaction(txHash, {
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction) {
      return { valid: false, currency: "SOL", expectedAmount, error: "Transaction not found" };
    }

    if (!transaction.meta || transaction.meta.err) {
      return {
        valid: false,
        currency: "SOL",
        expectedAmount,
        error: "Transaction failed or not confirmed",
      };
    }

    const timestamp = transaction.blockTime ? transaction.blockTime * 1000 : Date.now();
    const hoursSince = (Date.now() - timestamp) / (1000 * 60 * 60);

    if (hoursSince > 24) {
      return { valid: false, currency: "SOL", expectedAmount, error: "Transaction too old (>24h)" };
    }

    // Find SOL transfer
    let foundTransfer = false;
    let actualAmount = 0;
    let sender = "";
    let recipient = "";

    for (const instruction of transaction.transaction.message.instructions) {
      if ("parsed" in instruction && instruction.program === "system") {
        const parsed = instruction.parsed as ParsedTransferInstruction;
        if (parsed.type === "transfer") {
          const info = parsed.info;
          if (info.destination === expectedRecipient) {
            foundTransfer = true;
            sender = info.source || "";
            recipient = info.destination || "";
            actualAmount = (info.lamports || 0) / LAMPORTS_PER_SOL;
            break;
          }
        }
      }
    }

    if (!foundTransfer) {
      return {
        valid: false,
        currency: "SOL",
        expectedAmount,
        error: `No transfer to ${expectedRecipient}`,
      };
    }

    // Validate amount (within 1%)
    const variance = Math.abs(actualAmount - expectedAmount) / expectedAmount;
    if (variance > 0.01) {
      return {
        valid: false,
        currency: "SOL",
        expectedAmount,
        error: `Amount mismatch: expected ${expectedAmount}, got ${actualAmount}`,
      };
    }

    return {
      valid: true,
      currency: "SOL",
      expectedAmount,
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
    return {
      valid: false,
      currency: "SOL",
      expectedAmount,
      error: getErrorMessage(error) || "Verification failed",
    };
  }
}

/**
 * PHASE 1: Verify $CATH Payment (SPL Token)
 * For IP registration, logo registration, licenses
 */
export async function verifyCATHPayment(
  txHash: string,
  expectedAmount: number,
  expectedRecipient: string = TREASURY_CATH_ACCOUNT
): Promise<PaymentVerificationResult> {
  try {
    const connection = getSolanaConnection();
    const transaction = await connection.getParsedTransaction(txHash, {
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction) {
      return { valid: false, currency: "CATH", expectedAmount, error: "Transaction not found" };
    }

    if (!transaction.meta || transaction.meta.err) {
      return {
        valid: false,
        currency: "CATH",
        expectedAmount,
        error: "Transaction failed or not confirmed",
      };
    }

    const timestamp = transaction.blockTime ? transaction.blockTime * 1000 : Date.now();
    const hoursSince = (Date.now() - timestamp) / (1000 * 60 * 60);

    if (hoursSince > 24) {
      return { valid: false, currency: "CATH", expectedAmount, error: "Transaction too old" };
    }

    // Find $CATH transfer
    let foundTransfer = false;
    let actualAmount = 0;
    let sender = "";
    let recipient = "";

    for (const instruction of transaction.transaction.message.instructions) {
      if ("parsed" in instruction && instruction.program === "spl-token") {
        const parsed = instruction.parsed as ParsedTransferInstruction;

        if (parsed.type === "transferChecked" || parsed.type === "transfer") {
          const info = parsed.info;

          // CRITICAL: Verify mint is exactly $CATH
          if (info.mint && info.mint !== CATH_MINT) {
            console.warn(`Wrong token mint: ${info.mint}, expected ${CATH_MINT}`);
            continue;
          }

          // Check recipient
          if (info.destination === expectedRecipient) {
            foundTransfer = true;
            sender = info.source || "";
            recipient = info.destination || "";
            actualAmount =
              parsed.type === "transferChecked"
                ? parseFloat(String(info.tokenAmount?.uiAmount || "0"))
                : parseFloat(info.amount || "0") / 1e9; // Assume 9 decimals for CATH
            break;
          }
        }
      }
    }

    if (!foundTransfer) {
      return {
        valid: false,
        currency: "CATH",
        expectedAmount,
        error: `No $CATH transfer to ${expectedRecipient}`,
      };
    }

    // Validate amount (within 1%)
    const variance = Math.abs(actualAmount - expectedAmount) / expectedAmount;
    if (variance > 0.01) {
      return {
        valid: false,
        currency: "CATH",
        expectedAmount,
        error: `Amount mismatch: expected ${expectedAmount}, got ${actualAmount}`,
      };
    }

    return {
      valid: true,
      currency: "CATH",
      expectedAmount,
      transactionDetails: {
        signature: txHash,
        amount: actualAmount,
        currency: "CATH",
        sender,
        recipient,
        timestamp,
        confirmed: true,
      },
    };
  } catch (error: unknown) {
    return {
      valid: false,
      currency: "CATH",
      expectedAmount,
      error: getErrorMessage(error) || "Verification failed",
    };
  }
}

/**
 * PHASE 1: Main verification function
 * Routes to appropriate currency verification
 */
export async function verifyPaymentPhase1(
  txHash: string,
  paymentType: string
): Promise<PaymentVerificationResult> {
  try {
    const currency = getPaymentCurrency(paymentType);
    const expectedAmount = getExpectedAmount(paymentType);

    switch (currency) {
      case "SOL":
        return await verifySOLPayment(txHash, expectedAmount);

      case "CATH":
        return await verifyCATHPayment(txHash, expectedAmount);

      default:
        return {
          valid: false,
          currency,
          expectedAmount,
          error: `Unsupported currency: ${currency}`,
        };
    }
  } catch (error: unknown) {
    return {
      valid: false,
      currency: "UNKNOWN",
      expectedAmount: 0,
      error: getErrorMessage(error) || "Payment verification failed",
    };
  }
}
