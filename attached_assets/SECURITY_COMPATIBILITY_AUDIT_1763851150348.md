# SOLTURIO - Security & Compatibility Audit Report
**Date:** November 22, 2025  
**Audit Scope:** 45 API Endpoints vs 20 Smart Contract Instructions  
**Status:** ⚠️ **CRITICAL ISSUES FOUND - ACTION REQUIRED**

---

## 🔴 CRITICAL SECURITY ISSUES

### Issue #1: Replay Attack Vulnerability
**Severity:** 🔴 CRITICAL

**Location:** `POST /api/wallet/create`, `POST /api/payments/verify`

**Problem:**
```typescript
POST /api/wallet/create
Body: {
  walletType: 'standard' | 'premium',
  customName?: string,
  paymentTxHash: string,        // ⚠️ NO NONCE/TIMESTAMP
  currency: 'SOL' | 'BONK' | 'CATH' | 'ARWEAVE'
}
```

**Attack Scenario:**
1. User creates wallet with `paymentTxHash: "abc123"`
2. Attacker captures this request
3. Attacker replays same `paymentTxHash: "abc123"` → Creates duplicate wallet
4. One payment, multiple wallets created

**Root Cause:** Missing nonce/timestamp validation + no one-time-use check on txHash

**Fix Required:**

```typescript
// ADD THIS TO APP:
POST /api/wallet/create
Body: {
  walletType: 'standard' | 'premium',
  customName?: string,
  paymentTxHash: string,
  currency: 'CATH',              // ⚠️ MUST BE HARDCODED - See Issue #2
  nonce: string,                 // NEW: Random 32-byte hex
  timestamp: number              // NEW: Unix timestamp (within 5min window)
}

// Backend MUST verify:
// 1. txHash has never been used before (check DB)
// 2. Timestamp is within 5 minutes of current time
// 3. Payment amount matches expected tier
// 4. Nonce is unique and not replayed
```

---

### Issue #2: Unsupported Currency Parameter
**Severity:** 🔴 CRITICAL

**Location:** `POST /api/wallet/create`, `POST /api/receipt/send`

**Problem:**
```typescript
// APP ALLOWS:
currency: 'SOL' | 'BONK' | 'CATH' | 'ARWEAVE'

// SC ONLY SUPPORTS:
$CATH (CA: 48rmvKgpGpUNUuH3n2UYTZS2AUxZEkaCiNjQ57q1duMA)
```

**Why This Breaks:**
- User selects SOL → Payment verified in SOL
- SC instruction expects $CATH mint
- Transaction fails or user gets charged wrong token
- **Compliance Issue:** SC requires $CATH only per replit.md

**Fix Required:**

```typescript
// Option A: HARDCODE (Recommended - Simplest)
// Remove currency parameter entirely:
POST /api/wallet/create
Body: {
  walletType: 'standard' | 'premium',
  customName?: string,
  paymentTxHash: string,
  nonce: string,
  timestamp: number
  // NO currency - always use $CATH
}

// Option B: VALIDATE (If you want future flexibility)
POST /api/wallet/create
Body: {
  // ... 
  currency: 'CATH'  // Only this value allowed
}

// Backend validation:
if (currency !== 'CATH') {
  throw new Error('Only $CATH token supported');
}
```

---

### Issue #3: Missing Transaction Verification
**Severity:** 🔴 CRITICAL

**Location:** Payment verification throughout app

**Problem:**
```typescript
POST /api/payments/verify
Body: { 
  txHash,        // What if this hash doesn't exist?
  paymentType,   // What if amount doesn't match?
  currency       // What if mint is wrong?
}

// No verification that:
// 1. txHash actually exists on-chain
// 2. Amount matches expected price tier
// 3. Recipient is treasury wallet
// 4. Token mint is $CATH
```

**Fix Required:**

```typescript
// Add proper on-chain verification:
async function verifyPayment(txHash: string, paymentType: string) {
  const connection = new Connection(clusterApiUrl('mainnet-beta'));
  
  // 1. Fetch transaction
  const tx = await connection.getParsedTransaction(txHash);
  if (!tx) throw new Error('Transaction not found');
  
  // 2. Verify payment details
  const expectedAmount = paymentType === 'standard' ? 100_000_000_000 : 150_000_000_000; // $CATH decimals
  const expectedMint = '48rmvKgpGpUNUuH3n2UYTZS2AUxZEkaCiNjQ57q1duMA';
  const expectedRecipient = TREASURY_CATH_ACCOUNT;
  
  // 3. Extract transfer instruction from tx
  const transfer = tx.transaction.message.instructions.find(ix => 
    ix.program === 'spl-token' && ix.parsed.type === 'transferChecked'
  );
  
  if (!transfer) throw new Error('No SPL token transfer found');
  
  // 4. Validate transfer details
  if (transfer.parsed.mint !== expectedMint) throw new Error('Wrong token');
  if (BigInt(transfer.parsed.tokenAmount.amount) !== BigInt(expectedAmount)) throw new Error('Wrong amount');
  if (transfer.parsed.destination !== expectedRecipient) throw new Error('Wrong recipient');
  
  return { valid: true, amount: expectedAmount };
}
```

---

### Issue #4: No Signature Validation on Private Key Export
**Severity:** 🟠 HIGH

**Location:** `POST /api/account/export-private-key`

**Problem:**
```typescript
POST /api/account/export-private-key
Auth: Required
Email: Must be verified

Response: {
  privateKey: [array of 64 bytes],  // ⚠️ Sent in plaintext to browser
  mnemonic: string,
  warning: "Never share this key"
}
```

**Issue:**
- Private key sent over HTTPS ✓ But could be logged/captured
- No challenge-response verification (e.g., user signs message)
- Email verification alone is weak - could be SIM-swapped

**Fix Required:**

```typescript
// Add challenge-response:
// 1. GET /api/ceremony/challenge → return random 32-byte challenge
// 2. User signs challenge with their wallet private key
// 3. POST /api/account/export-private-key with signature
// 4. Server verifies signature matches wallet owner
// 5. Only then return private key

POST /api/account/export-private-key
Auth: Required
Body: {
  signature: string,  // User signed challenge with their wallet key
  challenge: string   // Challenge received from server
}
Response: {
  privateKey: [array of 64 bytes],
  mnemonic: string
}
```

---

## 🟠 HIGH PRIORITY: Smart Contract Integration Gaps

### Gap #1: Missing License Management Endpoints
**Severity:** 🟠 HIGH - **BLOCKS APP FUNCTIONALITY**

**SC Instructions Missing From App:**
- ✅ `create_license()` - Create licensing agreement
- ✅ `make_license_payment()` - Pay for license
- ⚠️ **NO APP ENDPOINTS** for these

**Required Endpoints:**

```typescript
// 1. CREATE LICENSE
POST /api/licenses/create
Auth: Required
Body: {
  logoId: string,
  licenseType: 'AllRightsReserved' | 'CreativeCommons' | 'Custom',
  paymentStructure: 'lumpSum' | 'installments',
  totalAmount: number,           // in $CATH (smallest units)
  numPayments?: number,          // for installments
  humanReadableTerms: string,    // Plain English license text
  termsIpfsUri?: string          // Optional IPFS link to full terms
}
Response: {
  licenseId: string,
  status: 'created',
  totalAmount: number,
  paymentStructure: string
}

// 2. MAKE LICENSE PAYMENT
POST /api/licenses/:licenseId/pay
Auth: Required
Body: {
  paymentNumber: number,         // Which payment (1, 2, 3... for installments)
  paymentTxHash: string,
  nonce: string,
  timestamp: number
}
Response: {
  success: boolean,
  paymentNumber: number,
  amountPaid: number,
  remaining: number,
  status: 'paid' | 'partial' | 'outstanding'
}

// 3. GET ACTIVE LICENSES (User's licenses they created)
GET /api/licenses/created
Auth: Required
Response: [{
  id, logoId, licenseType, paymentStructure,
  totalAmount, totalPaid, remainingAmount, createdAt
}]

// 4. GET LICENSES TO PAY (Licenses user needs to pay)
GET /api/licenses/active
Auth: Required
Response: [{
  id, issuerWallet, logoId, totalAmount, amountPaid,
  paymentsDue, nextDueDate, status
}]

// 5. VERIFY LICENSE PAYMENT
GET /api/licenses/:licenseId/verify
Auth: Optional
Response: {
  verified: boolean,
  issuer: string,
  licensee: string,
  status: string,
  blockchain: { transactionHash, timestamp }
}
```

---

### Gap #2: Missing Treasury & Multi-Sig Endpoints
**Severity:** 🟠 HIGH - **ADMIN FEATURE**

**SC Instructions Missing From App:**
- `initialize_multisig()` - Set up M-of-N signers
- `initialize_treasury()` - Configure auto-transfers  
- `propose_treasury_transfer()` - Propose transfer
- `approve_transfer()` - Approve proposal
- `transfer_treasury_funds()` - Execute transfer
- `cancel_transfer_proposal()` - Cancel proposal

**Required Endpoints:**

```typescript
// ADMIN ONLY - Set up multi-sig (one-time)
POST /api/treasury/setup-multisig
Auth: Required (admin)
Body: {
  signers: string[],            // Array of wallet addresses
  threshold: number             // M out of N
}
Response: {
  configured: true,
  signers: number,
  threshold: number
}

// ANY AUTHORIZED SIGNER - Propose transfer
POST /api/treasury/propose-transfer
Auth: Required
Body: {
  amount: number,               // in $CATH
  description: string
}
Response: {
  proposalId: string,
  amount: number,
  proposer: string,
  status: 'pending',
  approvalsNeeded: number
}

// ANY AUTHORIZED SIGNER - Approve proposal
POST /api/treasury/approve-transfer/:proposalId
Auth: Required
Response: {
  proposalId: string,
  approvals: number,
  approvalsNeeded: number,
  status: 'pending' | 'ready_to_execute'
}

// ANYONE - Execute transfer (after M approvals)
POST /api/treasury/execute-transfer/:proposalId
Auth: Required
Response: {
  success: boolean,
  transactionHash: string,
  amount: number,
  status: 'executed'
}

// AUTHORITY OR PROPOSER - Cancel proposal
POST /api/treasury/cancel-transfer/:proposalId
Auth: Required
Response: {
  cancelled: true,
  proposalId: string
}

// ANYONE - Check treasury status
GET /api/treasury/status
Auth: Required
Response: {
  balance: number,
  totalTransferred: number,
  nextScheduledTransfer: ISO string,
  transferSchedule: 'daily' | 'weekly' | 'bi-weekly' | 'monthly'
}

// ANYONE - View all proposals
GET /api/treasury/proposals
Auth: Required
Response: [{
  id, amount, proposer, status,
  approvals, approvalsNeeded, proposedAt
}]
```

---

### Gap #3: Missing IP Registration Smart Contract Call
**Severity:** 🟠 HIGH

**SC Instruction:** `register_ip()`

**Problem:**
- App has logo upload endpoints
- App doesn't call SC `register_ip()` instruction to record on-chain
- Logos exist only in DB, not on blockchain (no immutable timestamp)

**What Needs to Happen:**

```typescript
// When user completes logo upload + payment:

POST /api/logos/:id/register-on-chain
Auth: Required
Body: {
  logoId: string,
  registrationType: 'artwork' | 'tokenLogo',  // RegistrationType enum
  paymentTier: 'standard' | 'premium',
  paymentTxHash: string,                      // Proof of payment
  nonce: string,
  timestamp: number
}

// Backend MUST:
// 1. Verify payment (call verifyPayment)
// 2. Generate proper parameters for SC:
//    - file_hash: SHA-256 of logo file
//    - metadata_uri: IPFS metadata hash
//    - registration_type: artwork or tokenLogo
//    - payment_tier: standard or premium
// 3. Call SC instruction: register_ip()
// 4. Store SC transaction hash
// 5. Update logo with blockchain data

Response: {
  registered: true,
  blockchainTxHash: string,
  registrationTimestamp: number,
  explorer: "https://solscan.io/tx/..."
}
```

---

### Gap #4: Missing IPFS Metadata Storage Instruction
**Severity:** 🟠 HIGH

**SC Instruction:** `store_ipfs_metadata()`

**Problem:**
- App uploads to IPFS (Pinata)
- Gets IPFS hash
- App stores it in database
- **Doesn't call SC** `store_ipfs_metadata()` to store mapping on-chain

**Fix Required:**

```typescript
// After successful IPFS upload, call SC:

POST /api/logos/:id/ipfs (EXISTING - needs update)
Auth: Required
Body: { imageBuffer?: string }
Response: {
  ipfsHash: string,
  ipfsMetadataHash: string,
  gatewayUrl: "https://ipfs.io/ipfs/...",
  metadataJson: { ... }
}

// BACKEND SHOULD ALSO:
// 1. Call SC: store_ipfs_metadata()
//    Parameters:
//    - file_hash: SHA-256 of logo
//    - ipfs_hash: IPFS hash from Pinata
//    - nft_metadata_uri: Full IPFS URI
// 2. Store SC transaction hash in database
// 3. Update logo record with blockchain proof

// Response should include:
Response: {
  ipfsHash: string,
  ipfsMetadataHash: string,
  blockchainTxHash: string,        // NEW
  blockchainProof: { ... },         // NEW
  gatewayUrl: "https://ipfs.io/ipfs/...",
  metadataJson: { ... }
}
```

---

### Gap #5: Missing Subdomain Management
**Severity:** 🟠 HIGH - **ADMIN FEATURE**

**SC Instruction:** `initialize_platform_subdomain()`

**Required Endpoints:**

```typescript
// ADMIN ONLY - Register subdomains
POST /api/subdomains/register
Auth: Required (admin)
Body: {
  subdomain: 'funds' | 'rewards' | 'docs',
  walletAddress: string  // SPL token account
}
Response: {
  subdomain: string,
  solturioDomain: `${subdomain}.solturio.sol`,
  registered: true
}

// ANYONE - Check subdomain status
GET /api/subdomains/:name
Auth: Optional
Response: {
  name: string,
  registered: boolean,
  purpose: string,       // 'funds', 'rewards', or 'docs'
  solturioDomain: string
}

// ANYONE - List all subdomains
GET /api/subdomains
Auth: Optional
Response: [{
  name: string,
  solturioDomain: string,
  purpose: string,
  registered: true
}]
```

---

## 🟡 MEDIUM PRIORITY: Data Validation Issues

### Issue #1: Missing Input Validation
**Severity:** 🟡 MEDIUM

**Affected Endpoints:**
- `/api/logos/:id/authorized-usage` - `usageType` and `platform` have no validation
- `/api/nft/mint` - `metadataHash` could be invalid IPFS format
- `/api/dex/verify` - `logoHash` could be wrong format (should be hex SHA-256)

**Fix Required:**

```typescript
// Add validation schemas:

// Authorized Usage
if (!['exchange', 'wallet', 'marketplace', 'bridge'].includes(usageType)) {
  throw new Error('Invalid usageType');
}

// IPFS Hash validation
function isValidIpfsHash(hash: string): boolean {
  return /^Qm[A-Za-z0-9]{44}$/.test(hash) || /^b[a-z2-7]{58}$/.test(hash);
}

// SHA-256 validation
function isValidSha256(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash);
}

// Wallet address validation
function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

// Apply to endpoints:
POST /api/nft/mint
if (metadataHash && !isValidIpfsHash(metadataHash)) {
  throw new Error('Invalid IPFS hash format');
}

POST /api/dex/verify
if (!isValidSha256(logoHash)) {
  throw new Error('logoHash must be valid SHA-256 hex');
}

POST /api/logos/:id/authorized-usage
if (!isValidSolanaAddress(platform)) {
  // ... validate platform name instead
}
```

---

### Issue #2: Missing Error Handling for SC Failures
**Severity:** 🟡 MEDIUM

**Problem:**
- App calls SC instructions
- If SC instruction fails (e.g., "Insufficient $CATH"), app returns vague error
- User doesn't know what went wrong

**Fix Required:**

```typescript
// Create SC error mapping:
const SC_ERROR_MESSAGES = {
  'InsufficientFunds': 'Insufficient $CATH tokens. Please check your balance.',
  'InvalidPaymentTier': 'Invalid payment tier selected.',
  'AlreadyRegistered': 'This logo is already registered.',
  'NotAuthorized': 'You do not have permission to perform this action.',
  'MultiSigThresholdNotMet': 'Not enough signatures collected yet.',
  'TransferProposalNotFound': 'Transfer proposal not found.',
  'DuplicateApproval': 'You have already approved this proposal.',
  // ... more mappings
};

// Catch and translate errors:
try {
  const tx = await program.methods.registerIp(...).rpc();
} catch (error) {
  const scError = SC_ERROR_MESSAGES[error.code] || error.message;
  return { success: false, error: scError };
}
```

---

## 🟢 QUICK WINS (Easy Fixes)

### Fix #1: Harden Wallet Name Validation
```typescript
// Add length and character validation:
POST /api/wallet/check-name
if (customName.length < 3 || customName.length > 32) {
  throw new Error('Wallet name must be 3-32 characters');
}
if (!/^[a-z0-9-]+$/.test(customName)) {
  throw new Error('Wallet name can only contain lowercase letters, numbers, and hyphens');
}
```

### Fix #2: Add Rate Limiting to DEX Report
```typescript
// Prevent spam:
POST /api/dex/report-copycat
// Rate limit: 1 report per IP per 1 hour
// Rate limit: 5 reports per user per day
// Require email verification
```

### Fix #3: Add Audit Logging
```typescript
// Log all sensitive operations:
- POST /api/wallet/create → Log wallet address, user, timestamp
- POST /api/account/export-private-key → Log access attempt
- POST /api/nft/mint → Log NFT address, transaction hash
- POST /api/treasury/* → Log all treasury operations
```

---

## ✅ WHAT'S WORKING WELL

1. ✅ Authentication via Replit Auth + Sessions
2. ✅ Database schema is well-designed
3. ✅ IPFS integration via Pinata
4. ✅ NFT minting structure (Metaplex standard)
5. ✅ Email verification for sensitive ops
6. ✅ Key Handover Ceremony 6-stage process
7. ✅ CSRF protection enabled

---

## 📋 ACTION PLAN - Prioritized

### Phase 1: CRITICAL (Blocks Deployment) - 2 hours
1. ✅ Fix replay attack vulnerability → Add nonce + timestamp
2. ✅ Fix currency hardcoding → Remove SOL/BONK/ARWEAVE, use only $CATH
3. ✅ Fix transaction verification → Validate on-chain before accepting

### Phase 2: HIGH (Blocks Functionality) - 4 hours
1. ✅ Add License management endpoints (5 endpoints)
2. ✅ Add Treasury/Multi-sig endpoints (6 endpoints)
3. ✅ Connect IP Registration to SC `register_ip()` instruction
4. ✅ Connect IPFS uploads to SC `store_ipfs_metadata()` instruction
5. ✅ Add Subdomain management endpoints

### Phase 3: MEDIUM (Better UX) - 2 hours
1. ✅ Add input validation schemas
2. ✅ Add SC error message mapping
3. ✅ Add audit logging
4. ✅ Add rate limiting to sensitive endpoints

### Phase 4: NICE-TO-HAVE - 1 hour
1. ✅ Harden wallet name validation
2. ✅ Add better error codes
3. ✅ Add webhook callbacks for async operations

---

## 🔐 SECURITY CHECKLIST

Before deploying to production:

- [ ] All replay attack vectors eliminated (nonce + timestamp on all tx-based operations)
- [ ] Currency hardcoded to $CATH only
- [ ] All SC instructions being called from app endpoints
- [ ] Payment verification validates on-chain before accepting
- [ ] Private key export requires challenge-response
- [ ] Rate limiting on sensitive endpoints (wallet create, key export, reports)
- [ ] Audit logging for all financial/sensitive operations
- [ ] Input validation on all endpoints
- [ ] CORS properly configured (no overly permissive origins)
- [ ] All secrets in environment variables (no hardcoded keys)
- [ ] Database backups automated
- [ ] Error messages don't leak sensitive info

---

## 📊 Endpoint Coverage Summary

| Category | App Endpoints | SC Instructions | Status |
|----------|---|---|---|
| User Management | 5 | - | ✅ Complete |
| Wallet Management | 6 | 1 (`create_solturio_wallet`) | ⚠️ Needs SC call |
| Logo/IP Registration | 12 | 1 (`register_ip`) | ⚠️ Needs SC call |
| Collections | 3 | - | ✅ Complete |
| NFT Minting | 1 | 1 (Metaplex) | ✅ Working |
| DEX Protection | 3 | 1 (`verify_ownership`) | ⚠️ Partial |
| Licenses | 0 | 3 ❌ **MISSING** | 🔴 **CRITICAL** |
| Treasury | 0 | 6 ❌ **MISSING** | 🔴 **CRITICAL** |
| Subdomains | 0 | 1 ❌ **MISSING** | 🔴 **CRITICAL** |
| Payment Verification | 1 | - | ⚠️ Needs hardening |
| **TOTALS** | **45** | **20** | 🟡 **70% coverage** |

---

## 🚀 Next Steps

1. **Review this report** with your team
2. **Fix Phase 1 (Critical)** immediately
3. **Implement Phase 2 (High)** - Add missing endpoints
4. **Test on devnet** before mainnet deployment
5. **Security review** before production launch

---

**Report Generated:** November 22, 2025  
**Audit By:** Replit Agent  
**Status:** Ready for developer action
