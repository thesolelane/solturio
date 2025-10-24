# LogoGuard - Decentralized NFT Logo Protection Platform

## Overview

LogoGuard is a fully decentralized web application that enables users to protect their intellectual property by minting logos as NFTs on the Solana blockchain. The platform provides immutable, timestamped proof of ownership for trademarks and brand assets. Users upload logo files (auto-extracting technical metadata), store images on the ireg.cooperanth.sol image registry, pay monthly rental fees in SOL or $CATH tokens, and mint minimal on-chain NFT metadata pointing to their registry assets.

**Key Value Proposition**: Blockchain-verified proof of logo ownership for IP disputes and takedown requests on crypto platforms like DEXScreener, combined with comprehensive IP education and gamified learning.

**Important Legal Disclaimer**: LogoGuard is NOT a law firm and does not provide legal advice. We provide technology tools to create blockchain-based proof of logo ownership. Recording logos on blockchain does NOT constitute legal trademark or copyright registration. For enforceable legal protection, users must register with USPTO and/or U.S. Copyright Office. We strongly recommend consulting with a qualified IP attorney.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript using Vite as the build tool

**Routing**: Wouter - A lightweight client-side router chosen for simplicity over React Router

**State Management**: 
- TanStack Query (React Query) for server state management and API caching
- React hooks for local component state
- No global state management library (Redux/Zustand) - keeps complexity minimal

**UI Component Library**: shadcn/ui components built on Radix UI primitives
- Provides accessible, customizable components following the Fluent Design System
- Tailwind CSS for styling with a custom design token system
- Design philosophy prioritizes clarity, professional credibility, and efficient workflows for enterprise IP protection

**Form Handling**: React Hook Form with Zod validation via @hookform/resolvers

**Planned Blockchain Integration**:
- Solana wallet adapter (@solana/wallet-adapter-react, @solana/wallet-adapter-react-ui)
- Support for Phantom, Solflare, and Backpack wallets
- Client-side wallet connection for decentralized architecture
- Real-time SOL and $CATH balance display

**Key Design Decisions**:
- TypeScript path aliases (`@/`, `@shared/`, `@assets/`) for clean imports
- Component co-location strategy - pages import UI components as needed
- Mobile-first responsive design with breakpoint utilities

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Language**: TypeScript with ESM modules

**API Pattern**: RESTful API with conventional `/api` prefix routes

**Session Management**: 
- express-session with PostgreSQL session store (connect-pg-simple)
- Secure, HTTP-only cookies for session tokens
- 7-day session TTL

**File Upload Handling**:
- Multer middleware for multipart/form-data processing
- In-memory storage with 10MB file size limits
- Sharp library for image metadata extraction and processing
- Supported formats: PNG, JPG, SVG
- Automatic color palette extraction and dominant color detection
- SHA-256 file hashing for verification

**Image Storage Strategy**:
- **Local temporary storage**: Files temporarily stored during upload for metadata extraction
- **Image registry (ireg.cooperanth.sol)**: Permanent storage on Cooperanth's image registry
- **Monthly rental model**: Users pay rental fees in SOL or $CATH to maintain registry storage
- **On-chain reference only**: NFTs contain minimal data - just wallet owner and registry ID

**Blockchain Integration** (Planned):
- Solana web3.js for blockchain interactions
- Metaplex SDK for NFT minting
- Payment verification via on-chain transaction signatures
- Support for SOL and $CATH (SPL token) payments

**Key Architectural Patterns**:
- Storage abstraction layer (`server/storage.ts`) separates business logic from database operations
- Middleware-based request logging with response time tracking
- Error handling with custom 401 detection for authentication flows

### Database Architecture

**Database**: PostgreSQL (Neon serverless)

**ORM**: Drizzle ORM with type-safe schema definitions

**Schema Design**:
- `users` - User profiles with Replit Auth integration and Solana wallet addresses
- `logos` - Logo assets with auto-extracted metadata (dimensions, format, color palette, file hash) + image registry references
- `collections` - Groups of logos for batch minting with blockchain transaction data
- `payments` - Crypto payment tracking (SOL/$CATH) with transaction signatures and blockchain confirmation
- `authorized_usages` - User-registered locations where logos are used (URLs, platforms) for tracking authorized use
- `quiz_questions` - Educational IP quiz questions with official government source citations
- `quiz_attempts` - User quiz attempt history with $CATH rewards tracking
- `quiz_stats` - User quiz statistics and leaderboard data
- `sessions` - Encrypted session storage for authentication

**Database Connection Strategy**:
- WebSocket-based connection pooling via @neondatabase/serverless
- Connection string from environment variables
- Schema updates via Drizzle migrations

**Key Design Decisions**:
- UUID primary keys for distributed system compatibility
- Timestamp fields (createdAt, updatedAt) for audit trails
- JSONB fields for flexible metadata storage (color palettes, blockchain data)
- Indexes on session expiration for efficient cleanup
- String-based amount fields for crypto decimal precision

### Authentication & Authorization

**Provider**: Replit Auth (OpenID Connect)

**Implementation**:
- Passport.js strategy with openid-client
- Automatic user provisioning on first login (upsert pattern)
- Session-based authentication (no JWT tokens)
- Protected routes check authentication via `isAuthenticated` middleware
- Unauthorized requests redirect to `/api/login` with automatic OIDC flow

**Wallet Linking** (Planned):
- Users link Solana wallet address to their account
- Wallet signature verification for ownership proof
- One wallet per user account

**Security Measures**:
- Secure session cookies with httpOnly flag
- CSRF protection via session-based authentication
- Environment-based session secrets

### External Dependencies & Services

**Image Registry**: ireg.cooperanth.sol
- Permanent decentralized image storage
- Monthly rental fee model (SOL/$CATH payments)
- API integration for upload, retrieval, and rental management
- *Pending: API endpoint, authentication details, and fee structure from Cooperanth*

**Blockchain**: Solana
- **Mainnet/Devnet**: *To be determined based on deployment strategy*
- **NFT Standard**: Metaplex Token Metadata
- **Minimal on-chain data**: JSON metadata contains only wallet owner, image registry ID, timestamp, and file hash
- **Payment tokens**: Native SOL + $CATH (SPL token)
- *Pending: Solana RPC endpoint, $CATH token mint address, receiving wallet addresses*

**Payment Processing**: Fully Decentralized
- ~~Stripe~~ Removed - replaced with on-chain SOL/$CATH payments
- On-chain transaction verification
- No centralized payment gateway
- Two payment types:
  - **Minting fees**: One-time fee to mint NFT collection
  - **Rental fees**: Monthly payments to maintain image registry storage

**Image Processing**: Sharp
- Server-side image optimization and metadata extraction
- Color palette analysis for logo assets
- File hashing (SHA-256) for integrity verification

**Educational Gamification**:
- Jeopardy-style IP quiz game
- $CATH token rewards for correct answers
- Questions sourced directly from USPTO and U.S. Copyright Office official publications
- Categories: IP Symbols, Trademark Basics, Copyright Law, Trademark Classes
- *Pending: $CATH reward amounts per question, smart contract for token distribution*

**Development Tools**:
- Replit-specific plugins for dev environment (@replit/vite-plugin-runtime-error-modal, cartographer, dev-banner)
- Only active in development mode (NODE_ENV check)

**UI Framework**: Radix UI
- Comprehensive set of accessible, unstyled primitives
- Full component coverage: dialogs, dropdowns, tooltips, forms, navigation, tabs
- Chosen for accessibility compliance and professional UX requirements

**Hosting Considerations**:
- Environment variable dependencies: DATABASE_URL, SESSION_SECRET, REPL_ID, ISSUER_URL
- *Future needs*: SOLANA_RPC_URL, CATH_TOKEN_MINT, TREASURY_WALLET, IMAGE_REGISTRY_API_KEY
- Static asset serving via Vite in development, Express in production
- Build output to `dist/public` for frontend, `dist/` for backend bundle

## Key Features

### 1. Logo Upload & Metadata Extraction
- Drag-and-drop file upload
- Automatic extraction of technical specifications:
  - Image dimensions (width × height in pixels)
  - File format (PNG, JPG, SVG)
  - File size in bytes
  - Dominant color and full color palette (hex codes)
  - SHA-256 file hash for verification
- User-provided custom 200-character description
- Organized into collections for batch minting

### 2. Image Registry Integration
- Upload to ireg.cooperanth.sol for permanent decentralized storage
- Monthly rental fee system (pay-as-you-go model)
- Automatic rental payment tracking and renewal reminders
- Registry ID and URL stored in database

### 3. NFT Minting (Metaplex)
- Minimal on-chain metadata strategy to save storage costs
- JSON metadata format:
  ```json
  {
    "owner": "wallet_address",
    "registryId": "image_registry_id",
    "timestamp": "creation_timestamp",
    "hash": "sha256_file_hash"
  }
  ```
- Full specifications (dimensions, colors, description) stored off-chain in database
- Blockchain provides immutable proof of ownership timestamp

### 4. Authorized Usage Tracking
- Users register where their logos are officially used (URLs, platforms)
- Track usage types: website, social media, print, merchandise, DEXScreener, etc.
- Future: Automated scanning for unauthorized usage detection
- Helps with takedown requests and IP disputes

### 5. IP Education Knowledge Base
- Comprehensive guides using exact official information from:
  - USPTO (United States Patent and Trademark Office)
  - U.S. Copyright Office
- Topics covered:
  - Trademark symbols (™, ®, ℠) - when and how to use each
  - Copyright symbol (©) - format and requirements
  - Trademark vs. Copyright differences
  - Nice Classification system (45 trademark classes)
  - Filing procedures and costs (2025 fee schedules)
  - Protection strategies and legal disclaimer

### 6. Gamified Learning (IP Quiz)
- Jeopardy-style quiz game with categories and point values
- Earn $CATH tokens for correct answers
- 13+ questions across multiple categories with difficulty levels
- All questions cite official government sources
- Real-time leaderboard and streak tracking
- Educational explanations for each answer

## Current Implementation Status

### ✅ Fully Implemented
- Replit Auth integration (Google, GitHub, email/password)
- PostgreSQL database with complete decentralized schema
- Logo upload with automatic metadata extraction (Sharp)
- File hash generation (SHA-256)
- Image registry schema (awaiting API integration)
- Payment schema for crypto transactions
- Authorized usage tracking schema
- Quiz database with 13 seeded questions from official sources
- Knowledge base pages with official USPTO/Copyright.gov content
- Landing page, dashboard, upload interface
- Collections management

### 🔄 Partially Implemented
- Payment processing (schema ready, awaiting SOL/$CATH integration)
- NFT minting (schema ready, awaiting Metaplex integration)

### ⏳ Pending External Dependencies
- **ireg.cooperanth.sol integration**: Awaiting API documentation
  - Upload endpoint and authentication
  - Monthly rental fee structure
  - Query and management endpoints
- **Solana wallet adapter**: Ready to install once RPC endpoint is provided
- **$CATH token integration**: Awaiting token mint address and decimals
- **Metaplex NFT minting**: Awaiting Solana RPC and wallet strategy decision
- **Quiz reward distribution**: Awaiting smart contract for $CATH payments
- **SOL/$CATH payment verification**: Awaiting blockchain integration

## Recent Architecture Changes (October 2025)

### From Centralized to Fully Decentralized
- **Removed**: All Stripe integration and payment intent flows
- **Added**: SOL and $CATH cryptocurrency payment support
- **Changed**: Image storage from local files to ireg.cooperanth.sol registry
- **Added**: Monthly rental fee tracking and payment model
- **Added**: Authorized usage tracking for IP protection claims
- **Added**: Educational quiz game with $CATH rewards
- **Added**: Comprehensive IP knowledge base with official government sources

### Schema Updates
- Users: `stripeCustomerId` → `walletAddress`
- Logos: Added `imageRegistryId`, `imageRegistryUrl`, `fileHash`, `rentalPaidUntil`
- Payments: Replaced Stripe fields with `transactionSignature`, `tokenType` (SOL/CATH), `blockNumber`
- New tables: `authorized_usages`, `quiz_questions`, `quiz_attempts`, `quiz_stats`

## Next Steps for Full Deployment

1. Receive ireg.cooperanth.sol API documentation from Cooperanth LLC
2. Receive $CATH token details (mint address, decimals, treasury wallet)
3. Decide on Solana network (mainnet-beta vs devnet) and RPC provider
4. Install Solana wallet adapter dependencies
5. Implement wallet connection UI (Phantom/Solflare/Backpack support)
6. Integrate image registry upload and rental payment flow
7. Implement Metaplex NFT minting with minimal on-chain metadata
8. Build quiz game frontend with $CATH reward distribution
9. Add SOL/$CATH payment verification and balance checking
10. Deploy smart contract for quiz rewards (or use direct transfers)
11. Test complete flow: upload → registry → pay rental → mint NFT → earn $CATH from quiz
