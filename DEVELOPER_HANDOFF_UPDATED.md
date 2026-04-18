# Solturio - Developer Handoff (Updated)

## What It Is

Solturio is a decentralized intellectual property protection platform built around Solana-linked ownership, registration records, NFT-backed proof flows, licensing, DEX anti-copycat verification, and educational/reward features.

The codebase currently combines:
- authenticated platform accounts via Replit OIDC
- Solturio-managed wallet generation and ceremony flows
- logo, artwork, music, and code registration records
- licensing and compliance modules
- token launch / DEX verification features
- quiz / rewards systems

This handoff reflects the current repo state in `C:\Users\deaqu\OneDrive\Documents\New project`.

---

## Current Status

Recently completed in code:
- `.env.example` was updated to match the variables the app actually uses
- full-user email verification was converted from a fake boolean flip into a real token + expiry + verify-link flow
- local `.env` loading was added with a built-in loader
- Drizzle migration scaffolding was added
- private-key export was aligned with the Key Handover Ceremony instead of an impossible wallet-signature challenge
- upload validation was hardened so invalid files are rejected early

Still pending operationally:
- real local or hosted `DATABASE_URL`
- applying migrations to the live database
- end-to-end live validation of the new email verification flow

---

## Architecture Notes

The earlier three-layer concept is still a useful product description:
- app layer for auth, account, API, dashboard, and admin flows
- chain layer for wallet/NFT/licensing logic
- public/verification layer for third-party validation concepts

However, the repo itself is a single full-stack application with:
- React + Vite frontend
- Express + TypeScript backend
- PostgreSQL + Drizzle ORM

---

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Wouter routing
- TanStack Query v5
- Tailwind CSS
- shadcn/ui / Radix UI
- React Hook Form
- Zod

### Backend
- Node.js
- Express
- TypeScript
- Passport + Replit OIDC
- express-session with PostgreSQL-backed session store
- Multer for multipart uploads
- Sharp for image metadata / image validation

### Database
- PostgreSQL
- Drizzle ORM
- schema source of truth: [shared/schema.ts](/C:/Users/deaqu/OneDrive/Documents/New project/shared/schema.ts:1)

### Authentication
- Replit Auth / OpenID Connect
- session-cookie based
- browser extension routes use JWT-based auth where applicable

---

## Database

Current table count in `shared/schema.ts`: **35**

Tables currently defined:
- `sessions`
- `users`
- `visitor_accounts`
- `logos`
- `collections`
- `payments`
- `contract_bindings`
- `authorized_usages`
- `organizations`
- `copycat_reports`
- `outreach_letters`
- `variation_protections`
- `quiz_questions`
- `quiz_attempts`
- `quiz_stats`
- `telegram_leaderboard`
- `treasury_wallets`
- `compliance_logs`
- `kyc_status`
- `compliance_trigger_rules`
- `compliance_cases`
- `platform_config`
- `accepted_tokens`
- `token_applications`
- `rewards_log`
- `license_contracts`
- `referral_tracking`
- `used_transactions`
- `ip_assets`
- `music_collections`
- `tracks`
- `releases`
- `release_tracks`
- `code_repo_snapshots`
- `admin_secrets`

Important schema notes:
- `users` now includes:
  - `emailVerificationToken`
  - `emailVerificationTokenExpiresAt`
  - ceremony fields such as `ceremonyCompleted`, `recoveryPhraseVerified`, `encryptedRecoveryPhrase`, `walletSalt`, `hasExportedPrivateKey`
- visitor verification still exists separately on `visitor_accounts`

---

## Migration Workflow

This repo is no longer "schema push only."

Current scripts in [package.json](/C:/Users/deaqu/OneDrive/Documents/New project/package.json:1):
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:push`

Current migration artifacts exist in:
- [migrations](/C:/Users/deaqu/OneDrive/Documents/New project/migrations)

Important files:
- [migrations/0000_elite_shinobi_shaw.sql](/C:/Users/deaqu/OneDrive/Documents/New project/migrations/0000_elite_shinobi_shaw.sql:1)
- [migrations/0001_add_user_email_verification.sql](/C:/Users/deaqu/OneDrive/Documents/New project/migrations/0001_add_user_email_verification.sql:1)
- [migrations/README.md](/C:/Users/deaqu/OneDrive/Documents/New project/migrations/README.md:1)

Practical guidance:
- for a fresh database, use the checked-in migration flow
- for an existing database, ensure the verification-column migration is applied before relying on the new email verification flow

---

## Environment Variables

The app now supports loading a root `.env` and `.env.local` automatically via:
- [server/load-env.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/load-env.ts:1)

That loader is imported by:
- [server/index.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/index.ts:1)
- [server/db.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/db.ts:1)
- [server/replitAuth.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/replitAuth.ts:1)
- [server/services/email.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/services/email.ts:1)
- [drizzle.config.ts](/C:/Users/deaqu/OneDrive/Documents/New project/drizzle.config.ts:1)

Primary env template:
- [.env.example](/C:/Users/deaqu/OneDrive/Documents/New project/.env.example:1)

Key variables currently expected:

### Core
- `NODE_ENV`
- `PORT`
- `BASE_URL`
- `DATABASE_URL`

### Replit Auth
- `REPLIT_DOMAINS`
- `REPL_ID`
- `ISSUER_URL`
- `SESSION_SECRET`

### Encryption / Secrets
- `WALLET_ENCRYPTION_KEY`
- `SECRETS_ENCRYPTION_KEY`
- `MUSIC_MASTER_KEK`

### Email
- `SENDGRID_API_KEY`
- `NOREPLY_EMAIL`
- `SUPPORT_EMAIL`

### Storage
- `PINATA_API_KEY`
- `PINATA_SECRET_KEY`
- `PINATA_JWT`
- `PINATA_GATEWAY`
- `ARWEAVE_WALLET_KEY`

### Blockchain / Treasury
- `SOLANA_RPC_URL`
- `SOLANA_CLUSTER`
- `SOLTURIO_NFT_PROGRAM_ID`
- `SOLT_MINT_ADDRESS`
- `SOLTURIO_LAUNCH_DATE`
- `PLATFORM_SOL_WALLET`
- `PLATFORM_BONK_WALLET`
- `PLATFORM_CATH_WALLET`
- `PLATFORM_REVENUE_WALLET`
- `PLATFORM_OPERATIONS_WALLET`
- `PLATFORM_REWARDS_WALLET`
- `TREASURY_SOL_WALLET`
- `TREASURY_CATH_ACCOUNT`

### Integrations
- `SC_API_URL`
- `SC_API_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_QUIZ_CHAT_ID`
- `USPTO_ODP_API_KEY`
- `STUB_LICENSED`

---

## Authentication and Account Flows

### Full users
- created/upserted through Replit OIDC
- stored in `users`
- frontend auth data is fetched from `/api/auth/user`

### Full-user email verification
Current behavior:
- `POST /api/account/send-verification` issues a token and expiry
- `GET /api/account/verify-email/:token` verifies it
- success redirects back to `/account?emailVerification=success`

Relevant files:
- [server/account-routes.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/account-routes.ts:62)
- [server/storage.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/storage.ts:313)
- [client/src/pages/account.tsx](/C:/Users/deaqu/OneDrive/Documents/New project/client/src/pages/account.tsx:124)

### Visitor users
- separate email-only path in `visitor_accounts`
- separate verification token model still exists

This means the repo still contains two distinct account/verification systems.

---

## Wallet and Private-Key Export

### Current wallet generation
Users can manually generate a Solturio wallet from the account page:
- `POST /api/account/generate-solturio-wallet`

Relevant files:
- [server/account-routes.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/account-routes.ts:179)
- [client/src/pages/account.tsx](/C:/Users/deaqu/OneDrive/Documents/New project/client/src/pages/account.tsx:304)

### Key Handover Ceremony
Wallet export is now tied to ceremony state, not wallet-signature challenge.

Export rules now require:
- wallet exists
- email is verified
- ceremony is complete
- recovery phrase was verified
- wallet has the stored recovery material needed for export

Relevant files:
- [server/account-routes.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/account-routes.ts:253)
- [server/storage.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/storage.ts:406)
- [client/src/pages/account.tsx](/C:/Users/deaqu/OneDrive/Documents/New project/client/src/pages/account.tsx:657)
- [server/ceremony-routes.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/ceremony-routes.ts:1)

Important legacy note:
- older wallets created before the storage fix may be missing recovery material and will not export cleanly without support or migration handling

---

## Upload Validation

Upload validation was recently hardened.

The shared validator now rejects:
- unsupported MIME types
- mismatched file extension vs MIME type
- invalid raster images
- unsafe SVGs
- fake PDFs
- fake ZIPs
- invalid audio/video buffers
- unsafe filenames / hidden system-file style names

Relevant files:
- [server/upload-helpers.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/upload-helpers.ts:73)
- [server/upload-helpers.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/upload-helpers.ts:199)
- [server/logo-routes.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/logo-routes.ts:58)
- [server/routes.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/routes.ts:482)
- [client/src/pages/upload.tsx](/C:/Users/deaqu/OneDrive/Documents/New project/client/src/pages/upload.tsx:149)

The upload UI was also aligned with the file types the server truly accepts.

---

## Admin Authorization

Admin authorization currently allows either:
- whitelisted email
- `user.isAdmin === true`

Relevant file:
- [server/admin-middleware.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/admin-middleware.ts:1)

This is still a drift risk area and should be centralized further.

---

## Important File Locations

### Core
- [shared/schema.ts](/C:/Users/deaqu/OneDrive/Documents/New project/shared/schema.ts:1)
- [server/storage.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/storage.ts:1)
- [server/routes.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/routes.ts:1)
- [server/index.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/index.ts:1)
- [client/src/App.tsx](/C:/Users/deaqu/OneDrive/Documents/New project/client/src/App.tsx:1)

### Account / Auth / Wallet
- [server/replitAuth.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/replitAuth.ts:1)
- [server/account-routes.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/account-routes.ts:1)
- [server/ceremony-routes.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/ceremony-routes.ts:1)
- [server/security-ceremony.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/security-ceremony.ts:1)
- [client/src/pages/account.tsx](/C:/Users/deaqu/OneDrive/Documents/New project/client/src/pages/account.tsx:1)

### Upload / IP registration
- [server/logo-routes.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/logo-routes.ts:1)
- [server/upload-helpers.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/upload-helpers.ts:1)
- [client/src/pages/upload.tsx](/C:/Users/deaqu/OneDrive/Documents/New project/client/src/pages/upload.tsx:1)

### Env / DB
- [server/load-env.ts](/C:/Users/deaqu/OneDrive/Documents/New project/server/load-env.ts:1)
- [drizzle.config.ts](/C:/Users/deaqu/OneDrive/Documents/New project/drizzle.config.ts:1)
- [package.json](/C:/Users/deaqu/OneDrive/Documents/New project/package.json:1)
- [migrations/README.md](/C:/Users/deaqu/OneDrive/Documents/New project/migrations/README.md:1)

---

## Running Locally

Recommended local flow now:

```bash
npm install
```

Create a root `.env` or `.env.local` with at least:

```bash
DATABASE_URL=...
SESSION_SECRET=...
REPLIT_DOMAINS=...
REPL_ID=...
ISSUER_URL=...
WALLET_ENCRYPTION_KEY=...
SECRETS_ENCRYPTION_KEY=...
MUSIC_MASTER_KEK=...
```

Then:

```bash
npm run db:migrate
npm run dev
```

Fallback workflow if needed:

```bash
npm run db:push
```

But the repo is now set up for checked-in migrations and that is the safer long-term path.

---

## Supabase Notes

Supabase is a good fit here because it is still PostgreSQL.

Current migration guidance for Supabase:
1. set `DATABASE_URL` to the Supabase Postgres connection string
2. keep current app auth unless you intentionally migrate away from Replit OIDC
3. use checked-in Drizzle migrations rather than relying only on `db:push`
4. validate session behavior and connection compatibility in the deployment environment

No schema redesign is required just to move from Neon to Supabase.

---

## Known Risks / Next Recommended Work

Highest-value remaining work:
1. apply DB migrations with a real `DATABASE_URL`
2. validate the new email verification flow end to end
3. centralize admin authorization so client/server rules stop drifting
4. add a typed config module so env mistakes fail clearly
5. add tests for:
   - email verification
   - wallet generation
   - ceremony/export flow
   - upload validation
   - admin access
6. review legacy wallets created before recovery-material persistence

Current repo state is stronger than the earlier handoff described, but still not fully production-hardened.

