# Solturio Platform Context for Browser Extension Development

This document provides everything needed to build the Solturio browser extension. It explains what Solturio is, its three-layer architecture, and how the extension integrates with each layer.

---

## What is Solturio?

Solturio is a **decentralized IP (Intellectual Property) protection platform** built on the Solana blockchain. It allows creators to:

1. **Register ownership** of logos, music, and code as blockchain-verified NFTs
2. **Create licenses** (called ISCLs) for others to legally use their IP
3. **Detect theft** when their logos appear on scam tokens or unauthorized sites
4. **Generate legal documents** (DMCA takedowns, cease & desist) with blockchain proof

**Target Users**: Brand owners, designers, musicians, developers, crypto projects

---

## Three-Layer Architecture

Solturio uses a decentralized three-layer architecture where no single layer controls the system:

```
┌─────────────────────────────────────────────────────────────────┐
│                     BROWSER EXTENSION                           │
│  (What you're building - interfaces with all three layers)      │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ SOLTURIO.APP  │     │ SOLTURIO.SOL  │     │ SOLTURIO.COM  │
│   (Layer 1)   │     │   (Layer 2)   │     │   (Layer 3)   │
│               │     │               │     │               │
│ Identity &    │     │ Blockchain    │     │ Public        │
│ Execution     │     │ Rules &       │     │ Verification  │
│ Authority     │     │ Ownership     │     │ Interface     │
└───────────────┘     └───────────────┘     └───────────────┘
```

---

## Layer 1: solturio.app (Identity & Execution)

**Purpose**: User authentication, wallet management, API endpoints, file processing

### What It Does

| Function | Description |
|----------|-------------|
| **User Authentication** | Replit Auth (OpenID Connect) for account login |
| **Wallet Creation** | Creates `xxx.solturio.sol` wallets for users |
| **File Processing** | Extracts metadata, generates SHA-256 hashes |
| **API Gateway** | All extension API calls go through here |
| **Session Management** | JWT tokens, refresh tokens |
| **Subscription Management** | Tracks who has paid for platform access |
| **IPFS Upload** | Uploads metadata JSON to Pinata |

### Extension API Endpoints

```typescript
// Base URL: https://solturio.app/api/extension/

// === AUTHENTICATION ===
POST /auth/init
  Request: { extensionId: string }
  Response: { authUrl: string, state: string }
  // Opens OAuth popup for user login

POST /auth/callback
  Request: { code: string, state: string }
  Response: { accessToken: string, refreshToken: string, user: User }
  // Completes OAuth flow, returns tokens

POST /auth/refresh
  Request: { refreshToken: string }
  Response: { accessToken: string, expiresIn: number }
  // Refreshes expired access token

GET /auth/me
  Headers: { Authorization: "Bearer <token>" }
  Response: { user: User, subscription: SubscriptionStatus }
  // Gets current user info

// === REGISTRATION ===
POST /register/image
  Headers: { Authorization: "Bearer <token>" }
  Request: { 
    imageHash: string,        // SHA-256 of image bytes
    sourceUrl: string,        // Where image was found
    metadata: {
      width: number,
      height: number,
      format: string,         // png, jpg, svg, etc.
      fileName?: string
    }
  }
  Response: { 
    registrationId: string,
    estimatedCost: { sol: string, usd: string },
    transactionToSign: string // Base64 encoded partial transaction
  }
  // Creates registration record, returns unsigned transaction

POST /register/confirm
  Headers: { Authorization: "Bearer <token>" }
  Request: { 
    registrationId: string,
    signedTransaction: string // User's wallet signature
  }
  Response: { 
    success: boolean,
    txSignature: string,      // Solana transaction ID
    ipfsHash: string,         // Metadata on IPFS
    certificateUrl: string,   // Public certificate page
    nftMint: string           // NFT mint address
  }
  // Submits signed transaction to blockchain

// === PORTFOLIO ===
GET /portfolio
  Headers: { Authorization: "Bearer <token>" }
  Response: { 
    assets: Asset[],
    totalRegistrations: number,
    activeLicenses: number
  }
  // Gets user's registered IP assets

GET /portfolio/:assetId
  Headers: { Authorization: "Bearer <token>" }
  Response: { asset: Asset, licenses: License[], usageHistory: Usage[] }
  // Gets single asset with full details

// === LICENSING (ISCL) ===
POST /iscl/create
  Headers: { Authorization: "Bearer <token>" }
  Request: {
    assetId: string,
    template: string,         // Template ID or "custom"
    terms: ISCLTerms,
    priceAmount: string,
    priceCurrency: "SOL" | "CATH"
  }
  Response: {
    isclId: string,
    transactionToSign: string,
    shareableLink: string
  }
  // Creates ISCL license contract

GET /iscl/:isclId
  Headers: { Authorization: "Bearer <token>" }
  Response: { iscl: ISCL, asset: Asset, licensee?: User }
  // Gets ISCL details
```

### Data Types

```typescript
interface User {
  id: string;
  email: string;
  username: string;
  profileImageUrl?: string;
  walletAddress?: string;      // xxx.solturio.sol
  subscriptionStatus: "active" | "expired" | "none";
  subscriptionExpiresAt?: string;
  soltBalance: string;         // $SOLT rewards balance
  createdAt: string;
}

interface Asset {
  id: string;
  type: "logo" | "music" | "code";
  name: string;
  fileHash: string;            // SHA-256
  thumbnailUrl?: string;
  ipfsHash: string;
  nftMint: string;             // Solana NFT address
  registeredAt: string;
  ownerWallet: string;
  status: "pending" | "minted" | "verified";
}

interface SubscriptionStatus {
  isActive: boolean;
  tier: "promo" | "standard" | "admin";
  expiresAt?: string;
  canRegister: boolean;
  canCreateISCL: boolean;
}
```

---

## Layer 2: solturio.sol (Blockchain Rules & Ownership)

**Purpose**: On-chain smart contracts, NFT minting, ISCL deployment, immutable ownership records

### What It Does

| Function | Description |
|----------|-------------|
| **NFT Minting** | Creates NFT certificates on Solana via Metaplex |
| **Ownership Records** | Immutable proof of who owns what |
| **ISCL Contracts** | On-chain license terms, payments, royalties |
| **Wallet Domains** | `.solturio.sol` domain resolution |
| **Transaction Signing** | Dual-signature flow (platform + user) |

### Smart Contract Endpoints

```typescript
// Base URL: Separate SC Replit (internal API, not public)
// The extension calls solturio.app, which proxies to SC layer

// === TRANSACTION BUILDING ===
POST /api/sc/build-registration-tx
  Request: {
    ownerWallet: string,      // User's Solana wallet
    metadataUri: string,      // IPFS URI for metadata JSON
    assetType: "logo" | "music" | "code",
    collectionId?: string
  }
  Response: { 
    transaction: string,      // Base64 serialized transaction
    blockhash: string,
    lastValidBlockHeight: number
  }
  // Builds unsigned registration transaction

POST /api/sc/build-iscl-tx
  Request: {
    licensorWallet: string,
    licenseeWallet: string,
    assetMint: string,        // NFT mint address
    termsHash: string,        // SHA-256 of license terms
    paymentAmount: string,
    paymentMint: string       // SOL or token mint
  }
  Response: { 
    transaction: string,
    blockhash: string
  }
  // Builds ISCL creation transaction

// === VERIFICATION ===
GET /api/sc/verify-ownership
  Query: { wallet: string, assetId: string }
  Response: { 
    valid: boolean, 
    owner: string, 
    mintAddress: string,
    registeredAt: number      // Unix timestamp
  }
  // Verifies on-chain ownership

GET /api/sc/resolve-wallet
  Query: { domain: string }   // e.g., "mycompany.solturio.sol"
  Response: { 
    address: string,          // Solana address
    owner: string,
    registrations: number
  }
  // Resolves .solturio.sol domain to address
```

### Dual-Signature Transaction Flow

The extension NEVER holds private keys. All transactions use dual-signature:

```
1. Extension calls solturio.app to initiate registration
2. solturio.app calls SC layer to build unsigned transaction
3. SC layer returns partially-signed transaction (platform signature)
4. Extension presents transaction to user's wallet (Phantom, etc.)
5. User reviews and signs with their wallet
6. Extension sends fully-signed transaction back to solturio.app
7. solturio.app submits to Solana network
8. Extension receives confirmation with tx signature
```

### On-Chain Data Structure

```typescript
// What gets stored on Solana blockchain (as NFT metadata)
interface OnChainMetadata {
  name: string;               // "Logo: MyBrand"
  symbol: string;             // "SOLTURIO"
  uri: string;                // IPFS link to full metadata
  sellerFeeBasisPoints: 0;    // No royalties on transfer
  creators: [{
    address: string,          // Owner's wallet
    verified: true,
    share: 100
  }];
  collection?: {
    key: string;              // Collection NFT address
    verified: true
  };
}

// What's stored on IPFS (referenced by uri above)
interface IPFSMetadata {
  name: string;
  description: string;
  image: string;              // Arweave link to badge image
  external_url: string;       // solturio.com/verify/{id}
  attributes: [
    { trait_type: "Asset Type", value: "logo" | "music" | "code" },
    { trait_type: "File Hash", value: string },  // SHA-256
    { trait_type: "Registered", value: string }, // ISO date
    { trait_type: "Platform", value: "Solturio" }
  ];
  properties: {
    files: [{ uri: string, type: string }];
    category: "image" | "audio" | "document";
  };
}
```

---

## Layer 3: solturio.com (Public Verification)

**Purpose**: Third-party verification, badge display, public API for anyone to check ownership

### What It Does

| Function | Description |
|----------|-------------|
| **Public Lookups** | Anyone can verify if an image is registered |
| **Badge Embeds** | Embeddable verification badges for websites |
| **Batch Verification** | Check multiple images at once (for page scanning) |
| **Certificate Pages** | Public proof-of-ownership pages |
| **DEX Integration** | API for DEX platforms to verify token logos |

### Public API Endpoints

```typescript
// Base URL: https://solturio.com/api/public/
// NO AUTHENTICATION REQUIRED for these endpoints

// === SINGLE LOOKUP ===
GET /lookup
  Query: { hash: string }     // SHA-256 of image
  Response: {
    found: boolean,
    registration?: {
      id: string,
      ownerName: string,      // Display name (not wallet)
      ownerWallet: string,    // Truncated: "7xKp...3nFq"
      registeredAt: string,   // ISO date
      assetType: "logo" | "music" | "code",
      badgeUrl: string,       // Arweave badge image
      certificateUrl: string, // Full certificate page
      isVerified: boolean     // Has gold checkmark
    }
  }
  // Primary lookup for extension verification

// === BATCH VERIFICATION ===
POST /batch-verify
  Request: { hashes: string[] }  // Up to 100 hashes
  Response: { 
    results: { 
      [hash: string]: {
        registered: boolean,
        owner?: string,       // Wallet address if registered
        registeredAt?: string,
        flagged?: boolean     // Known stolen logo
      }
    }
  }
  // Used by extension for page scanning

// === EMBEDDABLE BADGE ===
GET /badge/:registrationId
  Response: SVG image
  // Returns verification badge as SVG for embedding

GET /badge/:registrationId.png
  Response: PNG image
  // Returns verification badge as PNG

// === CERTIFICATE PAGE ===
GET /verify/:registrationId
  Response: HTML page
  // Public certificate with full details, QR code, blockchain links

// === DEX INTEGRATION ===
POST /dex/verify-logo
  Request: {
    imageUrl: string,
    tokenAddress?: string,
    platform: string          // "jupiter", "raydium", etc.
  }
  Response: {
    registered: boolean,
    owner?: string,
    matchConfidence: number,  // 0-100
    recommendation: "safe" | "warning" | "danger"
  }
  // For DEX platforms to check token logos

// === REPORT THEFT ===
POST /report
  Request: {
    imageHash: string,
    foundAt: string,          // URL where found
    reporterEmail?: string,
    details?: string
  }
  Response: { reportId: string, status: "received" }
  // Submit theft report (works without account)
```

### Badge Types

```
┌──────────────────────────────────────────────────────────────┐
│  VERIFIED (Green)         │  Shows on registered images     │
│  ✓ Gold checkmark         │  Owner verified on blockchain   │
├──────────────────────────────────────────────────────────────┤
│  UNREGISTERED (Gray)      │  Image not found in registry    │
│  ? Question mark          │  May or may not be stolen       │
├──────────────────────────────────────────────────────────────┤
│  FLAGGED (Red)            │  Known stolen/scam logo         │
│  ⚠ Warning icon           │  Reported and confirmed theft   │
├──────────────────────────────────────────────────────────────┤
│  LICENSED (Blue)          │  Valid license exists           │
│  📄 Document icon         │  Shows licensee info on hover   │
└──────────────────────────────────────────────────────────────┘
```

---

## Pricing Structure

### Platform Access (Subscription)

| Tier | Price | Duration | Notes |
|------|-------|----------|-------|
| Promo | 0.14 SOL | 1 year | First 60 days after launch |
| Standard | 0.5 SOL | 1 year | Regular pricing |
| Admin | Free | Unlimited | Whitelisted emails only |

### ISCL Creation

| Item | Price | Currency |
|------|-------|----------|
| Per ISCL | 0.025 SOL | SOL only |

### Tokens

| Token | Symbol | Purpose |
|-------|--------|---------|
| $SOLT | SOLT | Platform rewards, engagement bonuses |
| $CATH | CATH | Primary payment currency (subscriptions) |

---

## ISCL (Independent Smart Contract License)

Solturio's branded term for blockchain-verified licensing contracts.

### What ISCL Includes

```typescript
interface ISCLTerms {
  // === BASIC INFO ===
  assetId: string;            // What's being licensed
  licensorWallet: string;     // Owner's wallet
  licenseeWallet: string;     // Licensee's wallet
  
  // === SCOPE ===
  territory: string[];        // ["WORLDWIDE"] or specific countries
  duration: number;           // Days, or 0 for perpetual
  exclusivity: "exclusive" | "non-exclusive";
  purpose: string[];          // ["social_media", "merchandise", etc.]
  
  // === RESTRICTIONS ===
  contentRestrictions: string[];  // NO_ADULT, NO_AI_TRAINING, etc.
  editRestrictions: string[];     // NO_EDIT, RESIZE_ONLY, etc.
  requiresAttribution: boolean;
  
  // === PAYMENT ===
  paymentType: "upfront" | "royalty" | "milestone";
  paymentAmount: string;
  paymentCurrency: "SOL" | "CATH";
  royaltyPercent?: number;    // If royalty-based
  
  // === LEGAL ===
  governingLaw: string;       // "US-CA", "UK", etc.
  arbitrationVenue: string;
  terminationTerms: string;
}
```

### ISCL Templates

| Template | Use Case | Key Terms |
|----------|----------|-----------|
| Social Media | Posts, ads | Non-exclusive, 1 year, no edits |
| Merchandise | Physical products | Non-exclusive, perpetual, resize OK |
| Website | Site graphics | Non-exclusive, domain-specific |
| NFT Project | Token branding | Exclusive option, revenue share |
| Press Kit | Media/journalism | Non-exclusive, attribution required |
| White Label | Full rebrand | Exclusive, no attribution |

---

## Extension Wallet Integration

The extension connects to Solana wallets for signing transactions:

```typescript
// Supported wallets
const SUPPORTED_WALLETS = [
  "phantom",      // Most popular
  "solflare",     // Second most popular
  "backpack",     // xNFT wallet
  "glow",         // Mobile-friendly
];

// Wallet adapter pattern
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Connection, Transaction } from '@solana/web3.js';

class WalletService {
  private adapter: PhantomWalletAdapter;
  private connection: Connection;
  
  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com');
    this.adapter = new PhantomWalletAdapter();
  }
  
  async connect(): Promise<string> {
    await this.adapter.connect();
    return this.adapter.publicKey?.toBase58() || '';
  }
  
  async signTransaction(serializedTx: string): Promise<string> {
    const tx = Transaction.from(Buffer.from(serializedTx, 'base64'));
    const signed = await this.adapter.signTransaction(tx);
    return Buffer.from(signed.serialize()).toString('base64');
  }
  
  async getBalance(): Promise<number> {
    if (!this.adapter.publicKey) return 0;
    const lamports = await this.connection.getBalance(this.adapter.publicKey);
    return lamports / 1e9; // Convert to SOL
  }
}
```

---

## Extension Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Extension  │     │ solturio.app│     │ Replit Auth │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Click Login    │                   │
       │──────────────────>│                   │
       │                   │                   │
       │ 2. Return authUrl │                   │
       │<──────────────────│                   │
       │                   │                   │
       │ 3. Open popup to authUrl              │
       │───────────────────────────────────────>
       │                   │                   │
       │                   │   4. User logs in │
       │                   │<──────────────────│
       │                   │                   │
       │ 5. Redirect with code                 │
       │<──────────────────────────────────────│
       │                   │                   │
       │ 6. Exchange code  │                   │
       │──────────────────>│                   │
       │                   │                   │
       │ 7. Return tokens  │                   │
       │<──────────────────│                   │
       │                   │                   │
       │ 8. Store in chrome.storage            │
       │                   │                   │
```

---

## Key Security Principles

1. **Private keys never leave the wallet** - Extension only requests signatures
2. **Image hashes generated locally** - Full images never sent to servers
3. **Tokens stored encrypted** - Using Chrome's secure storage API
4. **No plaintext credentials** - OAuth flow only
5. **HTTPS only** - All API calls over TLS
6. **Dual-signature transactions** - Platform can't spend user funds

---

## DEX Platform Detection

The extension auto-detects when users are on DEX platforms and scans for potentially stolen logos:

```typescript
const DEX_PLATFORMS = {
  'jupiter.ag': { name: 'Jupiter', chain: 'solana' },
  'raydium.io': { name: 'Raydium', chain: 'solana' },
  'dexscreener.com': { name: 'DexScreener', chain: 'multi' },
  'birdeye.so': { name: 'Birdeye', chain: 'solana' },
  'pump.fun': { name: 'Pump.fun', chain: 'solana' },
  'orca.so': { name: 'Orca', chain: 'solana' },
};

// Detection triggers:
// 1. User visits DEX platform
// 2. Extension scans all token logo images
// 3. Generates SHA-256 hashes
// 4. Batch query to solturio.com/api/public/batch-verify
// 5. Overlay badges on each logo
// 6. Show alert bar if flagged logos found
```

---

## User Experience Without Account

Users who haven't logged in can still:

| Feature | Works? | Notes |
|---------|--------|-------|
| View verification badges | Yes | Public API |
| Check if image is registered | Yes | Right-click lookup |
| See owner info on hover | Yes | Public data |
| Get DEX scam alerts | Yes | Public scanning |
| Report stolen logos | Yes | Email optional |
| Register IP | No | Requires account + subscription |
| Create licenses | No | Requires account |
| View portfolio | No | Requires account |
| Connect wallet | No | Requires account |

---

## Brand Guidelines

### Colors

```css
/* Primary */
--solturio-gold: #D4AF37;
--solturio-dark: #1A1A2E;
--solturio-accent: #16213E;

/* Status */
--verified-green: #22C55E;
--warning-red: #EF4444;
--unregistered-gray: #6B7280;
--licensed-blue: #3B82F6;
```

### Design Tokens

- **Popup size**: 400px width, 500px max height
- **Sidebar size**: 350px width, full viewport height
- **Badge size**: 16px (small), 24px (medium), 32px (large)
- **Border radius**: 8px (rounded-md)
- **Font**: Inter or system-ui

---

## Quick Reference

| Layer | Domain | Purpose | Auth Required |
|-------|--------|---------|---------------|
| 1 | solturio.app | Identity, API, uploads | Yes |
| 2 | solturio.sol | Blockchain, NFTs, contracts | Wallet signature |
| 3 | solturio.com | Public verification | No |

| Action | Endpoint | Layer |
|--------|----------|-------|
| Login | /api/extension/auth/init | 1 |
| Register image | /api/extension/register/image | 1 → 2 |
| Verify hash | /api/public/lookup | 3 |
| Batch verify | /api/public/batch-verify | 3 |
| Create ISCL | /api/extension/iscl/create | 1 → 2 |
| Get portfolio | /api/extension/portfolio | 1 |

---

*Document Version: 1.0*
*Last Updated: January 2026*
*For: Solturio Browser Extension Development*
