# Solturio Browser Extension

## Product Overview

The Solturio Browser Extension provides one-click IP protection for digital creators directly from their browser. It integrates seamlessly with solturio.app (identity/execution), solturio.sol (blockchain), and solturio.com (verification).

### Core Value Proposition
- **Instant Protection**: Right-click any image/logo to register IP protection
- **Verification Badge**: Hoverable badge shows ownership status on any webpage
- **DEX Protection**: Auto-detect logo theft on DEX platforms and crypto sites
- **License Management**: Quick license creation and verification

---

## User Stories

### Epic 1: Quick IP Registration

**US-1.1: Right-Click Logo Registration**
> As a brand owner, I want to right-click any logo on a webpage and register it for IP protection, so I can quickly protect my assets without leaving the page.

**Acceptance Criteria:**
- Right-click context menu shows "Protect with Solturio"
- Opens sidebar with pre-filled image data (URL, dimensions, hash)
- Connects to my solturio.app account
- Shows estimated SOL cost before confirmation
- Displays success with transaction signature

**US-1.2: Drag-and-Drop Registration**
> As a designer, I want to drag an image file onto the extension icon to start registration, so I can protect local files quickly.

**Acceptance Criteria:**
- Drag-drop triggers file upload flow
- Generates SHA-256 hash locally before upload
- Shows preview with metadata extraction
- Requires wallet signature for on-chain registration

**US-1.3: Screenshot-to-Protection**
> As a content creator, I want to take a screenshot of my work and immediately protect it, so I can timestamp my creations as I make them.

**Acceptance Criteria:**
- Extension provides "Capture & Protect" button
- Supports full page, visible area, or selection
- Adds timestamp watermark (optional)
- Registers screenshot with current timestamp

---

### Epic 2: Verification & Detection

**US-2.1: Logo Verification Badge**
> As a crypto investor, I want to see verification badges on logos across websites, so I know which projects have legitimate brand ownership.

**Acceptance Criteria:**
- Scans page for images matching registered hashes
- Shows green checkmark for verified logos
- Shows red warning for flagged/stolen logos
- Hoverable badge shows owner info and registration date

**US-2.2: DEX Platform Scanning**
> As a community member, I want the extension to alert me when viewing a DEX with a potentially stolen logo, so I can avoid scam tokens.

**Acceptance Criteria:**
- Auto-detects DEX platforms (Jupiter, Raydium, etc.)
- Scans token logos against Solturio registry
- Popup warning for unregistered logos
- "Report Potential Theft" button

**US-2.3: Ownership Lookup**
> As anyone, I want to right-click any image and check if it's registered on Solturio, so I can verify legitimate ownership.

**Acceptance Criteria:**
- Context menu: "Check Solturio Registration"
- Shows owner wallet, registration date, license status
- Link to full verification page on solturio.com
- Shows "Not Registered" if no match found

---

### Epic 3: License Management

**US-3.1: Quick ISCL Creation**
> As a brand owner, I want to create a license contract directly from the extension, so licensees can easily request usage rights.

**Acceptance Criteria:**
- Select registered asset from my portfolio
- Choose license template (social media, merchandise, etc.)
- Set price in SOL/CATH
- Generate shareable ISCL link
- Deploy to blockchain with one click

**US-3.2: License Verification**
> As a marketer, I want to verify I have a valid license for a logo I'm using, so I can prove authorized usage.

**Acceptance Criteria:**
- Enter license ID or scan QR code
- Shows license terms, expiry, and scope
- Displays green "Valid License" or red "Expired/Invalid"
- Export license proof as PDF

**US-3.3: Usage Tracking**
> As a licensor, I want to see where my licensed logos are being used, so I can ensure compliance.

**Acceptance Criteria:**
- Dashboard shows active licenses
- Detected usages map (websites found using my logo)
- Alert for unauthorized usage
- One-click DMCA report generation

---

### Epic 4: Wallet & Account Integration

**US-4.1: Wallet Connection**
> As a user, I want to connect my Solana wallet to the extension, so I can sign transactions and manage my IP.

**Acceptance Criteria:**
- Supports Phantom, Solflare, Backpack wallets
- Shows connected wallet address
- Displays SOL balance
- Quick switch between wallets

**US-4.2: Account Sync**
> As a Solturio user, I want the extension to sync with my solturio.app account, so my registrations appear everywhere.

**Acceptance Criteria:**
- Login with Replit Auth (same as web app)
- OAuth flow opens popup, returns to extension
- Session persists across browser restarts
- Logout clears all cached data

**US-4.3: Notification Center**
> As a brand owner, I want to receive browser notifications when my IP is detected elsewhere, so I can take immediate action.

**Acceptance Criteria:**
- Real-time push notifications
- Configurable alert types (detection, license request, expiry)
- Click notification to open relevant page
- Do-not-disturb schedule setting

---

## MVP Requirements

### Phase 1: Core Protection (MVP v1.0)

| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Right-click logo registration | P0 | Medium | Required |
| Wallet connection (Phantom) | P0 | Low | Required |
| Account login (Replit Auth) | P0 | Medium | Required |
| Image hash verification | P0 | Low | Required |
| Basic verification badge | P1 | Medium | Required |
| DEX platform detection | P1 | High | Required |

### Phase 2: Enhanced Features (v1.5)

| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| ISCL quick creation | P1 | High | Planned |
| License verification | P1 | Medium | Planned |
| Multi-wallet support | P2 | Medium | Planned |
| Usage tracking dashboard | P2 | High | Planned |
| Screenshot capture | P2 | Medium | Planned |

### Phase 3: Advanced (v2.0)

| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Automated DMCA filing | P2 | High | Future |
| Batch registration | P2 | Medium | Future |
| Browser notification center | P3 | Medium | Future |
| Cross-browser sync | P3 | High | Future |

---

## Technical Architecture

### Extension Components

```
solturio-extension/
├── manifest.json          # Extension configuration (Manifest V3)
├── background/
│   ├── service-worker.js  # Background service worker
│   ├── api-client.js      # Solturio API integration
│   └── wallet-adapter.js  # Solana wallet connections
├── content/
│   ├── content-script.js  # Page injection for badge overlay
│   ├── image-scanner.js   # Hash matching engine
│   └── dex-detector.js    # DEX platform recognition
├── popup/
│   ├── popup.html         # Main extension popup
│   ├── popup.js           # Popup logic
│   └── popup.css          # Popup styles
├── sidebar/
│   ├── sidebar.html       # Registration sidebar panel
│   ├── sidebar.js         # Registration flow
│   └── sidebar.css        # Sidebar styles
├── options/
│   ├── options.html       # Settings page
│   └── options.js         # Settings logic
├── lib/
│   ├── crypto.js          # SHA-256, signature utilities
│   ├── solana.js          # Web3.js wrapper
│   └── storage.js         # Chrome storage API wrapper
└── assets/
    ├── icons/             # Extension icons
    └── badges/            # Verification badge assets
```

### Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "Solturio IP Protection",
  "version": "1.0.0",
  "description": "Protect your intellectual property on the blockchain. Right-click any image to register, verify ownership, and detect stolen logos.",
  "author": "Solturio",
  "homepage_url": "https://solturio.app",
  
  "permissions": [
    "activeTab",
    "contextMenus",
    "storage",
    "notifications",
    "identity",
    "sidePanel",
    "scripting"
  ],
  
  "optional_permissions": [
    "clipboardRead",
    "clipboardWrite",
    "downloads"
  ],
  
  "host_permissions": [
    "https://solturio.app/*",
    "https://solturio.com/*",
    "https://*.jupiter.ag/*",
    "https://*.raydium.io/*",
    "https://*.dexscreener.com/*",
    "https://*.birdeye.so/*",
    "https://*.pump.fun/*"
  ],
  
  "optional_host_permissions": [
    "<all_urls>"
  ],
  
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content-script.js"],
      "css": ["content/content.css"],
      "run_at": "document_idle"
    }
  ],
  
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "Solturio IP Protection",
    "default_icon": {
      "16": "assets/icons/icon16.png",
      "32": "assets/icons/icon32.png",
      "48": "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    }
  },
  
  "side_panel": {
    "default_path": "sidebar/sidebar.html"
  },
  
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": false
  },
  
  "icons": {
    "16": "assets/icons/icon16.png",
    "32": "assets/icons/icon32.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  },
  
  "web_accessible_resources": [
    {
      "resources": [
        "assets/badges/*.svg",
        "assets/badges/*.png",
        "content/injected.js"
      ],
      "matches": ["<all_urls>"]
    }
  ],
  
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  
  "externally_connectable": {
    "matches": [
      "https://solturio.app/*",
      "https://solturio.com/*"
    ]
  },
  
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "Open Solturio popup"
    },
    "quick-protect": {
      "suggested_key": {
        "default": "Ctrl+Shift+P",
        "mac": "Command+Shift+P"
      },
      "description": "Quick protect current page screenshot"
    }
  }
}
```

---

## Permissions Explained

### Required Permissions

| Permission | Purpose | User Benefit |
|------------|---------|--------------|
| `activeTab` | Access current tab when user clicks extension | Enables right-click protection on current page only |
| `contextMenus` | Add "Protect with Solturio" to right-click menu | Core registration feature |
| `storage` | Save auth tokens, settings, cached verifications | Persistent login, faster page scans |
| `notifications` | Alert when your IP is detected elsewhere | Real-time protection alerts |
| `identity` | OAuth popup for solturio.app login | Secure account linking |
| `sidePanel` | Registration sidebar panel | Full registration workflow |
| `scripting` | Inject verification badges on pages | Show ownership badges on images |

### Optional Permissions (Requested When Needed)

| Permission | Purpose | When Requested |
|------------|---------|----------------|
| `clipboardRead` | Paste image URLs or hashes | When using "Paste & Verify" feature |
| `clipboardWrite` | Copy verification links, license IDs | When user clicks "Copy Link" |
| `downloads` | Save certificates, license PDFs | When exporting documents |
| `<all_urls>` | Full page scanning on any site | When enabling "Scan All Sites" in settings |

### Host Permissions

| Domain | Purpose |
|--------|---------|
| `solturio.app/*` | API calls, authentication |
| `solturio.com/*` | Public verification lookups |
| `*.jupiter.ag/*` | DEX logo scanning (Solana) |
| `*.raydium.io/*` | DEX logo scanning (Solana) |
| `*.dexscreener.com/*` | Multi-chain DEX scanning |
| `*.birdeye.so/*` | Token analytics scanning |
| `*.pump.fun/*` | Memecoin platform scanning |

---

## UI Components

### Required Components (MVP)

| Component | File | Purpose |
|-----------|------|---------|
| **Toolbar Icon** | `action.default_icon` | Extension entry point, shows status |
| **Popup** | `popup/popup.html` | Quick access: login, stats, recent activity |
| **Background Worker** | `background/service-worker.js` | API calls, auth management, message routing |
| **Content Script** | `content/content-script.js` | Page scanning, badge injection |

### Optional Components (Can Be Disabled)

| Component | File | Default | User Control |
|-----------|------|---------|--------------|
| **Sidebar Panel** | `sidebar/sidebar.html` | Enabled | Settings toggle |
| **Context Menu** | Created in service-worker | Enabled | Settings toggle |
| **Notification Alerts** | Uses `notifications` API | Enabled | Settings toggle |
| **Options Page** | `options/options.html` | Enabled | Always available |
| **Keyboard Shortcuts** | `commands` in manifest | Enabled | Chrome settings |

### Component Details

#### 1. Toolbar Popup (Required)
```
popup/
├── popup.html          # Entry HTML
├── popup.tsx           # React component
├── components/
│   ├── Header.tsx      # Logo, wallet status
│   ├── QuickStats.tsx  # Assets count, licenses
│   ├── RecentActivity.tsx
│   └── LoginButton.tsx
└── popup.css           # Tailwind compiled
```
**Size**: 400px width, 500px max height
**State**: Shows login prompt if unauthenticated, dashboard if logged in

#### 2. Sidebar Panel (Optional - Default ON)
```
sidebar/
├── sidebar.html        # Entry HTML
├── sidebar.tsx         # React component
├── components/
│   ├── ImagePreview.tsx
│   ├── MetadataForm.tsx
│   ├── CostEstimate.tsx
│   ├── WalletSign.tsx
│   └── SuccessScreen.tsx
└── sidebar.css
```
**Size**: 350px width, full viewport height
**Trigger**: Right-click → "Protect with Solturio" OR drag-drop on icon
**Can Disable**: Settings → "Open registrations in new tab instead"

#### 3. Context Menu (Optional - Default ON)
```typescript
// Created dynamically in service-worker.js
chrome.contextMenus.create({
  id: "protect-image",
  title: "Protect with Solturio",
  contexts: ["image"],
});

chrome.contextMenus.create({
  id: "verify-image",
  title: "Check Solturio Registration",
  contexts: ["image"],
});

chrome.contextMenus.create({
  id: "protect-selection",
  title: "Protect Selected Area",
  contexts: ["selection"],
});
```
**Can Disable**: Settings → "Disable right-click menu items"

#### 4. Verification Badges (Optional - Default ON)
```typescript
// Injected by content script
interface BadgeConfig {
  enabled: boolean;           // Master toggle
  showOnDexOnly: boolean;     // Only show on DEX platforms
  badgePosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  badgeSize: "small" | "medium" | "large"; // 16px, 24px, 32px
  showUnregisteredWarning: boolean;
}
```
**Can Disable**: Settings → "Hide verification badges"

#### 5. Notifications (Optional - Default ON)
```typescript
interface NotificationSettings {
  enabled: boolean;
  types: {
    ipDetection: boolean;     // Your logo found elsewhere
    licenseRequest: boolean;  // Someone wants to license
    licenseExpiry: boolean;   // License expiring soon
    scamAlert: boolean;       // DEX scam detection
  };
  quietHours: {
    enabled: boolean;
    start: string;  // "22:00"
    end: string;    // "08:00"
  };
}
```
**Can Disable**: Settings → "Notification preferences"

#### 6. Options Page (Always Available)
```
options/
├── options.html
├── options.tsx
├── sections/
│   ├── GeneralSettings.tsx
│   ├── PrivacySettings.tsx
│   ├── NotificationSettings.tsx
│   ├── BadgeSettings.tsx
│   ├── WalletSettings.tsx
│   └── AdvancedSettings.tsx
└── options.css
```
**Access**: Right-click extension icon → "Options" OR popup gear icon

---

## File Structure (Complete)

```
solturio-extension/
├── manifest.json                    # Extension config
├── package.json                     # NPM dependencies
├── vite.config.ts                   # Build configuration
├── tailwind.config.ts               # Tailwind setup
├── tsconfig.json                    # TypeScript config
│
├── src/
│   ├── background/
│   │   ├── index.ts                 # Service worker entry
│   │   ├── api.ts                   # Solturio API client
│   │   ├── auth.ts                  # Token management
│   │   ├── wallet.ts                # Wallet adapter
│   │   ├── context-menu.ts          # Menu creation
│   │   └── notifications.ts         # Push notifications
│   │
│   ├── content/
│   │   ├── index.ts                 # Content script entry
│   │   ├── scanner.ts               # Image hash scanner
│   │   ├── badges.ts                # Badge overlay
│   │   ├── dex-detector.ts          # DEX platform detection
│   │   └── content.css              # Injected styles
│   │
│   ├── popup/
│   │   ├── index.html               # Popup HTML
│   │   ├── index.tsx                # React entry
│   │   ├── App.tsx                  # Main component
│   │   └── components/
│   │       ├── Header.tsx
│   │       ├── WalletStatus.tsx
│   │       ├── QuickStats.tsx
│   │       ├── RecentActivity.tsx
│   │       └── LoginButton.tsx
│   │
│   ├── sidebar/
│   │   ├── index.html               # Sidebar HTML
│   │   ├── index.tsx                # React entry
│   │   ├── App.tsx                  # Main component
│   │   └── components/
│   │       ├── ImagePreview.tsx
│   │       ├── MetadataExtractor.tsx
│   │       ├── RegistrationForm.tsx
│   │       ├── CostEstimate.tsx
│   │       ├── WalletSignature.tsx
│   │       └── SuccessScreen.tsx
│   │
│   ├── options/
│   │   ├── index.html               # Options HTML
│   │   ├── index.tsx                # React entry
│   │   ├── App.tsx                  # Main component
│   │   └── sections/
│   │       ├── General.tsx
│   │       ├── Privacy.tsx
│   │       ├── Notifications.tsx
│   │       ├── Badges.tsx
│   │       ├── Wallet.tsx
│   │       └── Advanced.tsx
│   │
│   └── shared/
│       ├── types.ts                 # TypeScript interfaces
│       ├── constants.ts             # API URLs, defaults
│       ├── crypto.ts                # SHA-256 hashing
│       ├── storage.ts               # Chrome storage wrapper
│       ├── messaging.ts             # Extension messaging
│       └── utils.ts                 # Helper functions
│
├── assets/
│   ├── icons/
│   │   ├── icon16.png               # Toolbar (small)
│   │   ├── icon32.png               # Toolbar (retina)
│   │   ├── icon48.png               # Extensions page
│   │   └── icon128.png              # Chrome Web Store
│   ├── badges/
│   │   ├── verified.svg             # Green checkmark
│   │   ├── unregistered.svg         # Gray question
│   │   ├── flagged.svg              # Red warning
│   │   └── loading.svg              # Spinner
│   └── images/
│       ├── logo.svg                 # Solturio logo
│       └── onboarding/              # Tutorial images
│
├── _locales/                        # i18n (optional)
│   └── en/
│       └── messages.json
│
└── dist/                            # Build output
    ├── chrome/                      # Chrome package
    └── firefox/                     # Firefox package
```

---

## Settings Storage Schema

```typescript
// Stored in chrome.storage.sync (synced across devices)
interface SyncedSettings {
  // Feature Toggles
  contextMenuEnabled: boolean;       // Default: true
  sidebarEnabled: boolean;           // Default: true
  badgesEnabled: boolean;            // Default: true
  notificationsEnabled: boolean;     // Default: true
  
  // Badge Configuration
  badgePosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  badgeSize: "small" | "medium" | "large";
  showOnDexOnly: boolean;
  
  // Notification Settings
  notifyIpDetection: boolean;
  notifyLicenseRequest: boolean;
  notifyLicenseExpiry: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  
  // Privacy
  sendAnonymousUsage: boolean;       // Default: true
  cacheVerifications: boolean;       // Default: true
  cacheDurationHours: number;        // Default: 24
}

// Stored in chrome.storage.local (device-specific)
interface LocalStorage {
  // Auth
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: number | null;
  user: User | null;
  
  // Wallet
  connectedWallet: string | null;    // Wallet address
  walletType: "phantom" | "solflare" | "backpack" | null;
  
  // Cache
  verificationCache: Record<string, VerificationResult>;
  lastCacheClean: number;
  
  // Stats
  totalRegistrations: number;
  totalVerifications: number;
  lastActivity: number;
}
```

---

## API Integration

### solturio.app Endpoints (Identity Layer)

```typescript
// Authentication
POST /api/extension/auth/init
  Request: { extensionId: string }
  Response: { authUrl: string, state: string }

POST /api/extension/auth/callback
  Request: { code: string, state: string }
  Response: { accessToken: string, refreshToken: string, user: User }

POST /api/extension/auth/refresh
  Request: { refreshToken: string }
  Response: { accessToken: string }

// Registration
POST /api/extension/register/image
  Headers: { Authorization: "Bearer <token>" }
  Request: { 
    imageUrl: string,
    imageHash: string,
    sourceUrl: string,
    metadata: {
      width: number,
      height: number,
      format: string
    }
  }
  Response: { 
    registrationId: string,
    estimatedCost: { sol: string, usd: string },
    transactionToSign: string // Base64 encoded partial tx
  }

POST /api/extension/register/confirm
  Headers: { Authorization: "Bearer <token>" }
  Request: { 
    registrationId: string,
    signedTransaction: string // Wallet-signed tx
  }
  Response: { 
    success: boolean,
    txSignature: string,
    ipfsHash: string,
    certificateUrl: string
  }

// Verification
GET /api/extension/verify?hash={imageHash}
  Response: {
    registered: boolean,
    owner?: { wallet: string, name: string },
    registeredAt?: string,
    licenses?: License[],
    verificationUrl: string
  }

// Portfolio
GET /api/extension/portfolio
  Headers: { Authorization: "Bearer <token>" }
  Response: { assets: Asset[], totalValue: string }
```

### SC Replit Endpoints (Smart Contract Layer)

```typescript
// Transaction Building
POST /api/sc/build-registration-tx
  Request: {
    ownerWallet: string,
    metadataUri: string,
    assetType: "logo" | "music" | "code"
  }
  Response: { transaction: string, blockhash: string }

POST /api/sc/build-iscl-tx
  Request: {
    licensorWallet: string,
    licenseeWallet: string,
    termsHash: string,
    paymentAmount: string
  }
  Response: { transaction: string, blockhash: string }

// Verification
GET /api/sc/verify-ownership?wallet={wallet}&assetId={assetId}
  Response: { 
    valid: boolean, 
    owner: string, 
    mintAddress: string 
  }
```

### solturio.com Endpoints (Public Verification)

```typescript
// Public Lookup
GET /api/public/lookup?hash={imageHash}
  Response: {
    found: boolean,
    registration?: {
      id: string,
      ownerName: string,
      registeredAt: string,
      badgeUrl: string,
      certificateUrl: string
    }
  }

// Badge Embed
GET /api/public/badge/{registrationId}
  Response: { svg: string } // Embeddable badge

// Batch Verification (for page scanning)
POST /api/public/batch-verify
  Request: { hashes: string[] }
  Response: { 
    results: { 
      [hash: string]: { registered: boolean, owner?: string } 
    }
  }
```

---

## Security Considerations

### Data Handling
- **Image hashes generated locally** - Full images never sent to servers
- **Private keys never leave wallet** - Extension uses wallet adapter
- **Session tokens stored encrypted** - Chrome storage API with encryption
- **No plaintext credentials** - OAuth flow only

### Permissions Rationale
| Permission | Reason |
|------------|--------|
| activeTab | Access current page for image scanning |
| contextMenus | Right-click "Protect with Solturio" |
| storage | Store auth tokens and cached data |
| notifications | Alert on IP detection |
| identity | OAuth flow for account linking |

### Content Security Policy
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

---

## Development Prompt

Use the following prompt to build the Solturio browser extension:

---

### BUILD PROMPT: Solturio Browser Extension

**Project**: Chrome/Firefox browser extension for Solturio IP protection platform

**Tech Stack**:
- Manifest V3 (Chrome) / WebExtensions API (Firefox)
- TypeScript
- Vite for bundling
- TailwindCSS for styling
- @solana/web3.js for blockchain
- @solana/wallet-adapter for wallet connections

**Core Features (MVP)**:

1. **Right-Click Registration**
   - Context menu on images: "Protect with Solturio"
   - Opens sidebar with image preview and metadata
   - Generates SHA-256 hash locally
   - Calls solturio.app API to create registration
   - Requests wallet signature via Phantom/Solflare
   - Submits signed transaction
   - Shows success with certificate link

2. **Authentication**
   - Popup login button opens OAuth flow to solturio.app
   - Uses Chrome identity API for popup
   - Stores JWT tokens in encrypted chrome.storage
   - Auto-refresh tokens before expiry
   - Logout clears all stored data

3. **Verification Badges**
   - Content script scans all <img> elements
   - Generates hash for each image
   - Batch query to solturio.com/api/public/batch-verify
   - Overlay small badge on verified images (bottom-right corner)
   - Green checkmark = registered, Red warning = flagged
   - Hover shows owner info popup

4. **DEX Detection**
   - Detect when on Jupiter, Raydium, DexScreener, etc.
   - Auto-scan token logos
   - Show alert bar if unregistered logos found
   - "Report Potential Theft" button

5. **Popup Interface**
   - Show connected wallet (truncated address)
   - Show account status (logged in/out)
   - Quick stats: My Assets, Active Licenses
   - Recent activity feed
   - Settings gear icon

**API Integration**:
- Base URL: `https://solturio.app/api/extension/`
- Auth header: `Authorization: Bearer {jwt}`
- All requests include `X-Extension-Version` header

**Wallet Integration**:
```typescript
// Use @solana/wallet-adapter-wallets
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';

const wallet = new PhantomWalletAdapter();
await wallet.connect();
const signature = await wallet.signTransaction(transaction);
```

**File Structure**:
```
src/
├── background/
│   ├── index.ts           # Service worker entry
│   ├── api.ts             # API client class
│   ├── auth.ts            # Auth token management
│   └── wallet.ts          # Wallet adapter wrapper
├── content/
│   ├── index.ts           # Content script entry
│   ├── scanner.ts         # Image hash scanner
│   ├── badges.ts          # Badge overlay renderer
│   └── dex.ts             # DEX platform detector
├── popup/
│   ├── index.html
│   ├── index.tsx          # React popup component
│   └── components/
├── sidebar/
│   ├── index.html
│   ├── index.tsx          # React sidebar component
│   └── components/
├── shared/
│   ├── types.ts           # Shared TypeScript types
│   ├── crypto.ts          # Hash utilities
│   └── storage.ts         # Storage wrapper
└── manifest.json
```

**Design Requirements**:
- Match Solturio brand colors (dark theme, gold accents)
- Popup: 400px width, auto height
- Sidebar: 350px width, full height
- Badges: 24x24px with subtle drop shadow
- Use Lucide icons

**Testing**:
- Unit tests with Vitest
- E2E tests with Playwright for extension
- Test on Chrome, Firefox, Brave

**Build Output**:
- `dist/chrome/` - Chrome extension package
- `dist/firefox/` - Firefox add-on package
- Source maps in development only

---

## Success Metrics

| Metric | Target (90 days) |
|--------|------------------|
| Extension installs | 1,000 |
| Registrations via extension | 500 |
| Verification badge impressions | 50,000 |
| DEX scam alerts triggered | 100 |
| Avg. registration time | < 30 seconds |

---

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Core MVP | 4 weeks | Registration, Auth, Basic Badges |
| Phase 2: DEX Protection | 2 weeks | DEX detection, Batch scanning |
| Phase 3: ISCL Integration | 3 weeks | License creation, Verification |
| Phase 4: Polish & Launch | 2 weeks | Testing, Store submission |

**Total: 11 weeks to full release**

---

## Store Submission Checklist

### Chrome Web Store
- [ ] 128x128 icon PNG
- [ ] 440x280 marquee promo image
- [ ] 1280x800 screenshot (x5)
- [ ] Short description (132 chars)
- [ ] Detailed description
- [ ] Privacy policy URL
- [ ] Support email
- [ ] Developer verification

### Firefox Add-ons
- [ ] Same assets as Chrome
- [ ] Source code ZIP for review
- [ ] AMO reviewer notes

---

*Document Version: 1.0*
*Last Updated: January 2026*
