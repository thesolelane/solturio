# LogoGuard - Decentralized NFT Logo Protection Platform

## Overview

LogoGuard is a fully decentralized web application that enables users to protect their intellectual property by minting logos as NFTs on the Solana blockchain. It provides immutable, timestamped proof of ownership for trademarks and brand assets, allowing users to upload logo files, store them on the ireg.cooperanth.sol image registry, and mint minimal on-chain NFT metadata. The platform aims to offer blockchain-verified proof of logo ownership for IP disputes and takedown requests on crypto platforms, complemented by IP education and gamified learning.

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
- **File Upload**: Multer for multipart/form-data, Sharp for image metadata extraction (dimensions, format, color palette, SHA-256 hash) for PNG, JPG, SVG.
- **Image Storage**: Temporary local storage during upload, permanent storage on ireg.cooperanth.sol with a monthly rental model. NFTs only reference the registry ID.
- **Blockchain Integration (Planned)**: Solana web3.js for interactions, Metaplex SDK for NFT minting, payment verification for SOL and $CATH.
- **Architectural Patterns**: Storage abstraction, middleware for logging, custom error handling.

### Database Architecture
- **Database**: PostgreSQL (Neon serverless) using Drizzle ORM.
- **Schema**:
    - `users`: User profiles with Replit Auth and Solana wallet addresses.
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
- **Wallet Linking (Planned)**: Solana wallet address linking with signature verification.
- **Security**: Secure HTTP-only session cookies, CSRF protection, environment-based session secrets.

### Key Features
1.  **Logo Upload & Metadata Extraction**: Drag-and-drop upload with automatic extraction of dimensions, format, size, dominant/full color palette, SHA-256 hash, and custom description.
2.  **Image Registry Integration**: Upload to ireg.cooperanth.sol with a monthly rental fee model, tracking, and renewal reminders.
3.  **NFT Minting (Metaplex)**: Minimal on-chain metadata (owner, registryId, timestamp, hash) for cost efficiency; full specs stored off-chain in the database.
4.  **Authorized Usage Tracking**: Users register official logo usage locations (URLs, platforms) for IP dispute support.
5.  **IP Education Knowledge Base**: Comprehensive guides from USPTO and U.S. Copyright Office.
6.  **Gamified Learning (IP Quiz)**: Jeopardy-style quiz game rewarding $CATH tokens for correct answers, citing official sources.

## External Dependencies

-   **Image Registry**: ireg.cooperanth.sol (for permanent decentralized image storage, monthly rental fee model).
-   **Blockchain**: Solana (Mainnet/Devnet, Metaplex Token Metadata for NFTs, SOL and $CATH for payments).
-   **Image Processing**: Sharp (for server-side image optimization, metadata extraction, color analysis, SHA-256 hashing).
-   **UI Framework**: Radix UI (for accessible, unstyled primitives).
-   **Authentication**: Replit Auth (OpenID Connect).
-   **Database**: PostgreSQL (Neon serverless).