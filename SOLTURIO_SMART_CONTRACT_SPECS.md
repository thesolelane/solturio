# Solturio Smart Contract Technical Specification
**Platform:** Solana Blockchain  
**Project:** Cooperanth Consulting LLC - CATH Ecosystem  
**Contract Name:** solturio.sol  
**Version:** 1.0  

---

## 1. PLATFORM OVERVIEW

### Mission
Solturio is a fully decentralized IP protection platform that mints logos and brand assets as NFTs on Solana, providing immutable, timestamped proof of ownership for intellectual property disputes and takedown requests.

### Core Principles
- **Pure DeFi:** Crypto-only payments (SOL, BONK, Arweave, $CATH)
- **Decentralized Storage:** IPFS for metadata, platform-controlled uploads
- **Blockchain Verification:** Solana for immutable proof
- **Anti-Scam Infrastructure:** Real-time verification API for DEX platforms

---

## 2. USE CASES & REGISTRATION TYPES

### Use Case 1: Token Creators
**Purpose:** Protect token/project logos before launch  
**Flow:** Legal questionnaire → 24-hour social proof verification → NFT mint

**Registration Fields:**
```typescript
{
  registrationType: "token_launch",
  
  // Step 1: Basic Information
  tokenName: string,              // Required
  tokenSymbol: string,            // Required
  blockchainNetwork: string,      // Required (e.g., "Solana", "Ethereum")
  
  // Step 2: Logo Upload
  logoFile: File,                 // Image file (PNG, SVG, JPG)
  logoHash: string,               // SHA-256 hash (computed on upload)
  logoMetadata: {
    dimensions: { width: number, height: number },
    format: string,
    colorPalette: string[],
    fileSize: number
  },
  
  // Step 3: Legal Questionnaire (7 questions)
  isOriginalWork: boolean,        // Required: true
  hasRightToRegister: boolean,    // Required: true
  noThirdPartyClaims: boolean,    // Required: true
  understandsPerjury: boolean,    // Required: true
  acceptsTerms: boolean,          // Required: true
  creationDate: Date,             // When logo was created
  firstPublicUse: Date | null,    // When first used publicly
  
  // Step 4: Social Proof (24-hour verification)
  socialMediaLinks: {
    twitter?: string,
    telegram?: string,
    discord?: string,
    website?: string
  },
  
  // Step 5: Payment
  paymentTier: "standard" | "premium",
  paymentCurrency: "SOL" | "BONK" | "ARWEAVE" | "CATH",
  paymentAmount: string,          // String for precision
  paymentTxSignature: string,     // Solana transaction signature
  
  // Auto-generated
  registrationTimestamp: number,  // Unix timestamp
  walletAddress: string,          // xxx.solturio.sol wallet
  nftMintAddress?: string,        // After minting
  ipfsMetadataUri?: string        // IPFS URI for metadata
}
```

### Use Case 2: Artists & Designers
**Purpose:** Protect artwork, NFTs, and creative work  
**Flow:** Artwork registration → Proof-of-work verification → Licensing options → NFT mint

**Registration Fields:**
```typescript
{
  registrationType: "artwork",
  
  // Step 1: Artwork Information
  artworkTitle: string,           // Required
  artworkDescription: string,     // Required
  artworkCategory: string,        // "Digital Art", "Logo Design", "NFT", "Brand Identity"
  
  // Step 2: Logo/Artwork Upload
  artworkFile: File,
  artworkHash: string,            // SHA-256 hash
  artworkMetadata: {
    dimensions: { width: number, height: number },
    format: string,
    colorPalette: string[],
    fileSize: number
  },
  
  // Step 3: Proof of Work (11 questions)
  isOriginalWork: boolean,
  hasRightToRegister: boolean,
  noThirdPartyClaims: boolean,
  understandsPerjury: boolean,
  acceptsTerms: boolean,
  creationDate: Date,
  firstPublicUse: Date | null,
  creationLocation?: string,      // Optional
  toolsUsed?: string[],           // Software/tools used
  witnessName?: string,           // Optional witness
  witnessEmail?: string,          // Optional witness contact
  
  // Step 4: Social Media Portfolio
  portfolioLinks: {
    behance?: string,
    dribbble?: string,
    instagram?: string,
    artstation?: string,
    website?: string
  },
  
  // Step 5: Licensing Options
  licenseType: "all_rights_reserved" | "creative_commons" | "custom",
  commercialUseAllowed: boolean,
  modificationAllowed: boolean,
  attributionRequired: boolean,
  
  // Step 6: Authorized Usage
  authorizedPlatforms: string[],  // Pre-registered usage locations
  
  // Step 7: Payment
  paymentTier: "standard" | "premium",
  paymentCurrency: "SOL" | "BONK" | "ARWEAVE" | "CATH",
  paymentAmount: string,
  paymentTxSignature: string,
  
  // Auto-generated
  registrationTimestamp: number,
  walletAddress: string,          // xxx.solturio.sol wallet
  nftMintAddress?: string,
  ipfsMetadataUri?: string
}
```

---

## 3. PAYMENT SYSTEM

### Accepted Cryptocurrencies
```typescript
type AcceptedCurrency = "SOL" | "BONK" | "ARWEAVE" | "CATH";

interface PaymentTiers {
  standard: {
    SOL: "0.1",
    BONK: "TBD",      // To be determined by market rate
    ARWEAVE: "TBD",
    CATH: "TBD"
  },
  premium: {
    SOL: "0.15",
    BONK: "TBD",
    ARWEAVE: "TBD",
    CATH: "TBD"
  }
}
```

### Payment Flow
1. User selects payment tier (Standard/Premium)
2. User selects cryptocurrency (SOL, BONK, Arweave, $CATH)
3. Smart contract generates payment address
4. User sends payment transaction
5. Smart contract verifies transaction
6. Upon confirmation:
   - Create `xxx.solturio.sol` wallet if first registration
   - Fund wallet with user payment
   - Trigger NFT minting process

### Smart Contract Payment Requirements
```solidity
// Pseudo-Solana contract logic
function processRegistrationPayment(
  address userWallet,
  uint256 amount,
  string currency,
  bytes registrationData
) external {
  // Verify payment amount matches tier
  require(verifyPaymentAmount(amount, currency), "Invalid payment");
  
  // Create or retrieve Solturio wallet
  address solturioWallet = getOrCreateSolturioWallet(userWallet);
  
  // Transfer payment to Solturio wallet
  transferFunds(userWallet, solturioWallet, amount, currency);
  
  // Emit registration event
  emit RegistrationPaid(userWallet, solturioWallet, amount, currency);
  
  // Trigger NFT minting (off-chain listener picks this up)
  emit ReadyForMinting(solturioWallet, registrationData);
}
```

---

## 4. WALLET SYSTEM: xxx.solturio.sol

### Wallet Types
1. **Number-based:** `042.solturio.sol`, `157.solturio.sol`
2. **Custom branded:** `brandname.solturio.sol`, `projectname.solturio.sol`

### Wallet Creation Flow
```typescript
interface SolturioWallet {
  domain: string,                 // "042.solturio.sol" or "brandname.solturio.sol"
  publicKey: string,              // Solana public key
  encryptedPrivateKey: string,    // AES-256-GCM encrypted
  encryptionSalt: string,         // Unique per wallet
  createdAt: number,              // Unix timestamp
  userId: string,                 // Owner's user ID
  
  // Recovery
  recoveryPhraseHash: string,     // SHA-256 of BIP39 12-word phrase
  recoveryAvailable: boolean,     // Recovery service status
  
  // Restrictions
  splTokensBlocked: true,         // ALWAYS true - rejects SPL tokens
  acceptedAssets: ["SOL", "SOLTURIO_CERTIFICATES", "SOLTURIO_CONTRACTS"]
}
```

### Security Features (Smart Contract)
```solidity
// SPL Token Restriction
function rejectSPLTokens(address wallet) internal view returns (bool) {
  // Solturio wallets ONLY accept:
  // 1. SOL (native)
  // 2. Platform-generated NFT certificates
  // 3. Platform-generated smart contracts
  
  // All other SPL tokens are programmatically rejected
  return wallet.isSolturioWallet() && token.isSPLToken();
}

// Key Handover Ceremony (6 stages)
enum HandoverStage {
  WALLET_CREATED,           // Stage 1: Wallet generated
  PHRASE_DISPLAYED,         // Stage 2: Recovery phrase shown
  USER_CONFIRMED_SAVED,     // Stage 3: User confirms they saved it
  PHRASE_VERIFIED,          // Stage 4: User proves they have it
  ENCRYPTION_COMPLETE,      // Stage 5: Private key encrypted
  HANDOVER_COMPLETE         // Stage 6: Full control transferred
}
```

### Wallet Naming (Smart Contract)
```typescript
// Number-based naming logic
function generateNumberWallet(userId: string): string {
  const walletCount = getWalletCountForUser(userId);
  const walletNumber = String(walletCount + 1).padStart(3, '0');
  return `${walletNumber}.solturio.sol`;
}

// Custom naming (premium tier only)
function reserveCustomWallet(userId: string, customName: string): string {
  require(isPremiumUser(userId), "Custom names require premium");
  require(!isWalletTaken(customName), "Name already taken");
  return `${customName}.solturio.sol`;
}
```

---

## 5. NFT METADATA STRUCTURE

### On-Chain Metadata (Metaplex Token Metadata Standard)
```json
{
  "name": "Solturio IP Certificate #042",
  "symbol": "SLTR",
  "description": "Blockchain-verified proof of logo ownership - Registered on Solturio",
  "seller_fee_basis_points": 0,
  "image": "https://ipfs.io/ipfs/{metadata_hash}",
  "external_url": "https://solturio.com/certificate/{mint_address}",
  "attributes": [
    {
      "trait_type": "Registration Type",
      "value": "Token Launch"
    },
    {
      "trait_type": "Registration Date",
      "value": "2025-11-08T12:34:56Z"
    },
    {
      "trait_type": "File Hash",
      "value": "sha256:{hash}"
    },
    {
      "trait_type": "Solturio Wallet",
      "value": "042.solturio.sol"
    },
    {
      "trait_type": "Payment Tier",
      "value": "Premium"
    },
    {
      "trait_type": "Protected Asset",
      "value": "Logo"
    }
  ],
  "properties": {
    "files": [],
    "category": "image",
    "creators": [
      {
        "address": "{solturio_authority}",
        "share": 100
      }
    ]
  }
}
```

### Off-Chain Metadata (IPFS)
```json
{
  "certificate_id": "SLTR-042-2025-11-08",
  "registration_timestamp": 1699459200,
  "owner_wallet": "042.solturio.sol",
  "owner_public_key": "{solana_pubkey}",
  
  "asset_details": {
    "file_hash": "sha256:{hash}",
    "file_format": "PNG",
    "dimensions": "1024x1024",
    "color_palette": ["#FF6B6B", "#4ECDC4", "#45B7D1"],
    "file_size_bytes": 245760
  },
  
  "ownership_claims": {
    "is_original_work": true,
    "has_right_to_register": true,
    "no_third_party_claims": true,
    "creation_date": "2025-10-15",
    "first_public_use": "2025-11-01"
  },
  
  "authorized_usage": [
    "DEX: Raydium",
    "Website: https://example.com",
    "Social: @example_twitter"
  ],
  
  "payment_info": {
    "tier": "premium",
    "currency": "CATH",
    "amount": "0.15",
    "tx_signature": "{solana_tx_sig}"
  },
  
  "verification": {
    "social_proof_verified": true,
    "verification_period": "24_hours",
    "verified_at": 1699545600
  }
}
```

---

## 6. SMART CONTRACT CORE FUNCTIONS

### Required Contract Functions

```solidity
// 1. Registration & Payment
function registerLogo(
  RegistrationType regType,
  bytes registrationData,
  string paymentCurrency,
  uint256 paymentAmount
) external payable returns (address walletAddress);

// 2. Wallet Management
function createSolturioWallet(
  address userWallet,
  WalletType walletType,
  string customName
) external returns (address solturioWallet);

function getSolturioWallet(address userWallet) external view returns (address);

// 3. SPL Token Rejection
function rejectSPLTokenTransfer(
  address solturioWallet,
  address tokenMint
) internal pure returns (bool);

// 4. IPFS Metadata Storage & Retrieval
function storeIPFSMetadata(
  string fileHash,
  string ipfsHash
) external returns (bool);

function getIPFSMetadata(
  string fileHash
) external view returns (string memory ipfsHash);

// 5. NFT Minting Trigger (with IPFS metadata URI)
function triggerNFTMint(
  address solturioWallet,
  string fileHash,
  string ipfsMetadataUri
) external returns (address nftMintAddress);

// 6. Ownership Verification
function verifyOwnership(
  string fileHash,
  address claimant
) external view returns (bool isOwner, uint256 registrationTimestamp);

// 7. DEX Verification API
function checkLogoLegitimacy(
  string fileHash
) external view returns (
  bool isRegistered,
  address owner,
  uint256 timestamp,
  string memory certificateUri,
  string memory ipfsMetadataUri
);

// 8. Authorized Usage Tracking
function addAuthorizedUsage(
  address solturioWallet,
  string platform,
  string location
) external;

function verifyAuthorizedUsage(
  string fileHash,
  string platform
) external view returns (bool isAuthorized);

// 9. Collection Management (for brands with multiple logos)
function createCollection(
  address userWallet,
  string collectionName
) external returns (uint256 collectionId);

function addLogoToCollection(
  uint256 collectionId,
  address logoNFT
) external;

// 10. Payment Tier Management
function updatePaymentTiers(
  PaymentTier tier,
  string currency,
  uint256 newAmount
) external onlyAdmin;

// 11. Emergency Functions
function pauseRegistrations() external onlyAdmin;
function resumeRegistrations() external onlyAdmin;
```

---

## 6.5 IPFS INTEGRATION ARCHITECTURE

### Why IPFS in Smart Contract?

The smart contract needs to **store IPFS metadata hashes** for:
1. **Proof of Registration:** Immutable reference to detailed logo metadata
2. **DEX Verification API:** DEX platforms query IPFS hash to verify legitimacy
3. **NFT Metadata:** Links on-chain NFT to detailed off-chain data
4. **Dispute Resolution:** IPFS hash serves as cryptographic proof of what was registered

### Smart Contract → IPFS Data Flow

```
User Registration
    ↓
Backend validates + uploads logo to IPFS
    ↓
Backend uploads registration metadata to IPFS (generates IPFS hash)
    ↓
Smart Contract storeIPFSMetadata(fileHash, ipfsHash)
    ↓
Smart Contract triggerNFTMint(fileHash, ipfsMetadataUri)
    ↓
NFT minted with IPFS metadata URI embedded
```

### Contract Storage for IPFS

```solidity
// Storage mapping for file hashes → IPFS metadata hashes
mapping(string => string) public ipfsMetadata;
  // Key: SHA-256 file hash of logo
  // Value: IPFS hash of full registration metadata

// Storage mapping for file hashes → NFT metadata URIs
mapping(string => string) public nftMetadataUris;
  // Key: SHA-256 file hash of logo
  // Value: Full IPFS URI (ipfs://Qm... or https://gateway.pinata.cloud/ipfs/...)

// Track which registrations have IPFS metadata stored
mapping(string => bool) public ipfsMetadataStored;
```

### Backend IPFS Workflow

**When user completes registration:**

1. **Upload Logo to IPFS** (if not already stored)
   - Hash file with SHA-256
   - Check if already registered (prevents duplicates)
   - Upload to Pinata via `uploadFile()`

2. **Generate & Upload Registration Metadata**
   - Compile detailed metadata (per section 5 - Off-Chain Metadata)
   - Upload JSON to Pinata via `uploadJSON()`
   - Returns IPFS hash: `Qm123abc...`

3. **Call Smart Contract to Store IPFS Hash**
   ```solidity
   contract.storeIPFSMetadata(
     "sha256:abc123...",
     "Qm123abc..."
   );
   ```

4. **Trigger NFT Minting**
   ```solidity
   contract.triggerNFTMint(
     userWallet,
     "sha256:abc123...",
     "ipfs://Qm123abc..."
   );
   ```

### DEX Platform Verification Flow

```
DEX Platform checks logo legitimacy
    ↓
DEX calls: contract.checkLogoLegitimacy(logoFileHash)
    ↓
Smart Contract returns:
  {
    isRegistered: true,
    owner: "042.solturio.sol",
    timestamp: 1699459200,
    ipfsMetadataUri: "ipfs://Qm123abc...",
    certificateUri: "https://solturio.com/cert/123"
  }
    ↓
DEX fetches IPFS metadata to verify:
  - Ownership claims
  - Registration date
  - Authorized platforms
  - Payment tier
    ↓
DEX decides: SAFE ✅ or STOLEN 🚨
```

### IPFS Data Integrity Verification

```solidity
// Smart contract verifies IPFS hash format before storing
function storeIPFSMetadata(
  string fileHash,
  string ipfsHash
) external returns (bool) {
  require(isValidIPFSHash(ipfsHash), "Invalid IPFS hash format");
  require(fileHashNotDuplicate(fileHash), "Logo already registered");
  
  // Store on-chain
  ipfsMetadata[fileHash] = ipfsHash;
  ipfsMetadataStored[fileHash] = true;
  
  // Emit event for off-chain indexing
  emit IPFSMetadataStored(fileHash, ipfsHash);
  return true;
}

// Helper: Validate IPFS hash format
function isValidIPFSHash(string memory hash) internal pure returns (bool) {
  // IPFS hashes start with Qm (base58 encoded)
  return bytes(hash).length > 0 && bytes(hash)[0] == 'Q' && bytes(hash)[1] == 'm';
}
```

### IPFS Gateway Options

**Stored in smart contract events (for backend reference):**

```solidity
event IPFSGatewayUsed(string indexed ipfsHash, string gateway);
// Gateways:
// - "https://gateway.pinata.cloud/ipfs/{hash}" (fastest, needs JWT)
// - "https://ipfs.io/ipfs/{hash}" (public, may be slow)
// - "https://cloudflare-ipfs.com/ipfs/{hash}" (Cloudflare CDN)
// - "ipfs://{hash}" (native IPFS protocol)
```

---

## 7. SECURITY REQUIREMENTS

### Encryption Standards
- **Private Keys:** AES-256-GCM with unique salt per wallet
- **Recovery Phrases:** BIP39 12-word, SHA-256 hashed for verification
- **File Hashing:** SHA-256 for logo file verification

### Access Control
```solidity
// Role-based access
address public SOLTURIO_AUTHORITY;  // Platform admin
mapping(address => bool) public verifiedCreators;
mapping(address => bool) public dexPartners;

modifier onlyAuthority() {
  require(msg.sender == SOLTURIO_AUTHORITY, "Not authorized");
  _;
}

modifier onlyWalletOwner(address solturioWallet) {
  require(isOwner(msg.sender, solturioWallet), "Not wallet owner");
  _;
}
```

### Anti-Scam Features
```solidity
// Prevent duplicate registrations
mapping(string => bool) public registeredFileHashes;

function preventDuplicateRegistration(string fileHash) internal {
  require(!registeredFileHashes[fileHash], "Logo already registered");
  registeredFileHashes[fileHash] = true;
}

// Time-lock for disputes
uint256 constant DISPUTE_PERIOD = 7 days;

function challengeOwnership(
  string fileHash,
  bytes proof
) external {
  // Allow challenges within dispute period
  require(block.timestamp < registrations[fileHash].timestamp + DISPUTE_PERIOD);
  // Handle dispute logic
}
```

---

## 8. DEX INTEGRATION API

### Real-Time Verification Endpoint
```typescript
// DEX platforms call this endpoint before listing a token
interface DEXVerificationRequest {
  tokenName: string,
  logoFileHash: string,      // SHA-256 of uploaded logo
  requestingDEX: string,     // e.g., "Raydium", "Jupiter"
}

interface DEXVerificationResponse {
  isRegistered: boolean,
  registrationTimestamp: number | null,
  ownerWallet: string | null,
  certificateUri: string | null,
  isAuthorizedForDEX: boolean,
  riskLevel: "safe" | "warning" | "stolen",
  message: string
}
```

### Smart Contract Verification
```solidity
function verifyForDEX(
  string logoHash,
  string dexPlatform
) external view returns (
  bool isLegit,
  address owner,
  uint256 regTime
) {
  Registration memory reg = registrations[logoHash];
  
  if (!reg.exists) {
    return (false, address(0), 0);
  }
  
  bool authorized = authorizedUsages[logoHash][dexPlatform];
  
  return (true, reg.owner, reg.timestamp);
}
```

---

## 9. EVENT EMISSIONS

```solidity
// Core events for off-chain indexing
event LogoRegistered(
  address indexed owner,
  address indexed solturioWallet,
  string fileHash,
  uint256 timestamp,
  RegistrationType regType
);

event WalletCreated(
  address indexed userWallet,
  address indexed solturioWallet,
  string walletDomain,
  uint256 timestamp
);

event NFTMinted(
  address indexed solturioWallet,
  address indexed nftMint,
  string metadataUri,
  uint256 timestamp
);

event PaymentReceived(
  address indexed payer,
  string currency,
  uint256 amount,
  string txSignature
);

event AuthorizedUsageAdded(
  string indexed fileHash,
  string platform,
  string location
);

event OwnershipChallenged(
  string indexed fileHash,
  address challenger,
  uint256 timestamp
);
```

---

## 10. INTEGRATION POINTS

### Backend Integration
The smart contract must integrate with Solturio's backend for:

1. **IPFS Upload Trigger:** After payment verified, backend uploads metadata to IPFS
2. **Metaplex NFT Minting:** Backend uses Metaplex SDK to mint NFT with on-chain metadata
3. **Database Sync:** All registrations synced to PostgreSQL for API queries
4. **Social Verification:** 24-hour verification period managed by backend
5. **Email Notifications:** Backend sends confirmation emails to users

### External Integration
1. **DEX Platforms:** REST API for real-time logo verification
2. **Wallet Providers:** Support for Phantom, Solflare, etc.
3. **IPFS Providers:** Pinata or similar for metadata storage

---

## 11. SCALABILITY CONSIDERATIONS

### Gas Optimization
- Batch minting for multiple logos in same collection
- Lazy minting: Only mint on-demand
- Minimal on-chain data storage (use IPFS for heavy data)

### Performance
- Index file hashes for O(1) lookup
- Use Solana's high throughput (65,000 TPS)
- Implement caching for frequent DEX verification requests

---

## 12. FUTURE FEATURES (Contract Extensibility)

```solidity
// Governance (for $CATH holders)
function proposeFeatureChange(bytes proposal) external;
function voteOnProposal(uint256 proposalId, bool support) external;

// Royalties on Secondary Sales
function setRoyaltyBasisPoints(uint256 bps) external onlyAuthority;

// Bulk Operations
function registerMultipleLogos(bytes[] registrations) external;

// IP Transfer
function transferIPOwnership(
  address fromWallet,
  address toWallet,
  string fileHash
) external;
```

---

## 13. TESTING REQUIREMENTS

### Unit Tests
- Payment verification (all 4 currencies)
- Wallet creation (number-based and custom)
- SPL token rejection
- File hash uniqueness
- Ownership verification

### Integration Tests
- Full registration flow (Token Creator path)
- Full registration flow (Artist path)
- DEX verification API
- NFT minting trigger
- Collection management

### Security Audits
- Reentrancy protection
- Integer overflow/underflow
- Access control bypass attempts
- Front-running mitigation

---

## 14. DEPLOYMENT CHECKLIST

- [ ] Deploy to Solana Devnet for testing
- [ ] Verify all payment currencies work
- [ ] Test wallet creation (both types)
- [ ] Confirm SPL token rejection
- [ ] Test NFT minting integration
- [ ] Verify DEX API endpoints
- [ ] Security audit completed
- [ ] Gas optimization review
- [ ] Deploy to Solana Mainnet
- [ ] Set SOLTURIO_AUTHORITY address
- [ ] Initialize payment tier prices
- [ ] Enable monitoring/alerting

---

## CONTACT & SUPPORT

**Project:** Solturio - Cooperanth Consulting LLC  
**Ecosystem:** $CATH  
**Platform:** Solana Blockchain  
**Contract Type:** Solana Program (Rust) or Anchor Framework  

For questions about this specification, contact the Solturio development team.

---

**Document Version:** 1.0  
**Last Updated:** November 8, 2025  
**Status:** Ready for Smart Contract Development
