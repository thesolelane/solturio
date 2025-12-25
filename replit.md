# Solturio - Decentralized NFT Logo Protection Platform

## Overview
Solturio is a fully decentralized web application within the CATH Ecosystem that safeguards intellectual property by minting logos as NFTs on the Solana blockchain. It provides immutable, timestamped proof of ownership for trademarks and brand assets. Users can upload logos, store them on a dedicated image registry, and mint minimal on-chain NFT metadata. The platform aims to offer blockchain-verified proof of logo ownership for IP disputes and takedown requests on crypto platforms, complemented by IP education and gamified learning, viewing IP protection as a continuous journey.

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
- **Wallet Creation**: `xxx.solturio.sol` wallet created upon first artwork/logo registration, funded by the user.
- **Wallet Types**: Number-based (`042.solturio.sol`) or custom branded (`brandname.solturio.sol`).
- **Wallet Security**: BIP39 12-word recovery phrase, private keys encrypted with AES-256-GCM, multi-stage Key Handover Ceremony, recovery service available.
- **Wallet Restrictions**: `xxx.solturio.sol` wallets programmatically reject SPL tokens, accepting only platform-generated certificates/contracts.
- **Security**: Secure HTTP-only session cookies, CSRF protection, environment-based session secrets, unique encryption salts per wallet.

### Key Features
- **Payment Policy**: Crypto-only payments (SOL, BONK, Arweave, $CATH as primary).
- **Onboarding & Wallet System**: Two-tier wallet naming, 6-stage key handover ceremony, IPFS upload control by Solturio.
- **Registration Templates**: Multi-step wizard flows with conditional fields and robust validation.
- **DEX Anti-Copycat System**: Real-time verification API for DEX platforms, detecting stolen logos by file hash, automated DMCA takedown.
- **IP Education Quiz Bot (Telegram)**: Automated quizzes with dual scoring system (Game Points and Experience Points) with separate leaderboards. Resilient initialization with exponential backoff retries.
- **NFT Minting**: JSON-only on-chain metadata via Metaplex SDK.
- **Authorized Usage Tracking**: Users pre-register where logos will be used to strengthen IP protection claims.
- **Payment Model**: Subscription-based (annual, paid in $CATH) with a tiered token registry for accepted cryptocurrencies.
- **Rewards System**: $SOLT token rewards for platform engagement and social actions.
- **Visitor Accounts**: Email-only signup for quiz access. Rewards expire 30 days from last activity but extend on any interaction. Pending rewards transfer to full account on upgrade.

### Health Monitoring
- **Endpoint**: `GET /api/health` returns status of all services.
- **Services Monitored**: database, telegram, arweave, pinata, sendgrid.
- **Telegram Status**: `online`, `offline`, `not_configured`, `initializing`.
- **Graceful Degradation**: Platform continues running if Telegram is down; only quiz bot feature is temporarily unavailable.

### Data Storage Architecture
- **Four-Tier Decentralized Storage**:
    1. **PostgreSQL**: User info, thumbnails, metadata, ownership claims.
    2. **IPFS (Pinata)**: Metadata JSON with file hashes.
    3. **Arweave**: Verified badge images for sharing.
    4. **Solana Blockchain**: NFT certificates with immutable hashes.
- **Gold Check Badge**: Visual indicator for verified/minted images, overlaid on images, and uploaded to IPFS.

### SC Integration Architecture
- **Communication Pattern**: Frontend → App API → SC Client → SC Replit API → Solana.
- **Security**: HMAC-SHA256 signed requests, circuit breaker pattern, exponential backoff for retries.
- **GitHub Proxy Endpoints**: A set of endpoints for linking wallets, GitHub OAuth, registering code, and handling webhooks.
- **Dual-Signature Transaction Flow**: Platform backend signs partially, then frontend wallet co-signs and submits.

## External Dependencies
-   **User Wallets**: `.sol` domains (e.g., `xxx.solturio.sol`).
-   **Blockchain**: Solana (Metaplex Token Metadata, Solana web3.js).
-   **Cryptocurrencies**: SOL, BONK, Arweave, CATH.
-   **IPFS**: Pinata.
-   **Image Processing**: Sharp.
-   **UI Framework**: Radix UI.
-   **Authentication**: Replit Auth (OpenID Connect).
-   **Database**: PostgreSQL (Neon serverless).
-   **Telegram**: Telegraf bot framework.
-   **Price Oracle**: Jupiter API.
-   **Token Distribution**: Streamflow.