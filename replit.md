# Solturio - Decentralized NFT Logo Protection Platform

## Overview

Solturio is a **CATH Ecosystem project** - a fully decentralized web application that runs on **$CATH** and protects intellectual property by minting logos as NFTs on the Solana blockchain. It provides immutable, timestamped proof of ownership for trademarks and brand assets, allowing users to upload logo files, store them on a dedicated image registry, and mint minimal on-chain NFT metadata. The platform aims to offer blockchain-verified proof of logo ownership for IP disputes and takedown requests on crypto platforms, complemented by IP education and gamified learning. Solturio envisions intellectual property protection as a continuous journey, leveraging blockchain for robust, verifiable ownership.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript (Vite).
- **Routing**: Wouter.
- **State Management**: TanStack Query for server state, React hooks for local state.
- **UI Components**: shadcn/ui (Radix UI) with Tailwind CSS, emphasizing clarity and professional design.
- **Form Handling**: React Hook Form with Zod validation.
- **Design Principles**: TypeScript path aliases, component co-location, mobile-first responsive design.

### Backend
- **Runtime**: Node.js with Express.js (TypeScript, ESM).
- **API Pattern**: RESTful API.
- **Session Management**: `express-session` with PostgreSQL store, secure HTTP-only cookies.
- **File Processing**: Multer for multipart/form-data, Sharp for image metadata extraction (dimensions, format, color palette, SHA-256 hash).
- **Metadata Storage**: Stores only JSON metadata with ownership claims, timestamps, and IP protection info; no full image file storage.
- **Architectural Patterns**: Storage abstraction, middleware for logging, custom error handling.

### Database
- **Database**: PostgreSQL (Neon serverless) using Drizzle ORM.
- **Schema**: Includes tables for `users`, `logos`, `collections`, `payments`, `authorized_usages`, `quiz_questions`, `quiz_attempts`, `quiz_stats`, and `sessions`.
- **Design Decisions**: UUID primary keys, timestamp fields, JSONB for flexible metadata, string-based amounts for crypto precision.

### Authentication & Authorization
- **Provider**: Replit Auth (OpenID Connect) via Passport.js, session-based authentication.
- **Wallet Creation**: `xxx.solturio.sol` wallet created upon first artwork/logo registration, funded by the user (0.1 SOL Standard, 0.15 SOL Premium).
- **Wallet Types**: Number-based (`042.solturio.sol`) or custom branded (`brandname.solturio.sol`).
- **Wallet Security**: BIP39 12-word recovery phrase, private keys encrypted with AES-256-GCM, multi-stage Key Handover Ceremony, recovery service available.
- **Wallet Restrictions**: `xxx.solturio.sol` wallets programmatically reject SPL tokens, accepting only platform-generated certificates/contracts.
- **Security**: Secure HTTP-only session cookies, CSRF protection, environment-based session secrets, unique encryption salts per wallet.

### Key Features
- **Payment Policy**: CATH Ecosystem project running on $CATH - crypto-only payments (SOL, BONK, Arweave, $CATH as primary), no fiat.
- **Onboarding & Wallet System**: Two-tier wallet naming, 6-stage key handover ceremony, IPFS upload control by Solturio.
- **Registration Templates**: Multi-step wizard flows for "Token Launch" (7 questions) and "Artwork" (11 questions + social media), with conditional fields and robust validation.
- **IP Protection Messaging**: Clear distinction between "Get Protected" (registration) and "Report IP Theft."
- **DEX Anti-Copycat System**: Real-time verification API for DEX platforms, detecting stolen logos by file hash, automated DMCA takedown.
- **IP Education Quiz Bot (Telegram)**: Automated quizzes with dual scoring system - **Game Points** (competitive, 1st place only gets time-based 50-150 pts) and **Experience Points** (participation rewards: 1st gets same as game points, 2nd gets 10 exp, 3rd gets 5 exp, 4th gets 3 exp, 5th+ gets 1 exp, wrong answers get 0). Two separate leaderboards (`/leaderboard` for game points, `/exp` for experience), real-time tracking, and future $CATH token rewards.
- **Security Enhancements**: CSRF protection, robust crypto payment verification, and SPL token restriction system for Solturio wallets.
- **NFT Minting**: JSON-only on-chain metadata via Metaplex SDK.
- **Authorized Usage Tracking**: Users pre-register where logos will be used to strengthen IP protection claims.
- **IP Education**: Knowledge base and gamified learning (IP Quiz).

## Data Storage Architecture

**Four-Tier Decentralized Storage:**
1. **PostgreSQL (On-Server)**: User info, thumbnails, metadata, ownership claims
2. **IPFS (Pinata)**: Metadata JSON with file hashes (small, cheap)
3. **Arweave**: Verified badge images for sharing (permanent, one-time payment)
4. **Solana Blockchain**: NFT certificates with immutable hashes (immutable proof of ownership)

**Storage by Content Type:**
| Content | Storage | Purpose | Cost |
|---------|---------|---------|------|
| Thumbnails | Server | Fast display in dashboard | Free |
| Metadata JSON | IPFS | File hashes, ownership records | Low (small file) |
| Badge Images | Arweave | Permanent shareable URLs | One-time ~$1-2/100MB |
| NFT Certificate | Solana | Proof of ownership | Mint fee |
| User Wallet | Solana | Holds NFT + SOL for fees | N/A |

**Data Flow:**
- User uploads logo → Server extracts metadata (SHA-256, dimensions, colors)
- Server generates thumbnail → Stored locally for display
- User mints collection → Badge overlay added to images
- Badge images → Uploaded to Arweave (permanent URL for sharing)
- Metadata JSON → Uploaded to IPFS via Pinata (referenced in NFT)
- NFT Certificate → Minted on Solana with IPFS hash pointer
- Arweave URLs → Stored in database, displayed to user for sharing

**Environment Variables (Arweave):**
- `ARWEAVE_WALLET_KEY` - JSON keyfile for Solturio's Arweave wallet (pays for all user uploads)

## Implementation Progress

### Phase 1: Security Fixes ✅ COMPLETE
- ✅ Replay attack prevention (nonce/timestamp validation)
- ✅ Currency hardcoding ($CATH for IP ops, SOL for wallets)
- ✅ On-chain payment verification with blockchain confirmation
- ✅ Wallet creation endpoint updated with Phase 1 security

### Phase 2: License Management & Treasury ✅ COMPLETE
- ✅ License endpoints (5): create, pay, get created/active, verify
- ✅ Treasury endpoints (6): multi-sig setup, propose/approve/execute/cancel transfers, status, proposals
- ✅ Database schema: licenses, treasury_proposals, treasury_approvals tables
- ✅ All endpoints integrated into main router and running

### Phase 3: Input Validation & Error Mapping ✅ COMPLETE
- ✅ Zod-based input validation for all endpoints
- ✅ Standardized error response format with error codes
- ✅ Audit logging service (in-memory, database-ready)
- ✅ Request ID generation & correlation
- ✅ Applied to license & treasury endpoints

### Phase 4: SC Integration ✅ COMPLETE
- ✅ SC Client (`server/sc-client.ts`) - HMAC-SHA256 signed requests, retry with exponential backoff, circuit breaker pattern
- ✅ GitHub Proxy Router (`server/github-proxy.ts`) - 10 secure endpoints proxying to SC Replit
- ✅ Updated `sc-integration.ts` - Real SC calls when configured, mock fallback
- ✅ Transaction Builder (`client/src/lib/transaction-builder.ts`) - Dual-signature support
- ✅ GitHub Link Component (`client/src/components/github-link.tsx`) - OAuth flow, repo registration UI
- ✅ Account page updated with GitHub integration section
- ⏳ Leaderboard pages (pending)
- ⏳ DEX copycat report UI (pending)
- ⏳ Premium wallet naming UI (pending)

### Phase 5: Treasury Wallet & AML/KYC Compliance ✅ COMPLETE
- ✅ Database schema: 5 new tables (treasury_wallets, compliance_logs, kyc_status, compliance_trigger_rules, compliance_cases)
- ✅ Treasury Wallet Management: 4 wallet types (funds, rewards, escrow, bank) with real-time Solana balance fetching
- ✅ Admin API endpoints: Treasury CRUD (/api/admin/treasury/wallets), Compliance logs/triggers/cases endpoints
- ✅ 10 Default AML/KYC Trigger Rules: Value thresholds ($2k 30-day, $10k single, $25k manual), velocity checks (8/24h, 20/7d, 5x spike), pricing anomalies (10x median), concentration patterns (60% single, 80% top 3)
- ✅ Admin Dashboard Enhanced: Treasury tab with wallet cards, Add/Delete wallet dialogs, Compliance tab with trigger rules and case management
- ✅ Tiered KYC System: Tier 0 (registry only), Tier 1 (light KYC for escrow), Tier 2 (enhanced verification on triggers)

## SC Integration Architecture

### App ↔ SC Communication Pattern
```
[Frontend] → [App API] → [SC Client] → [SC Replit API] → [Solana]
                 ↑
         Request signing (HMAC-SHA256)
         Circuit breaker (5 failures = 30s cooldown)
         Retry with exponential backoff (3 attempts)
```

### Environment Variables (Required for SC Integration)
- `SC_API_URL` - SC Replit base URL (e.g., `https://your-sc-replit.replit.app`)
- `SC_API_SECRET` - Shared secret for HMAC request signing

### GitHub Proxy Endpoints (`/api/github/*`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/link-wallet` | POST | Link Solana wallet to GitHub |
| `/oauth/start` | GET | Start GitHub OAuth flow |
| `/oauth/callback` | GET | Handle OAuth callback |
| `/register-code` | POST | Register code repository |
| `/close-challenge` | POST | Close expired OAuth challenge |
| `/link-status/:wallet` | GET | Get link status for wallet |
| `/on-chain-status/:wallet` | GET | Check on-chain account |
| `/registrations/:wallet` | GET | List registered repos |
| `/webhook` | POST | GitHub push notifications |
| `/status` | GET | SC connection status |

### Dual-Signature Transaction Flow
1. Frontend calls app endpoint
2. App proxies to SC with signed request
3. SC returns `onChain.instruction` metadata
4. Platform backend signs first (partial tx)
5. Frontend wallet co-signs and submits

## Verification Badge System

**Gold Check Badge** - Visual indicator for verified/minted images:
- **File**: `solturio_badge_goldcheck.svg`
- **CID**: `bafybeidi3atbeaep4gzq5nirfocvnhwdcrrqp42vhreei7tk7cvrm4fjq4`
- **Placement**: Lower-left corner of verified images
- **Purpose**: Shows image is verified and affiliated with correct contract address
- **Rule**: Creators must use IPFS link (not raw image) to display verified status

**Verified Image Generation Flow**:
1. User uploads images to collection
2. User clicks "Mint Collection"
3. For each image file:
   - Read thumbnail from server
   - Overlay gold check badge on lower-left corner
   - Upload composite image to IPFS
   - Store verified IPFS hash in database
4. Return verified image URLs to user

**Components**:
- `shared/verification-assets.ts` - Badge CID and helper functions
- `client/src/components/verified-image.tsx` - VerifiedImage and VerificationBadge components
- `server/services/image-compositing.ts` - Sharp-based badge overlay service

## External Dependencies

-   **User Wallets**: `xxx.solturio.sol` domains (restricted to certificates/contracts).
-   **Blockchain**: Solana (Mainnet/Devnet, Metaplex Token Metadata, Solana web3.js).
-   **Cryptocurrencies**: SOL, BONK, Arweave, CATH (for payments).
-   **IPFS**: Pinata (Platform-controlled uploads, requires API keys).
-   **Image Processing**: Sharp.
-   **UI Framework**: Radix UI.
-   **Authentication**: Replit Auth (OpenID Connect).
-   **Database**: PostgreSQL (Neon serverless).
-   **Telegram**: Telegraf bot framework, node-cron.