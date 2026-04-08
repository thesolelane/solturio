/**
 * Wallet Restrictions for xxx.solturio.sol Platform Wallets
 *
 * CRITICAL SECURITY POLICY:
 * All xxx.solturio.sol wallets (both standard 001.solturio.sol and premium brandname.solturio.sol)
 * are RESTRICTED wallets that can ONLY hold:
 * - Platform-issued certificates (artwork registrations, token launch registrations)
 * - Platform-issued smart contracts
 * - IPFS content hashes
 * - SOL (for transaction fees only)
 *
 * These wallets CANNOT and MUST NOT accept:
 * - SPL tokens (fungible tokens)
 * - NFTs from external sources
 * - Any cryptocurrency other than SOL for fees
 *
 * Rationale:
 * - These are certificate wallets, not financial wallets
 * - Users fund them with 0.1-0.15 SOL for storage fees
 * - Preventing SPL tokens avoids user confusion and loss
 * - Clear separation between IP certificates and financial assets
 *
 * Enforcement:
 * - Blockchain-level validation before accepting any transaction
 * - Automatic rejection/burn of SPL tokens sent to these addresses
 * - UI warnings when users attempt prohibited actions
 */

import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";

/**
 * Token Program IDs for SPL token detection
 * These are the standard Solana token program addresses
 */
const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCDYfVfbq4nDr8vFuWG";
const SPL_TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

/**
 * Platform-approved program IDs
 * Only these programs can interact with xxx.solturio.sol wallets
 */
const APPROVED_PROGRAMS = [
  "11111111111111111111111111111111", // System Program (for SOL transfers and rent)
  "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo", // Memo Program (for platform notes)
  // Add platform's own smart contract program IDs here when deployed
];

export interface WalletRestrictionCheck {
  allowed: boolean;
  reason: string;
  violationType?: "SPL_TOKEN" | "UNAUTHORIZED_PROGRAM" | "NFT" | "UNKNOWN";
}

/**
 * Check if a wallet address is a Solturio platform wallet
 * @param walletName The wallet name (e.g., "001.solturio.sol" or "dragoncoin.solturio.sol")
 * @returns true if this is a platform wallet with restrictions
 */
export function isSolturioWallet(walletName: string): boolean {
  if (!walletName) return false;

  // Check for standard format: 001.solturio.sol
  if (/^\d{3}\.solturio\.sol$/.test(walletName)) {
    return true;
  }

  // Check for premium format: customname.solturio.sol
  if (/^[a-z0-9]{3,32}\.solturio\.sol$/.test(walletName.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Validate if a transaction is allowed for a Solturio platform wallet
 * @param transaction The Solana transaction to validate
 * @param walletPublicKey The public key of the Solturio wallet
 * @returns Validation result with allowed status and reason
 */
export function validateSolturioWalletTransaction(
  transaction: Transaction,
  walletPublicKey: PublicKey
): WalletRestrictionCheck {
  // Check each instruction in the transaction
  for (const instruction of transaction.instructions) {
    const programId = instruction.programId.toBase58();

    // Check if this is an SPL token instruction
    if (programId === SPL_TOKEN_PROGRAM_ID || programId === SPL_TOKEN_2022_PROGRAM_ID) {
      return {
        allowed: false,
        reason:
          "SPL tokens are not allowed in Solturio platform wallets. These wallets can only hold platform certificates and contracts.",
        violationType: "SPL_TOKEN",
      };
    }

    // Check if this is an associated token account instruction
    if (programId === ASSOCIATED_TOKEN_PROGRAM_ID) {
      return {
        allowed: false,
        reason:
          "Token accounts cannot be created for Solturio platform wallets. Use a separate financial wallet for tokens.",
        violationType: "SPL_TOKEN",
      };
    }

    // Check if program is in approved list
    if (!APPROVED_PROGRAMS.includes(programId)) {
      // Allow if this is a platform-specific program (to be added when deployed)
      // For now, reject unknown programs with a warning
      console.warn(`Unknown program attempting to interact with Solturio wallet: ${programId}`);

      return {
        allowed: false,
        reason: `This wallet can only interact with approved platform programs. Program ${programId} is not authorized.`,
        violationType: "UNAUTHORIZED_PROGRAM",
      };
    }
  }

  return {
    allowed: true,
    reason: "Transaction contains only approved instructions",
  };
}

/**
 * Validate a single instruction for Solturio wallet compatibility
 * @param instruction The transaction instruction to check
 * @returns Validation result
 */
export function validateSolturioWalletInstruction(
  instruction: TransactionInstruction
): WalletRestrictionCheck {
  const programId = instruction.programId.toBase58();

  // Reject SPL token operations
  if (programId === SPL_TOKEN_PROGRAM_ID || programId === SPL_TOKEN_2022_PROGRAM_ID) {
    return {
      allowed: false,
      reason: "SPL token operations are prohibited on Solturio platform wallets",
      violationType: "SPL_TOKEN",
    };
  }

  // Reject associated token account creation
  if (programId === ASSOCIATED_TOKEN_PROGRAM_ID) {
    return {
      allowed: false,
      reason: "Cannot create token accounts for Solturio platform wallets",
      violationType: "SPL_TOKEN",
    };
  }

  // Check against approved programs
  if (!APPROVED_PROGRAMS.includes(programId)) {
    return {
      allowed: false,
      reason: "Only approved platform programs can interact with Solturio wallets",
      violationType: "UNAUTHORIZED_PROGRAM",
    };
  }

  return {
    allowed: true,
    reason: "Instruction is approved",
  };
}

/**
 * Get user-friendly error message for wallet restriction violations
 * @param check The restriction check result
 * @returns User-friendly error message
 */
export function getRestrictionErrorMessage(check: WalletRestrictionCheck): string {
  if (check.allowed) {
    return "Transaction is allowed";
  }

  switch (check.violationType) {
    case "SPL_TOKEN":
      return (
        "🚫 Your xxx.solturio.sol wallet cannot accept SPL tokens.\n\n" +
        "This is a certificate wallet for storing your IP registrations, not a financial wallet.\n\n" +
        "Please use a separate Solana wallet (Phantom, Solflare, etc.) for tokens and NFTs.\n\n" +
        "Your Solturio wallet can only hold:\n" +
        "• Platform-issued certificates\n" +
        "• IP registration records\n" +
        "• Smart contracts\n" +
        "• Small amount of SOL for fees"
      );

    case "NFT":
      return (
        "🚫 Your xxx.solturio.sol wallet cannot accept external NFTs.\n\n" +
        "This wallet is for platform-issued certificates only.\n\n" +
        "Use a separate wallet for NFT collections."
      );

    case "UNAUTHORIZED_PROGRAM":
      return (
        "🚫 This operation is not authorized for Solturio platform wallets.\n\n" +
        "Your certificate wallet can only interact with approved platform programs.\n\n" +
        "For other blockchain operations, please use a standard Solana wallet."
      );

    default:
      return check.reason || "Transaction not allowed on Solturio platform wallet";
  }
}

/**
 * Estimate SOL needed for certificate storage
 * @param numberOfCertificates Number of certificates to store
 * @returns Estimated SOL needed
 */
export function estimateCertificateStorageCost(numberOfCertificates: number): number {
  // Solana rent exemption: approximately 0.00089088 SOL per account
  // Add buffer for transaction fees
  const perCertificateCost = 0.001; // ~$0.10 at $100/SOL
  const transactionFeeBuffer = 0.01; // Buffer for multiple transactions

  return numberOfCertificates * perCertificateCost + transactionFeeBuffer;
}

/**
 * Check if a wallet has sufficient SOL for certificates
 * @param currentBalance Current SOL balance in lamports
 * @param certificatesNeeded Number of certificates to create
 * @returns true if wallet has sufficient balance
 */
export function hasSufficientBalanceForCertificates(
  currentBalance: number,
  certificatesNeeded: number
): boolean {
  const requiredLamports = estimateCertificateStorageCost(certificatesNeeded) * 1_000_000_000;
  return currentBalance >= requiredLamports;
}
