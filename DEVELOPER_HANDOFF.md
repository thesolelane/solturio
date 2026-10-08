# Solturio — Developer Handoff

## What It Is

Solturio is a decentralized intellectual property (IP) protection platform built on the Solana blockchain. Users register logos, music, and code as NFTs to establish immutable, timestamped proof of ownership. The platform also provides IP licensing (ISCL contracts), DEX anti-copycat protection, and a Telegram-based IP quiz game with token rewards.

---

## Three-Layer Architecture

| Layer | Domain | Role |
|---|---|---|
| App | solturio.app | Authentication, wallet management, API endpoints |
| Chain | solturio.sol | On-chain smart contracts, NFT minting, ISCL deployment |
| Public | solturio.com | Third-party verification, badge validation, public API |

No single layer controls the system — decentralization by design.

---

## Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript (Vite)
- **Routing:** Wouter
- **State / Data fetching:** TanStack Query v5
- **UI components:** shadcn/ui (Radix UI) + Tailwind CSS
- **Forms:** React Hook Form + Zod validation
- **Icons:** lucide-react, react-icons/si

### Backend
- **Runtime:** Node.js with Express (TypeScript, ESM)
- **API style:** RESTful
- **Session management:** express-session with PostgreSQL session store, HTTP-only cookies
- **File processing:** Multer (multipart uploads), Sharp (image metadata + SHA-256 hashing)
- **Storage pattern:** Full abstraction layer (`server/storage.ts`) — all DB access goes through this interface

### Database
- **Engine:** PostgreSQL (currently Neon serverless, planned migration to Supabase)
- **ORM:** Drizzle ORM
- **Schema location:** `shared/schema.ts` — single source of truth for all tables, types, and Zod validators
- **Schema sync:** `npm run db:push` (Drizzle Kit push — no migration files)

> **Note for production:** Switch from `db:push` to `drizzle-kit generate` + `drizzle-kit migrate` before going live with real user data. This creates versioned, reviewable migration files with rollback capability.

### Authentication
- **Provider:** Replit Auth (OpenID Connect) via Passport.js
- **Session-based** — secure HTTP-only cookies
- **Wallet creation:** `xxx.solturio.sol` wallet created on first IP registration, funded by the user
- **Admin whitelist:** email-based (`server/admin-middleware.ts`)

---

## Database — All 33 Tables

### Identity & Auth
| Table | Purpose |
|---|---|
| `sessions` | Express session store |
| `users` | Registered platform users (Replit Auth) |
| `visitorAccounts` | Email-only visitor accounts for quiz access |
| `kycStatus` | KYC verification state per user |

### IP Registry
| Table | Purpose |
|---|---|
| `logos` | Registered logo/artwork assets with metadata, file hash, IPFS/Arweave references |
| `collections` | Groups of logos under a brand/company |
| `ipAssets` | Generic IP asset records (broader than logos) |
| `authorizedUsages` | Pre-registered locations where a logo is used (strengthens IP claims) |
| `variationProtections` | Protected logo variations |
| `contractBindings` | DEX contract → logo bindings for gold verification |

### Creative Content
| Table | Purpose |
|---|---|
| `musicCollections` | Music IP collections |
| `tracks` | Individual music tracks |
| `releases` | Music releases/albums |
| `releaseTracks` | Join table: releases ↔ tracks |
| `codeRepoSnapshots` | Registered code repository snapshots |

### Licensing
| Table | Purpose |
|---|---|
| `licenseContracts` | ISCL (Independent Smart Contract License) agreements |

### DEX / Copycat Protection
| Table | Purpose |
|---|---|
| `copycatReports` | Reports of stolen/copycat logos on DEX platforms |
| `outreachLetters` | Generated DMCA/takedown letters |

### Payments & Rewards
| Table | Purpose |
|---|---|
| `payments` | All platform payment records |
| `usedTransactions` | Prevents transaction replay attacks |
| `treasuryWallets` | Platform treasury wallet addresses |
| `acceptedTokens` | Registry of tokens accepted for payment (SOL, CATH, BONK, etc.) |
| `tokenApplications` | Token launch applications |
| `rewardsLog` | $SOLT token rewards ledger |
| `referralTracking` | Referral program records |

### Quiz / Education
| Table | Purpose |
|---|---|
| `quizQuestions` | IP education quiz question bank |
| `quizAttempts` | Per-user quiz answer records |
| `quizStats` | Aggregated leaderboard stats per user |
| `telegramLeaderboard` | Telegram-specific leaderboard (non-registered users) |

### Compliance
| Table | Purpose |
|---|---|
| `organizations` | Partner/client organization records |
| `complianceLogs` | Audit trail for compliance events |
| `complianceTriggerRules` | Configurable rules that fire compliance events |
| `complianceCases` | Active compliance investigation cases |

### Admin / Config
| Table | Purpose |
|---|---|
| `adminSecrets` | AES-256-CBC encrypted secrets vault (admin-only) |
| `platformConfig` | Platform-wide configuration key/value store |

---

## External Services

| Service | Purpose | Notes |
|---|---|---|
| **Solana** | NFT minting, smart contracts | Metaplex Token Metadata, web3.js |
| **IPFS (Pinata)** | Metadata JSON storage | API key + JWT required |
| **Arweave** | Permanent badge image storage | Wallet key required |
| **Telegram** | IP quiz bot | Telegraf framework, bot token required |
| **SendGrid** | Transactional email | API key required |
| **Jupiter API** | SOL/token price oracle | No key required (public) |
| **Streamflow** | $SOLT token distribution | |
| **USPTO ODP API** | Trademark search (Trademark Assistant feature) | API key optional — falls back to mock data |

---

## Environment Variables

All secrets are managed via environment variables. None are committed to the repo.

### Required
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session signing secret (long random string) |
| `SECRETS_ENCRYPTION_KEY` | 64-char hex (32 bytes) — AES-256 key for admin secrets vault |
| `WALLET_ENCRYPTION_KEY` | AES-256 key for encrypting user wallet private keys |
| `MUSIC_MASTER_KEK` | Key encryption key for music IP assets |

### Blockchain / Wallets
| Variable | Description |
|---|---|
| `SOLANA_RPC_URL` | Solana RPC endpoint |
| `SOLANA_CLUSTER` | `mainnet-beta` or `devnet` |
| `SOLTURIO_NFT_PROGRAM_ID` | Deployed NFT program address |
| `SOLT_MINT_ADDRESS` | $SOLT token mint address |
| `PLATFORM_SOL_WALLET` | Platform SOL receiving wallet |
| `PLATFORM_CATH_WALLET` | Platform $CATH receiving wallet |
| `PLATFORM_BONK_WALLET` | Platform BONK receiving wallet |
| `PLATFORM_REVENUE_WALLET` | Platform revenue wallet |
| `TREASURY_SOL_WALLET` | Treasury SOL wallet |
| `TREASURY_CATH_ACCOUNT` | Treasury $CATH account |
| `SOLTURIO_LAUNCH_DATE` | ISO date string — used for gold verification timing |

### Storage
| Variable | Description |
|---|---|
| `PINATA_JWT` | Pinata IPFS JWT (preferred) |
| `PINATA_API_KEY` | Pinata API key |
| `PINATA_SECRET_KEY` | Pinata secret key |
| `PINATA_GATEWAY` | Custom Pinata gateway URL |
| `ARWEAVE_WALLET_KEY` | Arweave wallet JSON (stringified) |

### External Services
| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_QUIZ_CHAT_ID` | Telegram chat/group ID for quiz sessions |
| `SENDGRID_API_KEY` | SendGrid email API key |
| `NOREPLY_EMAIL` | From address for outbound email |
| `SUPPORT_EMAIL` | Support email address |
| `USPTO_ODP_API_KEY` | USPTO trademark search API key (optional) |

### Smart Contract Integration
| Variable | Description |
|---|---|
| `SC_API_URL` | Smart contract service URL |
| `SC_API_SECRET` | HMAC secret for signing SC requests |

### Replit / Runtime
| Variable | Description |
|---|---|
| `REPL_ID` | Auto-set by Replit |
| `REPLIT_DOMAINS` | Auto-set by Replit |
| `ISSUER_URL` | OpenID Connect issuer (Replit Auth) |
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port (default 5000) |

### Feature Flags
| Variable | Description |
|---|---|
| `STUB_LICENSED` | Set to `true` to stub out license payment verification in dev |

---

## Key File Locations

```
shared/
  schema.ts              — All DB tables, types, Zod schemas (single source of truth)

server/
  index.ts               — App entry point, middleware setup
  routes.ts              — Route mounting (647 lines — imports domain routers)
  storage.ts             — DB abstraction layer (all DB access goes through here)
  admin-middleware.ts     — isAdmin() guard
  admin-routes.ts        — /api/admin/* routes
  logo-routes.ts         — /api/logos/* routes
  license-routes.ts      — /api/license-contracts/* routes
  licenses.ts            — License payment processing
  trademark-routes.ts    — /api/trademark/* routes (USPTO integration)
  dex-verification.ts    — DEX logo verification logic
  contract-verification.ts — Smart contract binding/gold verification
  quiz-routes.ts         — /api/quiz/* routes
  telegram-bot.ts        — Telegram quiz bot
  security-ceremony.ts   — Wallet key handover ceremony
  encryption.ts          — AES-256-CBC encrypt/decrypt for secrets vault
  services/
    ipfs.ts              — Pinata/IPFS upload service
    arweave.ts           — Arweave upload service

client/src/
  App.tsx                — Route definitions
  components/
    app-sidebar.tsx      — Main navigation sidebar
    ui/                  — shadcn/ui base components
  pages/                 — One file per page/route
  hooks/
    useAuth.ts           — Auth state hook
  lib/
    queryClient.ts       — TanStack Query client + apiRequest helper
```

---

## Running Locally

```bash
npm install
npm run db:push      # sync schema to database
npm run dev          # starts Express + Vite on port 5000
```

The Vite dev server and Express backend run on the same port (5000). Vite proxies API requests to Express automatically — do not add a separate proxy configuration.

---

## API Patterns

- All API routes are prefixed `/api/`
- Authentication state: `req.user.claims.sub` = user ID (Replit Auth pattern)
- CSRF protection on all state-changing requests (except extension JWT routes)
- Browser extension routes use JWT Bearer auth instead of session cookies
- `apiRequest(method, url, data?)` is the standard frontend fetch helper (see `client/src/lib/queryClient.ts`)

---

## Pricing (On-chain)

| Item | Price |
|---|---|
| Platform subscription (promo) | 0.14 SOL |
| Platform subscription (standard) | 0.5 SOL |
| ISCL (smart contract license) | 0.025 SOL per contract |

Primary payment currency is $CATH. SOL, BONK also accepted. Crypto-only — no fiat.

---

## Notes for Supabase Migration

1. Same PostgreSQL engine — no schema changes required
2. Swap `DATABASE_URL` to Supabase connection string
3. Switch from `db:push` to versioned migrations (`drizzle-kit generate` + `drizzle-kit migrate`) before going live
4. Supabase Storage can optionally replace some Arweave/IPFS usage for non-permanent assets
5. Do not use Supabase Auth — the app uses Replit Auth (OpenID Connect) and this would require significant changes to swap
