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

## External Dependencies

-   **User Wallets**: `xxx.solturio.sol` domains (restricted to certificates/contracts).
-   **Blockchain**: Solana (Mainnet/Devnet, Metaplex Token Metadata, Solana web3.js).
-   **Cryptocurrencies**: SOL, BONK, Arweave, CATH (for payments).
-   **IPFS**: Platform-controlled uploads.
-   **Image Processing**: Sharp.
-   **UI Framework**: Radix UI.
-   **Authentication**: Replit Auth (OpenID Connect).
-   **Database**: PostgreSQL (Neon serverless).
-   **Telegram**: Telegraf bot framework, node-cron.