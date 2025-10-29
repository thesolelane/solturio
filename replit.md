# Centurio - Decentralized NFT Logo Protection Platform

## Overview

Centurio is a fully decentralized web application that enables users to protect their intellectual property by minting logos as NFTs on the Solana blockchain. It provides immutable, timestamped proof of ownership for trademarks and brand assets, allowing users to upload logo files, store them on the ireg.cooperanth.sol image registry, and mint minimal on-chain NFT metadata. The platform aims to offer blockchain-verified proof of logo ownership for IP disputes and takedown requests on crypto platforms, complemented by IP education and gamified learning.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Provider**: Replit Auth (OpenID Connect) via Passport.js.
- **Method**: Session-based authentication, automatic user provisioning.
- **Email Verification**: Required before wallet generation and payments (similar to 2FA).
- **Centurio Wallet**: Auto-generated Solana wallet for each user (created after email verification).
- **Wallet Security**: Private keys encrypted with AES-256-GCM using unique per-wallet salts, stored in database, exportable for Phantom import.
- **Wallet Export**: Users can export private key to import into Phantom wallet for full control of NFTs.
- **Security**: Secure HTTP-only session cookies, CSRF protection, environment-based session secrets, unique encryption salts per wallet.

### Key Features
1.  **Email Verification Flow**: Users must verify email before accessing wallet features (security requirement).
2.  **Centurio Wallet Generation**: Auto-generated Solana wallet created after email verification, with secure private key encryption.
3.  **Phantom Import**: Users can export private key in Phantom-compatible format to import wallet into Phantom for full NFT control.
4.  **Logo Metadata Registration**: Platform stores only JSON metadata - ownership claims, timestamps, complete descriptions, intended use, and IP protection data.
5.  **User Wallet Storage**: Actual image files stored in user's personal XXXXXXX.centurio.sol wallet (not on platform).
6.  **IP Protection Tracking**: Pre-filing, pending, or registered status for copyright/trademark/patent with application numbers.
7.  **NFT Minting (Metaplex)**: JSON-only on-chain metadata with ownership claims and timestamps. NFTs minted to Centurio wallet address.
8.  **Authorized Usage Tracking**: Users register official logo usage locations (URLs, platforms) for IP dispute support.
9.  **IP Education Knowledge Base**: Comprehensive guides from USPTO and U.S. Copyright Office.
10. **Gamified Learning (IP Quiz)**: Jeopardy-style quiz game rewarding $CATH tokens for correct answers, citing official sources.

## External Dependencies

-   **User Wallets**: XXXXXXX.centurio.sol domains (for user-controlled image storage).
-   **Blockchain**: Solana (Mainnet/Devnet, Metaplex Token Metadata for NFTs, SOL and $CATH for payments).
-   **Image Processing**: Sharp (for metadata extraction, color analysis, SHA-256 hashing - no storage).
-   **UI Framework**: Radix UI (for accessible, unstyled primitives).
-   **Authentication**: Replit Auth (OpenID Connect).
-   **Database**: PostgreSQL (Neon serverless) - stores only JSON metadata, not images.