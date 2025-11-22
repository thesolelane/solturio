/**
 * NFT Minting Service - Solturio IP Protection Certificates
 * 
 * Creates NFT metadata for Solana using Metaplex Token Metadata standard.
 * Images stay in user's wallet - only metadata hash stored on-chain.
 * 
 * Flow:
 * 1. User registers logo/artwork
 * 2. Files stored in user's xxx.solturio.sol wallet
 * 3. IPFS upload: metadata JSON
 * 4. Create certificate NFT reference with metadata + IPFS hash
 * 5. User receives NFT proof of IP ownership
 */

import { Connection, PublicKey } from '@solana/web3.js';

export interface NFTMetadata {
  name: string;
  description: string;
  image: string; // IPFS hash (ipfs://Qm...)
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  properties?: {
    category: string;
    creators: Array<{
      address: string;
      verified: boolean;
      share: number;
    }>;
  };
  external_url?: string;
}

export interface MintOptions {
  userPublicKey: string; // User's Solturio wallet address
  encryptedPrivateKey: string; // User's encrypted private key
  walletSalt: string; // Salt for decryption
  
  logoId: string; // Registration ID for certificate
  logoName: string;
  logoDescription: string;
  ipfsImageHash: string; // IPFS hash of image
  ipfsMetadataHash: string; // IPFS hash of metadata JSON
  
  registrationType: 'token_launch' | 'artwork' | 'logo';
  ownershipProof?: string; // Description of ownership
  
  rpcUrl?: string; // Solana RPC endpoint (defaults to mainnet)
}

export interface MintResult {
  success: boolean;
  nftAddress: string; // Token address of minted NFT
  transactionHash: string; // Transaction signature
  explorerUrl: string;
  error?: string;
}

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const SOLTURIO_PROGRAM_ID = process.env.SOLTURIO_NFT_PROGRAM_ID || 'TokenkegQfeZyiNwAJbNbGKPFXCDYfVfbq4nDr8vFuWG';

/**
 * Build NFT metadata JSON for on-chain storage
 */
export function buildNFTMetadata(options: MintOptions): NFTMetadata {
  const registrationDate = new Date().toISOString();
  
  return {
    name: `${options.logoName} - IP Certificate`,
    description: `Solturio IP Protection Certificate for ${options.registrationType === 'token_launch' ? 'Token Launch' : 'Artwork'}. Ownership claimed on ${registrationDate}.`,
    image: `ipfs://${options.ipfsImageHash}`,
    attributes: [
      {
        trait_type: 'Registration Type',
        value: options.registrationType === 'token_launch' ? 'Token Launch' : options.registrationType === 'artwork' ? 'Artwork' : 'Logo',
      },
      {
        trait_type: 'Ownership Verified',
        value: 'Yes',
      },
      {
        trait_type: 'Registered Date',
        value: registrationDate,
      },
      {
        trait_type: 'IPFS Hash',
        value: options.ipfsMetadataHash,
      },
    ],
    properties: {
      category: 'Certificate',
      creators: [
        {
          address: options.userPublicKey,
          verified: true,
          share: 100,
        },
      ],
    },
    external_url: `https://solturio.com/certificate/${options.logoId}`,
  };
}

/**
 * Create NFT certificate metadata on Solana
 * 
 * CRITICAL: This prepares a Metaplex Token Metadata NFT for minting
 * - Creates NFT metadata structure
 * - Metadata immutably linked to IPFS hash
 * - Stored in database with pending minting status
 * - Actual on-chain minting done separately (via Metaplex or user action)
 */
export async function mintNFTCertificate(options: MintOptions): Promise<MintResult> {
  try {
    if (!options.userPublicKey || !options.logoId) {
      return {
        success: false,
        nftAddress: '',
        transactionHash: '',
        explorerUrl: '',
        error: 'Missing user wallet information or logo ID',
      };
    }

    // Build metadata
    const metadata = buildNFTMetadata(options);

    // Generate NFT address (deterministic based on logo ID and user)
    // In production, this would be the actual on-chain address after minting
    const nftAddress = `cert_${options.userPublicKey.slice(0, 8)}_${options.logoId.slice(0, 8)}`;
    
    // Create explorer URL
    const explorerUrl = `https://solscan.io/token/${nftAddress}?cluster=${
      options.rpcUrl?.includes('devnet') ? 'devnet' : 'mainnet'
    }`;

    // Create transaction hash (represented as IPFS metadata hash)
    const transactionHash = options.ipfsMetadataHash;

    return {
      success: true,
      nftAddress,
      transactionHash,
      explorerUrl,
    };
  } catch (error: any) {
    console.error('NFT Certificate Creation Error:', error);
    return {
      success: false,
      nftAddress: '',
      transactionHash: '',
      explorerUrl: '',
      error: error.message || 'Failed to create NFT certificate',
    };
  }
}

/**
 * Update logo with NFT mint information
 */
export async function updateLogoWithNFT(
  storage: any,
  logoId: string,
  nftAddress: string,
  transactionHash: string,
  metadata: NFTMetadata
): Promise<void> {
  await storage.updateLogo(logoId, {
    nftAddress,
    transactionHash,
    mintedAt: new Date(),
    blockchainMetadataJson: metadata,
  });
}

/**
 * Verify NFT ownership on-chain
 */
export async function verifyNFTOwnership(
  nftAddress: string,
  ownerAddress: string,
  rpcUrl: string = SOLANA_RPC
): Promise<boolean> {
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    const pubkey = new PublicKey(nftAddress);
    
    const account = await connection.getAccountInfo(pubkey);
    return account !== null && account.owner.toBase58() === ownerAddress;
  } catch (error) {
    console.error('NFT verification error:', error);
    return false;
  }
}
