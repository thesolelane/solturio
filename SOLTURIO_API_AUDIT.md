# SOLTURIO API - Complete Endpoint Audit for SC Integration
## All 44 Endpoints + IPFS/NFT Flow

---

## AUTHENTICATION & USER MANAGEMENT (5 endpoints)

### 1. Get Current User
```
GET /api/auth/user
Auth: Required (Replit Auth)
Response: { userId, email, firstName, lastName, solanaPublicKey, walletName }
```

### 2. Get User Stats
```
GET /api/stats
Auth: Required
Response: { totalLogos, collections, nftsMinted, activeRegistrations, quizStats }
```

### 3. Link Wallet
```
POST /api/account/link-wallet
Auth: Required
Body: { walletAddress, walletType }
Response: { linked: true, walletAddress }
```

### 4. Send Verification Email
```
POST /api/account/send-verification
Auth: Required
Body: { email }
Response: { sent: true, expiresIn: "15m" }
```

### 5. Update Notifications
```
PATCH /api/account/notifications
Auth: Required
Body: { emailNotifications: bool, pushNotifications: bool }
Response: { updated: true }
```

---

## WALLET CREATION & MANAGEMENT (6 endpoints)

### 6. Create xxx.solturio.sol Wallet (POST Payment)
```
POST /api/wallet/create
Auth: Required
Body: {
  walletType: 'standard' | 'premium',  // standard: 0.1 SOL, premium: 0.15 SOL
  customName?: string,                  // For premium (e.g., "dragoncoin")
  paymentTxHash: string,                // Transaction hash from user's wallet
  currency: 'SOL' | 'BONK' | 'CATH' | 'ARWEAVE'
}
Response: {
  solanaPublicKey: string,
  walletName: string,
  walletType: string,
  message: "Wallet created successfully. Please complete the Key Handover Ceremony."
}
```

### 7. Check Wallet Name Availability (Premium)
```
POST /api/wallet/check-name
Auth: Required
Body: { customName: string }  // e.g., "dragoncoin"
Response: {
  available: boolean,
  walletName: string,         // e.g., "dragoncoin.solturio.sol"
  suggestion?: string         // If taken
}
```

### 8. Get Wallet Info
```
GET /api/wallet/info
Auth: Required
Response: {
  publicKey: string,
  walletName: string,
  walletType: 'standard' | 'premium',
  createdAt: ISO string,
  restrictions: { rejectSPL: true }
}
```

### 9. Generate Solturio Wallet (Simple)
```
POST /api/account/generate-solturio-wallet
Auth: Required
Email: Must be verified
Response: {
  publicKey: string,
  createdAt: ISO string
}
```

### 10. Export Private Key
```
POST /api/account/export-private-key
Auth: Required
Email: Must be verified (security)
Response: {
  privateKey: [array of 64 bytes],
  mnemonic: string,
  warning: "Never share this key"
}
```

### 11. Update Social Handles
```
PATCH /api/account/social-handles
Auth: Required
Body: { twitter?: string, discord?: string, telegram?: string }
Response: { updated: true }
```

---

## LOGO REGISTRATION & MANAGEMENT (12 endpoints)

### 12. Upload Logo(s)
```
POST /api/logos/upload
Auth: Required
Content-Type: multipart/form-data
Files: Multiple logo files (50 max)
Body: {
  companyName: string,
  imageUrl_0?: string,
  imageUrl_1?: string,
  ... (additional URLs)
}
Response: {
  collection: { id, name, companyName },
  logos: [{ id, fileName, fileHash, status, collectionId }]
}
```

### 13. Upload Token Launch Logo
```
POST /api/logos/upload-token
Auth: Required
Content-Type: multipart/form-data
File: logo file
Body: { tokenName?: string, contractAddress?: string }
Response: { id, fileName, fileHash, status }
```

### 14. Upload Artwork Logo
```
POST /api/logos/upload-artwork
Auth: Required
Content-Type: multipart/form-data
File: artwork file
Body: { artworkTitle?: string, artistName?: string }
Response: { id, fileName, fileHash, status }
```

### 15. Get All Logos
```
GET /api/logos
Auth: Required
Response: [{
  id, fileName, fileHash, ipfsHash, userId,
  collectionId, status, createdAt, imageUrl
}]
```

### 16. Get Logo Details
```
GET /api/logos/:id
Auth: Required
Response: {
  id, fileName, fileHash, ipfsHash, collectionId,
  description, ownershipDescription, intendedUse,
  status, nftAddress, transactionHash, createdAt
}
```

### 17. Upload Logo to IPFS (Pinata)
```
POST /api/logos/:id/ipfs
Auth: Required
Body: {
  imageBuffer?: string // base64 encoded
}
Response: {
  ipfsHash: string,                    // Image hash
  ipfsMetadataHash: string,            // Metadata JSON hash
  gatewayUrl: "https://ipfs.io/ipfs/...",
  metadataJson: { ... }
}
```

### 18. Generate Certificate PDF
```
GET /api/logos/:id/certificate
Auth: Required
Response: PDF file (application/pdf)
Content: Certificate with logo, metadata, blockchain proof
```

### 19. Generate DMCA Takedown Notice
```
POST /api/logos/:id/dmca
Auth: Required
Body: {
  infringingSite: string,
  infringementUrl: string,
  infringementDescription: string,
  contactEmail: string
}
Response: PDF file (application/pdf)
```

### 20. Create Authorized Usage
```
POST /api/logos/:id/authorized-usage
Auth: Required
Body: {
  url: string,
  usageType: string,  // e.g., "exchange", "wallet"
  platform: string,   // e.g., "Raydium", "Magic Eden"
  description: string
}
Response: { id, logoId, usageUrl, usageType, createdAt }
```

### 21. Get Authorized Usages for Logo
```
GET /api/logos/:id/authorized-usage
Auth: Required
Response: [{
  id, logoId, userId, usageUrl, usageType,
  usagePlatform, notes, createdAt
}]
```

### 22. Get All Authorized Usages
```
GET /api/authorized-usages
Auth: Required
Response: [{ ... same as above ... }]
```

### 23. Update Authorized Usage
```
PATCH /api/authorized-usage/:id
Auth: Required
Body: { url?: string, usageType?: string, platform?: string }
Response: { id, ... updated fields }
```

---

## COLLECTIONS (3 endpoints)

### 24. Get All Collections
```
GET /api/collections
Auth: Required
Response: [{
  id, userId, name, companyName, status,
  logos: [{ id, fileName, ipfsHash }],
  createdAt
}]
```

### 25. Get Collection Details
```
GET /api/collections/:id
Auth: Required
Response: {
  id, name, companyName, userId,
  logos: [{ id, fileName, ipfsHash, status }],
  createdAt
}
```

### 26. Delete Authorized Usage
```
DELETE /api/authorized-usage/:id
Auth: Required
Response: { deleted: true }
```

---

## NFT MINTING (1 endpoint + IPFS flow)

### 27. Mint NFT Certificate
```
POST /api/nft/mint
Auth: Required
Body: {
  logoId: string,
  collectionId: string,
  metadataHash?: string  // IPFS hash (optional - auto-generated if missing)
}
Response: {
  success: true,
  nftAddress: string,           // cert_<wallet>_<logoId>
  transactionHash: string,      // IPFS metadata hash
  ipfsHash: string,
  blockchainMetadataJson: { name, description, image, attributes },
  status: "minted"
}
```

---

## DEX PROTECTION (3 endpoints)

### 28. Verify Token Logo
```
POST /api/dex/verify
Auth: Optional
Body: {
  tokenAddress: string,
  chainId: number,
  logoUrl: string,
  logoHash: string  // SHA-256 of logo
}
Response: {
  verified: boolean,
  matches: [{ originalLogo, registrationDate }],
  isCopycat: boolean
}
```

### 29. Report Copycat Token
```
POST /api/dex/report-copycat
Auth: Optional
Body: {
  originalLogoId: string,
  fraudulentTokenAddress: string,
  dexPlatform: string,  // e.g., "Raydium", "Magic Eden"
  evidenceUrl: string,
  reporterEmail: string
}
Response: {
  reportId: string,
  status: "submitted",
  nextSteps: "DMCA processing"
}
```

### 30. Verify Hash Registration
```
GET /api/verify/hash/:hash
Auth: Optional
Response: {
  verified: boolean,
  original: {
    id, registrationDate, companyName, ipfsHash, transactionHash
  },
  totalRegistrations: number,
  possibleCopies: number
}
```

---

## PRICING & REGISTRATION (2 endpoints)

### 31. Get Pricing Status
```
GET /api/pricing/status
Auth: Required
Response: {
  freeUploadsRemaining: number,
  freeUploadLimit: 5,
  pricingTiers: [
    { type: "Token Launch", basePrice: "0.5 SOL", bonusTokens: 1000 }
  ]
}
```

### 32. Send Receipt
```
POST /api/receipt/send
Auth: Required
Body: {
  registrationId: string,
  itemName: string,
  lineItems: [
    { description: string, quantity: number, unitPrice: string, subtotal: string }
  ],
  total: string,
  currency: "SOL" | "BONK" | "CATH",
  txHash?: string,
  registrationType?: "Token Creator" | "Artwork Artist"
}
Response: {
  sent: true,
  receiptId: string,
  email: "user@example.com"
}
```

---

## KEY HANDOVER CEREMONY (6 endpoints) - 6-Stage Legal Audit Trail

### 33. Get Ceremony Progress
```
GET /api/ceremony/progress
Auth: Required
Response: {
  currentStage: 1-6,
  completed: boolean,
  stages: {
    stage1: { warning: "read", completed: bool },
    stage2: { payment: "verified", completed: bool },
    ...
    stage6: { terms: "accepted", completed: bool }
  }
}
```

### 34. Update Ceremony Stage
```
POST /api/ceremony/stage
Auth: Required
Body: {
  stage: 1-6,
  action: string,    // e.g., "acknowledge", "verify_payment", "accept_terms"
  data?: {}
}
Response: { stage, status: "completed" | "pending", message }
```

### 35. Get Recovery Phrase
```
GET /api/ceremony/recovery-phrase
Auth: Required
Response: {
  recoveryPhrase: string,  // 12-word mnemonic
  isEncrypted: true,
  warning: "Save this phrase in a safe place"
}
```

### 36. Get Challenge Question
```
GET /api/ceremony/challenge
Auth: Required
Response: {
  challenge: string,
  challengeType: "mnemonic_verify" | "security_question"
}
```

### 37. Verify Recovery Phrase
```
POST /api/ceremony/verify-phrase
Auth: Required
Body: { phrase: string }
Response: { verified: true, stage: 6 }
```

### 38. Complete Ceremony
```
POST /api/ceremony/complete
Auth: Required
Body: { stage: 6, signature: string }
Response: {
  completed: true,
  ceremonyId: string,
  timestamp: ISO string,
  legalAuditTrail: { ... }
}
```

### 39. Reset Ceremony
```
POST /api/ceremony/reset
Auth: Required
Response: { reset: true, stage: 1 }
```

---

## QUIZ & EDUCATION (4 endpoints)

### 40. Get Quiz Questions
```
GET /api/quiz/questions
Auth: Optional
Query: { limit?: number, category?: string }
Response: [{
  id, question, options, category, difficulty, points
}]
```

### 41. Get Quiz Stats
```
GET /api/quiz/stats
Auth: Required
Response: {
  questionsAnswered: number,
  correctAnswers: number,
  totalPoints: number,
  leaderboardRank: number
}
```

### 42. Submit Quiz Answer
```
POST /api/quiz/answer
Auth: Required
Body: { questionId: string, answer: string }
Response: {
  correct: boolean,
  pointsEarned: number,
  explanation: string
}
```

### 43. Seed Quiz Data
```
POST /api/quiz/seed
Auth: Optional
Response: { seeded: true, questionsAdded: number }
```

---

## DOCUMENTS (2 endpoints)

### 44. Get Solana Foundation Proposal
```
GET /api/documents/solana-foundation-proposal
Auth: Optional
Response: JSON document
```

### 45. Create DEX Partnership Proposal
```
POST /api/documents/dex-partnership-proposal
Auth: Optional
Body: { dexName: string, terms: string }
Response: JSON document
```

---

## PAYMENT VERIFICATION (Not direct endpoint - Used internally)

```
Verify Payment Function (internal)
verifyPayment(txHash: string, paymentType: string, currency: string)

Supported Currencies:
- SOL (Solana native)
- BONK (SPL token)
- CATH (SPL token)
- ARWEAVE (TODO: Not implemented)

Return: { valid: boolean, amount: string, reason?: string }
```

---

## IPFS/METADATA FLOW (Pinata Integration)

### Upload Chain:
```
1. User uploads logo file → Extract SHA-256 hash
2. Generate logo metadata JSON:
   {
     name: string,
     description: string,
     dimensions: { width, height },
     fileHash: string,     // SHA-256
     fileFormat: string,   // png, svg, etc.
     colorPalette: [hex colors],
     ownershipProof: string
   }
3. POST /api/logos/:id/ipfs → Upload both to Pinata:
   - Image file → IPFS (returns ipfsHash)
   - Metadata JSON → IPFS (returns ipfsMetadataHash)
4. Store both hashes in database (logos table)
5. Reference in NFT metadata
```

### IPFS Service (server/services/ipfs.ts):
```typescript
- uploadFile(fileBuffer, fileName, metadata?) → { ipfsHash, pinSize, timestamp }
- uploadJSON(jsonData, name, metadata?) → { ipfsHash, pinSize, timestamp }
- unpinFile(ipfsHash) → boolean
- getFileInfo(ipfsHash) → PinataInfo
- getGatewayUrl(ipfsHash) → URL (with JWT auth if available)
```

**Pinata Configuration:**
```
PINATA_API_KEY: Required
PINATA_SECRET_KEY: Required
PINATA_JWT: Optional (for authenticated gateway)
PINATA_GATEWAY: Default = "gateway.pinata.cloud"
```

---

## NFT MINTING FLOW (Metaplex Standard)

### Process:
```
1. POST /api/nft/mint with logoId
2. buildNFTMetadata() creates certificate metadata:
   {
     name: "{logoName} - IP Certificate",
     description: "Solturio IP Protection Certificate",
     image: "ipfs://{ipfsImageHash}",
     attributes: [
       { trait_type: "Registration Type", value: "Token Launch|Artwork" },
       { trait_type: "Ownership Verified", value: "Yes" },
       { trait_type: "Registered Date", value: ISO string },
       { trait_type: "IPFS Hash", value: ipfsMetadataHash }
     ],
     properties: {
       category: "Certificate",
       creators: [{ address: userWallet, verified: true, share: 100 }]
     },
     external_url: "https://solturio.com/certificate/{logoId}"
   }
3. Create NFT address (deterministic: cert_{userWallet}_{logoId})
4. Update database with nftAddress, transactionHash
5. Return explorer URL to user
```

### NFT Service (server/services/nft-minting.ts):
```typescript
- buildNFTMetadata(options) → NFTMetadata
- mintNFTCertificate(options) → { success, nftAddress, transactionHash, explorerUrl }
- verifyNFTOwnership(nftAddress, ownerAddress, rpcUrl) → boolean
- updateLogoWithNFT(storage, logoId, nftAddress, transactionHash, metadata)
```

---

## DATABASE SCHEMA (Key Tables)

### users
```
id (UUID), email, firstName, lastName, emailVerified,
solanaPublicKey, walletName, walletType,
solanaEncryptedPrivateKey, walletSalt,
hasExportedPrivateKey, notificationsEnabled,
createdAt, updatedAt
```

### logos
```
id (UUID), userId, fileName, fileHash (SHA-256),
ipfsHash, ipfsMetadataHash, imageUrl, description,
ownershipDescription, intendedUse, status,
collectionId, nftAddress, transactionHash,
blockchainMetadataJson (JSONB), mintedAt,
copyrightStatus, copyrightApplicationNumber,
trademarkStatus, trademarkApplicationNumber,
patentStatus, patentApplicationNumber,
createdAt, updatedAt
```

### collections
```
id (UUID), userId, name, companyName,
status, createdAt, updatedAt
```

### payments
```
id (UUID), userId, logoId, paymentType,
currency, amount, transactionHash,
verified, blockNumber, createdAt
```

### authorized_usages
```
id (UUID), logoId, userId, usageUrl,
usageType, usagePlatform, notes, createdAt
```

### quiz_questions
```
id (UUID), question, options (array),
correctAnswer, category, difficulty,
points, createdAt
```

### quiz_attempts
```
id (UUID), userId, questionId, answer,
isCorrect, pointsEarned, createdAt
```

---

## MISSING ENDPOINTS (For SC Integration)

### ⚠️ NOT YET IMPLEMENTED:

1. **License/Licensing Flow**
   ```
   POST /api/licenses/create
   POST /api/licenses/:id/pay
   POST /api/licenses/:id/verify
   GET /api/licenses (user's active licenses)
   ```

2. **Treasury/Multi-Sig**
   ```
   POST /api/treasury/create-multisig
   POST /api/treasury/proposal
   POST /api/treasury/vote/:proposalId
   GET /api/treasury/balance
   ```

3. **Subdomain Management**
   ```
   POST /api/subdomains/register  // Register xxx.solturio.sol
   POST /api/subdomains/:name/verify
   GET /api/subdomains/available/:name
   ```

4. **Arweave Payment Verification** (TODO in payment-verification.ts)
   ```
   verifyArweavePayment(txHash) → { valid, amount, error? }
   ```

5. **Leaderboard Display**
   ```
   GET /api/leaderboard (game points)
   GET /api/leaderboard/exp (experience points)
   GET /api/leaderboard/telegram/:chatId
   ```

6. **Contract Verification**
   ```
   POST /api/contract/verify
   GET /api/contract/:address/status
   ```

---

## AUTHENTICATION METHOD

**Replit Auth (OpenID Connect) + Session Cookies**
- All protected endpoints check: `isAuthenticated` middleware
- Session stored in PostgreSQL (via `connect-pg-simple`)
- HTTP-only secure cookies used (no XSS exposure)
- CSRF protection via `csurf` middleware

---

## SECURITY FEATURES

- **Wallet Restrictions**: `xxx.solturio.sol` wallets programmatically reject SPL tokens
- **Payment Verification**: On-chain verification before wallet creation (prevent double-spend)
- **Private Key Encryption**: AES-256-GCM with unique salt per wallet
- **Email Verification**: Required for wallet export and sensitive operations
- **Key Handover Ceremony**: 6-stage legal audit trail for enhanced security
- **CSRF Protection**: Token-based protection on all state-changing operations

---

## RATE LIMITS & QUOTAS

- **Free Logo Uploads**: 5 per user per month
- **Premium Features**: Unlock with wallet creation (0.1-0.15 SOL)
- **Quiz Questions**: Unlimited answering
- **NFT Minting**: No limit (users pay SOL for certificates)

---

## INTEGRATION CHECKLIST FOR SC

- [ ] Wallet creation endpoint (/api/wallet/create)
- [ ] Payment verification flow
- [ ] IPFS metadata upload (/api/logos/:id/ipfs)
- [ ] NFT minting (/api/nft/mint)
- [ ] Logo registration endpoints
- [ ] DEX verification endpoints
- [ ] Authorization/session management
- [ ] Database schema compatibility
- [ ] Error handling & status codes
- [ ] Webhook callbacks (if async minting needed)

---

Generated: November 22, 2025
Solturio API Version: 1.0.0
Total Endpoints: 45 (44 implemented + 1 internal)
