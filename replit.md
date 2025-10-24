# LogoGuard - NFT Logo Minting Platform

## Overview

LogoGuard is a web application that enables users to protect their intellectual property by minting logos as NFTs on the Solana blockchain. The platform provides immutable, timestamped proof of ownership for trademarks and brand assets. Users can upload logo files, organize them into collections, and mint them as blockchain-verified assets with integrated payment processing via Stripe.

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

**Key Architectural Patterns**:
- Storage abstraction layer (`server/storage.ts`) separates business logic from database operations
- Middleware-based request logging with response time tracking
- Error handling with custom 401 detection for authentication flows

### Database Architecture

**Database**: PostgreSQL (Neon serverless)

**ORM**: Drizzle ORM with type-safe schema definitions

**Schema Design**:
- `users` - User profiles with Replit Auth integration and Stripe customer IDs
- `logos` - Logo assets with metadata (dimensions, format, color palette, file paths)
- `collections` - Groups of logos for batch minting with blockchain transaction data
- `payments` - Stripe payment tracking with intent IDs and status
- `sessions` - Encrypted session storage for authentication

**Database Connection Strategy**:
- WebSocket-based connection pooling via @neondatabase/serverless
- Connection string from environment variables
- Automatic schema migrations via drizzle-kit

**Key Design Decisions**:
- UUID primary keys for distributed system compatibility
- Timestamp fields (createdAt, updatedAt) for audit trails
- JSONB fields for flexible metadata storage (color palettes, blockchain data)
- Indexes on session expiration for efficient cleanup

### Authentication & Authorization

**Provider**: Replit Auth (OpenID Connect)

**Implementation**:
- Passport.js strategy with openid-client
- Automatic user provisioning on first login (upsert pattern)
- Session-based authentication (no JWT tokens)
- Protected routes check authentication via `isAuthenticated` middleware
- Unauthorized requests redirect to `/api/login` with automatic OIDC flow

**Security Measures**:
- Secure session cookies with httpOnly flag
- CSRF protection via session-based authentication
- Environment-based session secrets

### External Dependencies

**Payment Processing**: Stripe
- Payment intents for collection minting fees
- Customer management for recurring users
- Webhook integration for payment status updates
- Optional in development (graceful degradation when STRIPE_SECRET_KEY not set)
- Stripe Elements integration on frontend with @stripe/react-stripe-js

**Blockchain**: Solana (implied, not yet implemented)
- NFT minting functionality referenced in schema but not in current codebase
- Collection and logo schemas include blockchain address fields for future integration
- Transaction hash and explorer URL tracking prepared

**Image Processing**: Sharp
- Server-side image optimization and metadata extraction
- Color palette analysis for logo assets

**Development Tools**:
- Replit-specific plugins for dev environment (@replit/vite-plugin-runtime-error-modal, cartographer, dev-banner)
- Only active in development mode (NODE_ENV check)

**UI Framework**: Radix UI
- Comprehensive set of accessible, unstyled primitives
- Full component coverage: dialogs, dropdowns, tooltips, forms, navigation
- Chosen for accessibility compliance and professional UX requirements

**Hosting Considerations**:
- Environment variable dependencies: DATABASE_URL, SESSION_SECRET, REPL_ID, ISSUER_URL
- Static asset serving via Vite in development, Express in production
- Build output to `dist/public` for frontend, `dist/` for backend bundle