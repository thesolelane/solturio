/**
 * Phase 4: Smart Contract Integration
 * - IP registration on-chain
 * - IPFS metadata storage
 * - Transaction verification
 */

import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";

const SOLANA_CLUSTER = process.env.SOLANA_CLUSTER || "devnet";
const CATH_MINT = "48rmvKgpGpUNUuH3n2UYTZS2AUxZEkaCiNjQ57q1duMA";
const TREASURY_CATH_ACCOUNT = process.env.TREASURY_CATH_ACCOUNT || "";

export const connection = new Connection(clusterApiUrl(SOLANA_CLUSTER as any));

/**
 * CRITICAL FIX: Verify transaction on-chain before accepting
 */
export async function verifyTransactionOnChain(
  txHash: string,
  expectedAmount: bigint,
  expectedMint: string = CATH_MINT
) {
  try {
    // Fetch transaction from blockchain
    const tx = await connection.getParsedTransaction(txHash, "confirmed");
    
    if (!tx || !tx.transaction) {
      return { valid: false, error: "Transaction not found on-chain" };
    }

    // Verify transaction succeeded
    if (tx.meta?.err) {
      return { valid: false, error: "Transaction failed on-chain" };
    }

    // Find SPL token transfer instruction
    const instructions = tx.transaction.message.instructions;
    let foundTransfer = false;

    for (const ix of instructions) {
      if ("parsed" in ix && ix.program === "spl-token") {
        const parsed = ix.parsed as any;
        
        if (parsed.type === "transferChecked") {
          // Verify transfer details
          if (parsed.mint !== expectedMint) {
            return { valid: false, error: `Wrong token mint: expected ${expectedMint}, got ${parsed.mint}` };
          }

          const transferAmount = BigInt(parsed.tokenAmount.amount);
          if (transferAmount !== expectedAmount) {
            return { valid: false, error: `Wrong amount: expected ${expectedAmount}, got ${transferAmount}` };
          }

          foundTransfer = true;
          break;
        }
      }
    }

    if (!foundTransfer) {
      return { valid: false, error: "No SPL token transfer found in transaction" };
    }

    return { valid: true, timestamp: new Date(tx.blockTime! * 1000).toISOString() };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Register IP on-chain via smart contract
 */
export async function registerIPOnChain(params: {
  fileHash: string;
  metadataUri: string;
  registrationType: "artwork" | "tokenLogo";
  paymentTier: "standard" | "premium";
  txHash: string;
}) {
  try {
    // TODO: Call actual smart contract instruction
    // For now, mock the SC call
    return {
      success: true,
      blockchainTxHash: `mock_${params.txHash}`,
      registered: true,
      timestamp: new Date().toISOString(),
      explorer: `https://solscan.io/tx/${params.txHash}?cluster=${SOLANA_CLUSTER}`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Store IPFS metadata mapping on-chain
 */
export async function storeIPFSMetadataOnChain(params: {
  fileHash: string;
  ipfsHash: string;
  metadataUri: string;
  txHash?: string;
}) {
  try {
    // TODO: Call actual smart contract instruction
    // For now, mock the SC call
    return {
      success: true,
      stored: true,
      timestamp: new Date().toISOString(),
      proof: {
        fileHash: params.fileHash,
        ipfsHash: params.ipfsHash,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Initialize subdomain on-chain
 */
export async function initializeSubdomainOnChain(params: {
  subdomain: string;
  walletAddress: string;
}) {
  try {
    // Validate wallet address
    new PublicKey(params.walletAddress);

    // TODO: Call actual smart contract instruction
    // For now, mock the SC call
    return {
      success: true,
      subdomain: params.subdomain,
      solturioDomain: `${params.subdomain}.solturio.sol`,
      wallet: params.walletAddress,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
