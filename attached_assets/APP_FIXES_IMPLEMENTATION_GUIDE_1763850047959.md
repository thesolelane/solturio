# SOLTURIO APP - Security Fixes Implementation Guide
**For Frontend Development Team**

---

## 📋 Quick Reference

**Total Fixes:** 3 Phases  
**Estimated Time:** 8 hours  
**Priority:** CRITICAL before mainnet deployment  

### Phase Breakdown:
- **Phase 1 (CRITICAL):** 2 hours - Deploy blocking fixes
- **Phase 2 (HIGH):** 4 hours - Add missing SC integrations  
- **Phase 3 (MEDIUM):** 2 hours - Polish & validation

---

## 🔴 PHASE 1: CRITICAL SECURITY FIXES (2 hours)

### FIX 1.1: Replay Attack Prevention
**File:** `server/api/wallet/create.ts` (and all payment endpoints)

**Current Code (VULNERABLE):**
```typescript
POST /api/wallet/create
Body: {
  walletType: 'standard' | 'premium',
  customName?: string,
  paymentTxHash: string,        // ❌ VULNERABLE
  currency: 'SOL' | 'BONK' | 'CATH' | 'ARWEAVE'
}
```

**Fixed Code:**
```typescript
POST /api/wallet/create
Body: {
  walletType: 'standard' | 'premium',
  customName?: string,
  paymentTxHash: string,
  nonce: string,                // ✅ NEW: Random 32-byte hex
  timestamp: number             // ✅ NEW: Unix timestamp
}

// Backend validation:
async function createWallet(req, res) {
  const { walletType, customName, paymentTxHash, nonce, timestamp } = req.body;
  
  // 1. Validate timestamp (within 5 minutes)
  const now = Date.now();
  const reqTime = timestamp * 1000;
  if (Math.abs(now - reqTime) > 5 * 60 * 1000) {
    return res.status(400).json({ error: 'Request expired' });
  }
  
  // 2. Check nonce hasn't been used
  const existingNonce = await db.query(
    'SELECT * FROM replay_prevention WHERE nonce = $1',
    [nonce]
  );
  if (existingNonce.rows.length > 0) {
    return res.status(400).json({ error: 'Nonce already used (replay detected)' });
  }
  
  // 3. Store nonce to prevent future replays
  await db.query(
    'INSERT INTO replay_prevention (nonce, used_at) VALUES ($1, NOW())',
    [nonce]
  );
  
  // 4. Check txHash not used before
  const existingTx = await db.query(
    'SELECT * FROM wallets WHERE payment_tx_hash = $1',
    [paymentTxHash]
  );
  if (existingTx.rows.length > 0) {
    return res.status(400).json({ error: 'Payment already used' });
  }
  
  // 5. Verify payment on-chain (Fix 1.3)
  const paymentValid = await verifyPayment(paymentTxHash);
  if (!paymentValid) {
    return res.status(400).json({ error: 'Payment verification failed' });
  }
  
  // 6. Create wallet
  const wallet = Keypair.generate();
  // ... rest of wallet creation
}
```

**Database Schema Addition:**
```sql
CREATE TABLE replay_prevention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce VARCHAR(255) UNIQUE NOT NULL,
  used_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX idx_replay_nonce ON replay_prevention(nonce);
```

**Update ALL payment endpoints:**
- `POST /api/wallet/create`
- `POST /api/payments/verify`
- `POST /api/nft/mint`
- `POST /api/receipt/send`
- Any other endpoint accepting `paymentTxHash`

---

### FIX 1.2: Hardcode $CATH Only (Remove Multi-Currency)
**File:** `server/config/constants.ts`

**Current Code:**
```typescript
export const SUPPORTED_CURRENCIES = ['SOL', 'BONK', 'CATH', 'ARWEAVE'];

export const CURRENCY_MINTS = {
  SOL: 'native',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  CATH: '48rmvKgpGpUNUuH3n2UYTZS2AUxZEkaCiNjQ57q1duMA',
  ARWEAVE: 'AR1Mtgh7zAtxuxGd2XPovXPVjcSdY3i4rQYisNadjfKy'
};
```

**Fixed Code:**
```typescript
// PRODUCTION: CATH only
export const PRIMARY_PAYMENT_CURRENCY = 'CATH';
export const CATH_MINT = '48rmvKgpGpUNUuH3n2UYTZS2AUxZEkaCiNjQ57q1duMA';

// Optional: SOL for wallet creation fees
export const WALLET_CREATION_CURRENCY = 'SOL'; // For gas/creation fees only
export const ALLOWED_CURRENCIES = ['CATH', 'SOL']; // Limited set

// Remove from API responses:
// currency: 'SOL' | 'BONK' | 'CATH' | 'ARWEAVE'
```

**Update API Endpoints:**

```typescript
// Before - VULNERABLE
POST /api/wallet/create
Body: { currency: 'SOL' | 'BONK' | 'CATH' | 'ARWEAVE' }

// After - FIXED
POST /api/wallet/create
Body: {
  walletType: 'standard' | 'premium',
  customName?: string,
  paymentTxHash: string,
  nonce: string,
  timestamp: number
  // NO currency parameter - always use $CATH for registrations
  // Wallets use SOL for creation fees
}

// Backend validation:
function validatePaymentCurrency(paymentType: string) {
  if (paymentType === 'wallet_creation') return 'SOL';
  if (paymentType === 'ip_registration') return 'CATH';
  throw new Error('Invalid payment type');
}
```

---

### FIX 1.3: On-Chain Payment Verification
**File:** `server/services/payment-verification.ts`

**New Implementation:**
```typescript
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const CATH_MINT = '48rmvKgpGpUNUuH3n2UYTZS2AUxZEkaCiNjQ57q1duMA';
const TREASURY_CATH_ACCOUNT = process.env.TREASURY_CATH_ACCOUNT; // Add to .env
const TREASURY_SOL_WALLET = process.env.TREASURY_SOL_WALLET;      // Add to .env

async function verifyPayment(
  txHash: string,
  expectedAmount: number,
  expectedCurrency: 'SOL' | 'CATH'
): Promise<{ valid: boolean; amount?: number; error?: string }> {
  try {
    const connection = new Connection(
      clusterApiUrl('mainnet-beta'),
      'confirmed'
    );

    // 1. Fetch transaction
    const tx = await connection.getParsedTransaction(txHash, 'confirmed');
    if (!tx) {
      return { valid: false, error: 'Transaction not found on-chain' };
    }

    // 2. Check confirmation status
    if (!tx.blockTime || tx.meta?.err) {
      return { valid: false, error: 'Transaction failed or not confirmed' };
    }

    // 3. Extract transfer instruction
    const transferInstruction = tx.transaction.message.instructions.find(
      (ix: any) => {
        if (expectedCurrency === 'CATH') {
          return (
            ix.program === 'spl-token' &&
            ix.parsed?.type === 'transferChecked'
          );
        } else if (expectedCurrency === 'SOL') {
          return (
            ix.program === 'system' &&
            ix.parsed?.type === 'transfer'
          );
        }
        return false;
      }
    );

    if (!transferInstruction) {
      return {
        valid: false,
        error: `No ${expectedCurrency} transfer found in transaction`
      };
    }

    // 4. Validate transfer details
    if (expectedCurrency === 'CATH') {
      const parsed = transferInstruction.parsed;
      
      // Check mint
      if (parsed.mint !== CATH_MINT) {
        return { valid: false, error: 'Wrong token mint' };
      }
      
      // Check recipient
      if (parsed.destination !== TREASURY_CATH_ACCOUNT) {
        return { valid: false, error: 'Payment sent to wrong address' };
      }
      
      // Check amount (with 9 decimals for CATH)
      const receivedAmount = BigInt(parsed.tokenAmount.amount);
      const expectedAmountBigInt = BigInt(expectedAmount) * BigInt(10) ** BigInt(9);
      if (receivedAmount < expectedAmountBigInt) {
        return {
          valid: false,
          error: `Insufficient amount. Expected ${expectedAmount}, got ${parsed.tokenAmount.amount}`
        };
      }
      
      return { valid: true, amount: Number(receivedAmount) };
    }
    
    if (expectedCurrency === 'SOL') {
      const parsed = transferInstruction.parsed;
      
      // Check recipient
      if (parsed.destination !== TREASURY_SOL_WALLET) {
        return { valid: false, error: 'Payment sent to wrong address' };
      }
      
      // Check amount (in lamports)
      const receivedAmount = parsed.amount;
      const expectedAmountLamports = expectedAmount;
      if (BigInt(receivedAmount) < BigInt(expectedAmountLamports)) {
        return {
          valid: false,
          error: `Insufficient SOL. Expected ${expectedAmount}, got ${receivedAmount}`
        };
      }
      
      return { valid: true, amount: receivedAmount };
    }

    return { valid: false, error: 'Unknown currency' };
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      valid: false,
      error: 'Payment verification failed: ' + (error as Error).message
    };
  }
}

export default verifyPayment;
```

**Update .env:**
```env
TREASURY_CATH_ACCOUNT=xxx  # Your CATH token account
TREASURY_SOL_WALLET=xxx    # Your SOL wallet
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**Usage in endpoints:**
```typescript
POST /api/wallet/create
async handler (req, res) {
  const { paymentTxHash, walletType } = req.body;
  
  const expectedAmount = walletType === 'premium' ? 150 : 100; // $CATH
  
  const verification = await verifyPayment(paymentTxHash, expectedAmount, 'CATH');
  
  if (!verification.valid) {
    return res.status(400).json({ error: verification.error });
  }
  
  // Proceed with wallet creation
  ...
}
```

---

## 🟠 PHASE 2: HIGH PRIORITY - Smart Contract Integration (4 hours)

### ADD 2.1: License Management Endpoints
**New File:** `server/api/licenses.ts`

```typescript
// 1. CREATE LICENSE
POST /api/licenses/create
Auth: Required
Body: {
  logoId: string,
  licenseType: 'AllRightsReserved' | 'CreativeCommons' | 'Custom',
  paymentStructure: 'lumpSum' | 'installments',
  totalAmount: number,
  numPayments?: number,
  humanReadableTerms: string,
  termsIpfsUri?: string
}
Response: { licenseId, status, totalAmount }

// Implementation:
async function createLicense(req, res) {
  const { logoId, licenseType, paymentStructure, totalAmount, humanReadableTerms, termsIpfsUri } = req.body;
  
  // 1. Get logo to verify ownership
  const logo = await db.query('SELECT * FROM logos WHERE id = $1 AND user_id = $2', 
    [logoId, req.user.id]);
  if (!logo.rows.length) {
    return res.status(404).json({ error: 'Logo not found' });
  }
  
  // 2. Get logo metadata_uri from DB
  const fileHash = logo.rows[0].file_hash;
  const metadataUri = logo.rows[0].ipfs_metadata_hash || logo.rows[0].ipfs_hash;
  
  // 3. Call SC instruction: create_license()
  const program = new Program(IDL, PROGRAM_ID, provider);
  const licensePDA = PublicKey.findProgramAddressSync(
    [Buffer.from('license'), new PublicKey(logoId).toBuffer()],
    program.programId
  )[0];
  
  const createLicenseTx = await program.methods
    .createLicense(
      { [licenseType.toLowerCase()]: {} }, // Enum variant
      { [paymentStructure.toLowerCase()]: paymentStructure === 'installments' ? { numPayments: numPayments || 12 } : {} },
      new BN(totalAmount),
      humanReadableTerms,
      termsIpfsUri || null
    )
    .accounts({
      license: licensePDA,
      ipRegistration: ipRegistrationPDA,
      licenseIssuer: req.user.solana_public_key,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  
  // 4. Store in database
  const licenseId = generateUUID();
  await db.query(
    'INSERT INTO licenses (id, logo_id, issuer_id, type, structure, amount, tx_hash, terms_ipfs) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [licenseId, logoId, req.user.id, licenseType, paymentStructure, totalAmount, createLicenseTx, termsIpfsUri]
  );
  
  return res.json({ licenseId, status: 'created', totalAmount });
}

// 2. MAKE LICENSE PAYMENT
POST /api/licenses/:licenseId/pay
Auth: Required
Body: {
  paymentNumber: number,
  paymentTxHash: string,
  nonce: string,
  timestamp: number
}
Response: { success, paymentNumber, amountPaid, remaining }

// Implementation similar to wallet creation - verify payment + call SC instruction

// 3. GET USER'S CREATED LICENSES
GET /api/licenses/created
Response: [{ id, logoId, type, totalAmount, paid, status }]

// 4. GET USER'S LICENSES TO PAY
GET /api/licenses/active
Response: [{ id, issuer, logo, amountDue, dueDate }]

// 5. VERIFY LICENSE ON-CHAIN
GET /api/licenses/:licenseId/verify
Response: { verified, issuer, status, blockchainTxHash }
```

**Database Schema:**
```sql
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_id UUID REFERENCES logos(id),
  issuer_id UUID REFERENCES users(id),
  type VARCHAR(50),
  structure VARCHAR(50),
  amount BIGINT,
  paid BIGINT DEFAULT 0,
  tx_hash VARCHAR(255),
  terms_ipfs VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### ADD 2.2: Treasury & Multi-Sig Endpoints
**New File:** `server/api/treasury.ts`

```typescript
// ADMIN SETUP (one-time)
POST /api/treasury/setup-multisig
Body: { signers: string[], threshold: number }
// Calls SC: initialize_multisig()

// PROPOSE TRANSFER
POST /api/treasury/propose-transfer
Body: { amount: number, description: string }
// Calls SC: propose_treasury_transfer()

// APPROVE PROPOSAL
POST /api/treasury/approve-transfer/:proposalId
// Calls SC: approve_transfer()

// EXECUTE TRANSFER
POST /api/treasury/execute-transfer/:proposalId
// Calls SC: transfer_treasury_funds()

// CANCEL PROPOSAL
POST /api/treasury/cancel-transfer/:proposalId
// Calls SC: cancel_transfer_proposal()

// VIEW STATUS
GET /api/treasury/status
Response: { balance, transferred, schedule, nextTransfer }

// VIEW PROPOSALS
GET /api/treasury/proposals
Response: [{ id, amount, proposer, approvals, status }]
```

---

### ADD 2.3: Connect IP Registration to SC
**File:** `server/api/logos.ts` - UPDATE existing endpoint

**Current (MISSING SC CALL):**
```typescript
POST /api/logos/upload
// Creates logo in DB only
// Does NOT register on blockchain
```

**Fixed (CALL SC):**
```typescript
// After upload completes, add:
POST /api/logos/:id/register-on-chain
Auth: Required
Body: {
  paymentTxHash: string,
  nonce: string,
  timestamp: number
}

async function registerLogoOnChain(req, res) {
  const { logoId } = req.params;
  
  // 1. Get logo
  const logo = await db.query('SELECT * FROM logos WHERE id = $1', [logoId]);
  
  // 2. Verify payment
  const paymentValid = await verifyPayment(paymentTxHash, 100, 'CATH');
  if (!paymentValid) return res.status(400).json({ error: 'Payment failed' });
  
  // 3. Call SC instruction: register_ip()
  const program = new Program(IDL, PROGRAM_ID, provider);
  const ipRegistrationPDA = PublicKey.findProgramAddressSync(
    [Buffer.from('ip'), Buffer.from(logo.file_hash)],
    program.programId
  )[0];
  
  const registrationType = logo.type === 'token' ? 'tokenLogo' : 'artwork';
  
  const tx = await program.methods
    .registerIp(
      { [registrationType]: {} },
      logo.file_hash,
      logo.ipfs_metadata_hash,
      { standard: {} },
      true, // acknowledges disclaimer
      true  // acknowledges no endorsement
    )
    .accounts({
      ipRegistration: ipRegistrationPDA,
      platformConfig: PLATFORM_CONFIG_PDA,
      owner: new PublicKey(req.user.solana_public_key),
      cathMint: new PublicKey(CATH_MINT),
      userCathAccount: new PublicKey(req.user.cath_token_account),
      treasuryTokenAccount: new PublicKey(TREASURY_CATH_ACCOUNT),
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  
  // 4. Update database
  await db.query(
    'UPDATE logos SET blockchain_tx = $1, registered_at = NOW() WHERE id = $2',
    [tx, logoId]
  );
  
  return res.json({ registered: true, blockchainTxHash: tx });
}
```

---

### ADD 2.4: Connect IPFS Upload to SC
**File:** `server/api/logos.ts` - UPDATE IPFS endpoint

**Current:**
```typescript
POST /api/logos/:id/ipfs
Response: { ipfsHash, ipfsMetadataHash, gatewayUrl }
// Stores only in DB - no SC call
```

**Fixed:**
```typescript
POST /api/logos/:id/ipfs
Response: {
  ipfsHash,
  ipfsMetadataHash,
  blockchainTxHash,  // NEW - SC transaction
  blockchainProof,   // NEW - verification
  gatewayUrl
}

// After IPFS upload, call SC:
const tx = await program.methods
  .storeIpfsMetadata(
    logo.file_hash,
    ipfsHash,
    `ipfs://${ipfsMetadataHash}`
  )
  .accounts({
    ipfsMetadataStore: ipfsMetadataStorePDA,
    platformConfig: PLATFORM_CONFIG_PDA,
    owner: new PublicKey(req.user.solana_public_key),
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Return both IPFS + blockchain proof
```

---

### ADD 2.5: Subdomain Management
**New File:** `server/api/subdomains.ts`

```typescript
// ADMIN ONLY - Create subdomain
POST /api/subdomains/register
Auth: Required (admin)
Body: { subdomain: 'funds' | 'rewards' | 'docs', walletAddress: string }
// Calls SC: initialize_platform_subdomain()

// CHECK STATUS
GET /api/subdomains/:name
Response: { name, registered, solturioDomain }

// LIST ALL
GET /api/subdomains
Response: [{ name, solturioDomain, purpose }]
```

---

## 🟡 PHASE 3: MEDIUM PRIORITY - Validation & Polish (2 hours)

### ADD 3.1: Input Validation Schemas
**File:** `server/middleware/validation.ts`

```typescript
// Wallet name validation
export function validateWalletName(name: string): boolean {
  if (name.length < 3 || name.length > 32) return false;
  if (!/^[a-z0-9-]+$/.test(name)) return false;
  return true;
}

// IPFS hash validation
export function isValidIpfsHash(hash: string): boolean {
  return /^Qm[A-Za-z0-9]{44}$/.test(hash) || /^b[a-z2-7]{58}$/.test(hash);
}

// SHA-256 validation
export function isValidSha256(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash);
}

// Apply to endpoints
POST /api/nft/mint
if (metadataHash && !isValidIpfsHash(metadataHash)) {
  return res.status(400).json({ error: 'Invalid IPFS hash format' });
}
```

### ADD 3.2: SC Error Mapping
**File:** `server/services/sc-errors.ts`

```typescript
const SC_ERROR_MESSAGES: { [key: string]: string } = {
  'InsufficientFunds': 'Insufficient $CATH tokens in wallet',
  'InvalidPaymentTier': 'Invalid payment tier selected',
  'AlreadyRegistered': 'This IP is already registered',
  'NotAuthorized': 'You do not have permission',
  'MultiSigThresholdNotMet': 'Not enough signatures',
  'TransferProposalNotFound': 'Proposal not found',
  'DuplicateApproval': 'You already approved this',
  'ContractPaused': 'Contract is temporarily paused',
};

// Usage
try {
  await program.methods.registerIp(...).rpc();
} catch (error) {
  const message = SC_ERROR_MESSAGES[error.code] || error.message;
  return res.status(400).json({ error: message });
}
```

### ADD 3.3: Audit Logging
**File:** `server/middleware/audit-log.ts`

```typescript
async function logAuditEvent(
  userId: string,
  action: string,
  resourceId: string,
  details: any,
  success: boolean
) {
  await db.query(
    'INSERT INTO audit_logs (user_id, action, resource_id, details, success, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
    [userId, action, resourceId, JSON.stringify(details), success]
  );
}

// Log critical operations:
- POST /api/wallet/create → 'wallet_created'
- POST /api/account/export-private-key → 'private_key_exported'
- POST /api/nft/mint → 'nft_minted'
- POST /api/treasury/* → 'treasury_operation'
```

---

## ✅ COMPLETION CHECKLIST

### Phase 1 Checklist:
- [ ] Added `nonce` + `timestamp` to all payment endpoints
- [ ] Created `replay_prevention` table in DB
- [ ] Hardcoded `CATH` only (removed SOL/BONK/ARWEAVE)
- [ ] Implemented `verifyPayment()` function with on-chain check
- [ ] Updated .env with `TREASURY_CATH_ACCOUNT` and `TREASURY_SOL_WALLET`
- [ ] Tested replay prevention with duplicate transaction hashes
- [ ] Tested currency validation rejects non-CATH tokens

### Phase 2 Checklist:
- [ ] Created `/api/licenses/*` endpoints (5 endpoints)
- [ ] Created `/api/treasury/*` endpoints (6 endpoints)
- [ ] Connected `/api/logos/:id/register-on-chain` to `register_ip()` SC instruction
- [ ] Connected `/api/logos/:id/ipfs` to `store_ipfs_metadata()` SC instruction
- [ ] Created `/api/subdomains/*` endpoints (3 endpoints)
- [ ] Tested license creation with SC integration
- [ ] Tested multi-sig proposal workflow
- [ ] Tested IPFS metadata storage on-chain

### Phase 3 Checklist:
- [ ] Added input validation to all endpoints
- [ ] Created SC error message mapping
- [ ] Implemented audit logging for sensitive operations
- [ ] Tested error messages are user-friendly
- [ ] Tested rate limiting works

---

## 📊 TEST CHECKLIST (Before Mainnet)

**On Devnet:**
- [ ] Create wallet → Verify SC call succeeds
- [ ] Register IP → Verify on-chain record exists
- [ ] Create license → Verify SC stores agreement
- [ ] Make payment → Verify replay prevention works
- [ ] Mint NFT → Verify IPFS metadata stored on-chain
- [ ] Treasury proposal → Verify multi-sig workflow
- [ ] Duplicate tx hash → Verify rejected with replay error

**Before Production:**
- [ ] All endpoints return proper HTTP status codes
- [ ] All errors are user-readable
- [ ] Audit logs record all sensitive operations
- [ ] Rate limiting prevents abuse
- [ ] Private key export requires challenge-response
- [ ] Payment verification validates on-chain

---

## 📥 DOWNLOAD COMPLETION REPORT

**When all fixes are complete, run:**

```bash
npm run generate-audit-report
```

This will:
1. ✅ Verify all Phase 1 fixes are deployed
2. ✅ Verify all Phase 2 endpoints exist
3. ✅ Verify all Phase 3 validation is active
4. ✅ Generate completion report: `SOLTURIO_COMPLETION_REPORT_[DATE].pdf`
5. ✅ Generate JSON summary: `audit-completion.json`

**Report includes:**
- All fixes implemented ✓
- Test results from devnet
- Security audit passed ✓
- Ready for mainnet: YES/NO
- Final recommendation

---

## 🚀 Next Steps After Fixes

1. Deploy to devnet with fixed app
2. Run all tests from TEST CHECKLIST
3. Generate completion report
4. Send report to security team for final review
5. Deploy to mainnet when approved

**Questions?** Contact the development team

---

Generated: November 22, 2025  
Solturio Security Fixes v1.0
