# Solturio - Decentralized Logo IP Protection Platform

**Plant Your Standard on Chain** - Blockchain-powered intellectual property protection for the digital age.

A **CATH Ecosystem** project by Cooperanth Consulting LLC.

## Overview

Solturio is a decentralized web application that enables creators, brands, and projects to protect their intellectual property by registering logos on the blockchain BEFORE public use. By establishing timestamped proof of ownership on Solana, Solturio creates an immutable chain of custody that protects against copycats, especially in the DeFi/DEX ecosystem where logo theft is rampant.

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon serverless recommended)
- Pinata account for IPFS storage
- Solana RPC endpoint (devnet for testing, mainnet for production)

### Environment Variables

Required secrets (add to Replit Secrets or `.env`):

```
DATABASE_URL=your_postgres_connection_string
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
PINATA_JWT=your_pinata_jwt
SESSION_SECRET=random_secure_string
WALLET_ENCRYPTION_KEY=32_char_encryption_key
```

Optional:
```
TELEGRAM_BOT_TOKEN=for_quiz_bot
SENDGRID_API_KEY=for_email_notifications
SC_API_URL=smart_contract_api_url
SC_API_SECRET=smart_contract_api_secret
```

### Installation

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

## How to Use

### 1. Sign In
Click "Sign In" to authenticate using Replit Auth.

### 2. Create a Wallet
Navigate to your Account page and create your `.solturio.sol` wallet:
- **Standard wallet** (e.g., `042.solturio.sol`) - 0.1 SOL
- **Premium wallet** (e.g., `yourname.solturio.sol`) - 0.15 SOL

### 3. Upload Logos
Go to the Upload page to add your logos:
- Drag & drop image files or click to browse
- Add URL links to existing images
- Provide descriptions for each asset
- Images are automatically processed and thumbnails generated

### 4. Create Collections
Group related logos into collections:
- Give your collection a name and description
- Add company/brand information
- Set copyright year

### 5. Mint Your Collection
Click "Mint Collection" to:
- Generate verified images with gold check badge overlay
- Upload metadata to IPFS
- Create NFT certificate on Solana blockchain
- Get permanent proof of ownership

### 6. View Your Collections
All minted collections appear with:
- Collapsible cards for easy navigation
- NFT certificate addresses
- IPFS metadata links
- Verified image previews with badges

## Key Features

### Pre-Registration Workflow
- **Register First, Use Everywhere** - Upload logos before launching tokens or going public
- **IPFS Permanent Storage** - Decentralized, immutable storage that can't be taken down
- **Blockchain Timestamps** - Solana-based proof that predates any copycat attempts
- **Gold Verification System** - Verified logos display gold check badges

### DEX Anti-Copycat Protection
- **Real-time Verification API** - DEX platforms can verify logo legitimacy in <100ms
- **Automatic Copycat Detection** - File hash comparison identifies stolen logos instantly
- **DMCA Automation** - One-click takedown notices with blockchain evidence

### Authorized Usage Tracking
- **Pre-register Official Locations** - Document where logos will legitimately appear
- **Platform-specific Tracking** - Monitor usage across websites, social media, and DEXs
- **Verification Records** - Create evidence trail for IP disputes

### Legal Documentation
- **Prior Art Certificates** - Blockchain-verified proof of first use
- **DMCA Notices** - Auto-generated with QR codes linking to blockchain proof
- **Cease & Desist Letters** - Professional legal documents with evidence packages

### IP Education Quiz
- **Telegram Bot** - Daily quizzes on intellectual property topics
- **Game Points & Experience** - Competitive scoring system
- **Leaderboards** - Track your progress against others

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Neon serverless), Drizzle ORM
- **Blockchain**: Solana, Metaplex SDK
- **Storage**: IPFS (via Pinata), user-controlled .solturio.sol wallets
- **Authentication**: Replit Auth (OpenID Connect)
- **Bot**: Telegraf for Telegram quiz bot

## Target Users

- **Token Creators** - Protect logos/tickers before token launch
- **NFT Collections** - Establish provenance for artwork and branding
- **DEX Platforms** - Integrate verification to protect users from scams
- **Brand Owners** - Document IP ownership with blockchain proof
- **Artists & Designers** - Register artwork with timestamped proof

## Payment

Solturio is a CATH Ecosystem project running on $CATH:
- **IP Registration**: 100 $CATH tokens
- **Standard Wallet**: 0.1 SOL
- **Premium Wallet**: 0.15 SOL

No fiat payments - crypto only (SOL, BONK, Arweave, $CATH).

## Security

- **Encrypted Wallets** - Private keys secured with AES-256-GCM
- **Session Security** - HTTP-only cookies, CSRF protection
- **Wallet Restrictions** - .solturio.sol wallets only hold certificates and SOL for fees
- **Key Handover Ceremony** - Multi-stage secure key delivery process

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities
├── server/                 # Express backend
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Database operations
│   └── services/           # Business logic
├── shared/                 # Shared types & schemas
│   └── schema.ts           # Drizzle database schema
└── attached_assets/        # Static assets & uploads
```

## License

Proprietary - Copyright © 2025 Cooperanth Consulting LLC. All rights reserved.

---

**Solturio** - Because in crypto, being first isn't enough. You need proof.
