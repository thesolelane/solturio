# Solturio - Decentralized NFT Logo Protection Platform

## Domain Ownership
- **Domains**: solturio.sol, solturio.com, solturio.app
- **Owner**: Cooperanth Consulting LLC
- **Status**: All domains purchased and under control

## Overview

Solturio is a fully decentralized web application that enables users to protect their intellectual property by minting logos as NFTs on the Solana blockchain. It provides immutable, timestamped proof of ownership for trademarks and brand assets, allowing users to upload logo files, store them on the ireg.cooperanth.sol image registry, and mint minimal on-chain NFT metadata. The platform aims to offer blockchain-verified proof of logo ownership for IP disputes and takedown requests on crypto platforms, complemented by IP education and gamified learning.

## User Preferences

Preferred communication style: Simple, everyday language.

## Payment Policy

**Crypto-Only (DeFi Principles):**
- **NO FIAT PAYMENTS**: Solturio does not accept credit cards, bank transfers, or any fiat currency
- **NO STRIPE**: Stripe integration completely removed - pure decentralized finance
- **Accepted Cryptocurrencies**: SOL, BONK, Arweave, CATH (50% discount when using CATH)
- **Future Consideration**: USDC may be added later for stablecoin payments
- **Wallet Ceremony**: 0.1 SOL (Standard) or 0.15 SOL (Premium) paid directly to platform wallet
- **Philosophy**: Fully decentralized platform aligned with DeFi principles - no third-party payment processors

## Recent Updates (November 2025)

### Complete Onboarding & Wallet System Redesign
- **Two-Tier Wallet Naming**:
  - Standard (0.1 SOL): Auto-assigned number-based `042.solturio.sol`
  - Premium (0.15 SOL): Custom branding `dragoncoin.solturio.sol`
- **Key Handover Ceremony**: 6-stage security ritual ensuring users take full responsibility for wallet security
- **Recovery Service Available**: $100 + identity verification (Replit/GitHub/Google) - wallets hold certificates not financial assets
- **Wallet Restrictions**: xxx.solturio.sol wallets reject SPL tokens, only accept platform-generated certificates/contracts
- **IPFS Upload Control**: Solturio controls all IPFS uploads to prevent hash-copying abuse

### Registration Template System

**Token Launch Template (7 Questions):**
- When will you launch? (timeline)
- Where will you launch? (platform)
- Meme or utility token?
- Total circulating supply
- Tokenomics breakdown
- Supply locked 1+ years?
- Brief summary (max 300 chars)
- Twitter handle for 24-hour ticker verification
- **24-Hour Ticker Verification**: Users must use ticker 2x on social media within 24 hours, submit proof URLs for bot verification

**Artwork Template (10 Questions + Social Media):**
1. Who created this? (self/work-for-hire/team)
2. Is this work for hire? (yes/no) - with payment/contract documentation
3. When was it created? (date)
4. Is this exclusive (1 of 1)? - tracks variations planned
5. Will you sell variations?
6. Will you give away variations?
7. Plan to license? - with license type (limited/revocable/perpetuity) and terms
8. Plan to mint as NFT?
9. Is this a custom PFP? - if yes, collects client's Twitter & Telegram handles
10. How will you use this artwork?
- **Social Media Presence**: Portfolio URL, Twitter, Telegram, Instagram, Discord, other platforms
- **Strict Validation**: Zod superRefine enforces all conditional required fields (work-for-hire details, licensing terms, PFP client handles, variation descriptions)

### Wallet Security & Liability Protection
- Users fund their own wallet (0.1 SOL) for certificate/contract storage
- Thumbnails only stored (not full images) to reduce resource strain
- 12-word recovery phrase revealed ONCE with forced verification (enter 3 random words)
- No screenshots allowed, pen-and-paper backup required
- Multi-stage legal acknowledgment creates ironclad audit trail

### Clear Protection Messaging
- DEX Protection page now clearly shows "Get Protected" call-to-action
- "Report" functionality explicitly labeled as "Report IP Theft" for CAs or individuals using intellectual property without permission
- Distinction between getting protection (registering first) vs reporting theft (when someone steals your IP)

### Landing Page Enhancements  
- Added WIPO-inspired messaging: "IP IS A JOURNEY - BLOCKCHAIN IS YOUR BEST FRIEND"
- New section on IP as daily practice, not one-time activity
- Emphasis on evolving digital assets, employee mobility, partnership protection
- Clear workflow: Register First → Get Gold Check → Use Everywhere → We Handle Takedowns
- Platform support network display showing direct contacts with Twitter/X, DEX platforms, social media

## Recent Updates (October 2025)

### Authorized Usage Tracking
- Users can pre-register where logos will be used (social media, DEXs, websites)
- Creates verifiable record of legitimate usage locations
- Strengthens IP protection claims with documented authorized uses

### DEX Anti-Copycat System  
- Real-time verification API for DEX platforms
- Detects stolen logos by file hash comparison
- Automated DMCA takedown system for copycats
- Pre-registration workflow: Register on Solturio FIRST → Get IPFS/blockchain proof → Use verified URLs on DEXs
- Creates undeniable chain of ownership that predates copycat tokens

### DEX Platform Integration
- Free verification API (<100ms response time)
- Simple 3-line integration for platforms
- Partnership proposal and documentation for DEX outreach
- Target platforms: DexScreener, DexTools, Birdeye, Raydium, Jupiter

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript (Vite).
- **Routing**: Wouter for lightweight client-side routing.
- **State Management**: TanStack Query for server state, React hooks for local state (no global state library).
- **UI Components**: shadcn/ui (built on Radix UI) with Tailwind CSS, prioritizing clarity and professional design.
- **Form Handling**: React Hook Form with Zod validation.
- **Blockchain Integration (Planned)**: Solana wallet adapter for Phantom, Solflare, Backpack.
- **Design Principles**: TypeScript path aliases, component co-location, mobile-first responsive design.

### Backend Architecture
- **Runtime**: Node.js with Express.js (TypeScript, ESM).
- **API Pattern**: RESTful API.
- **Session Management**: express-session with PostgreSQL store, secure HTTP-only cookies.
- **File Processing**: Multer for multipart/form-data, Sharp for image metadata extraction (dimensions, format, color palette, SHA-256 hash) for PNG, JPG, SVG.
- **Metadata Storage**: Platform stores only JSON metadata with ownership claims, timestamps, IP protection info. NO image file storage.
- **Blockchain Integration (Planned)**: Solana web3.js for interactions, Metaplex SDK for NFT minting, payment verification for SOL and $CATH.
- **Architectural Patterns**: Storage abstraction, middleware for logging, custom error handling.

### Database Architecture
- **Database**: PostgreSQL (Neon serverless) using Drizzle ORM.
- **Schema**:
    - `users`: User profiles with Replit Auth, email verification status, Solana wallet (public key + encrypted private key with unique salts), and social handles.
    - `logos`: Logo assets with extracted metadata and image registry references.
    - `collections`: Groups of logos for batch minting.
    - `payments`: Crypto payment tracking (SOL/$CATH).
    - `authorized_usages`: User-registered locations for logo use.
    - `quiz_questions`, `quiz_attempts`, `quiz_stats`: For educational IP quizzes and rewards.
    - `sessions`: Encrypted session storage.
- **Design Decisions**: UUID primary keys, timestamp fields, JSONB for flexible metadata, indexes for session cleanup, string-based amounts for crypto precision.

### Authentication & Authorization
- **Provider**: Replit Auth (OpenID Connect) via Passport.js - NO passwords needed.
- **Method**: Session-based authentication, automatic user provisioning.
- **Wallet Creation Timing**: xxx.solturio.sol wallet created when user registers first artwork/logo (not at login).
- **Wallet Funding**: User pays 0.1 SOL (Standard) or 0.15 SOL (Premium) to fund wallet for certificate/contract storage.
- **Wallet Types**:
  - Standard: Number-based `042.solturio.sol` (account number)
  - Premium: Custom `brandname.solturio.sol` (3-32 alphanumeric chars)
- **Wallet Security**: 
  - BIP39 12-word recovery phrase (Solana-compatible)
  - Private keys encrypted with AES-256-GCM using unique per-wallet salts
  - **Recovery Service**: $100 + identity verification (Replit/GitHub/Google) for certificate wallets
  - Multi-stage Key Handover Ceremony with forced verification
- **Wallet Restrictions**: xxx.solturio.sol wallets programmatically reject/burn SPL tokens - only accept platform certificates/contracts
- **Security**: Secure HTTP-only session cookies, CSRF protection, environment-based session secrets, unique encryption salts per wallet.

### Key Features
1.  **Key Handover Ceremony**: 6-stage security ritual (warnings → payment → pledge → reveal → verification → terms) ensuring user accountability.
2.  **Registration Templates**: Token Launch (comprehensive) vs Artwork (simple) with 5-10 smart legal questions per registration.
3.  **IPFS Control**: Solturio uploads to IPFS (not users) to prevent hash-copying abuse and establish chain of custody.
4.  **Thumbnail Storage**: Platform stores only thumbnails + JSON metadata (not full images) to reduce resource strain.
5.  **24-Hour Ticker Verification**: Users must use ticker 2x on social media, submit URLs for bot verification before smart contract creation.
6.  **IP Protection Tracking**: Pre-filing, pending, or registered status for copyright/trademark/patent with application numbers.
7.  **NFT Minting (Metaplex)**: JSON-only on-chain metadata with ownership claims and timestamps. NFTs minted to Solturio wallet address.
8.  **Authorized Usage Tracking**: Users register official logo usage locations (URLs, platforms) for IP dispute support.
9.  **IP Education Knowledge Base**: Comprehensive guides from USPTO and U.S. Copyright Office.
10. **Gamified Learning (IP Quiz)**: Jeopardy-style quiz game rewarding $CATH tokens for correct answers, citing official sources.

## External Dependencies

-   **User Wallets**: xxx.solturio.sol domains (restricted wallets - certificates/contracts only, NO SPL tokens).
-   **Blockchain**: Solana (Mainnet/Devnet, Metaplex Token Metadata for NFTs, SOL/BONK/Arweave/CATH for payments).
-   **IPFS**: Platform-controlled uploads for abuse prevention and chain of custody proof.
-   **Image Processing**: Sharp (for thumbnail generation, metadata extraction, color analysis, SHA-256 hashing).
-   **UI Framework**: Radix UI (for accessible, unstyled primitives).
-   **Authentication**: Replit Auth (OpenID Connect) - NO passwords.
-   **Database**: PostgreSQL (Neon serverless) - stores thumbnails + JSON metadata only, not full images.