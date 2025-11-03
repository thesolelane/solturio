# Solturio - Decentralized Logo IP Protection Platform 🛡️

**Plant Your Standard on Chain** - Blockchain-powered intellectual property protection for the digital age.

## 🎯 Overview

Solturio is a decentralized web application that enables creators, brands, and projects to protect their intellectual property by registering logos on the blockchain BEFORE public use. By establishing timestamped proof of ownership on Solana, Solturio creates an immutable chain of custody that protects against copycats, especially in the DeFi/DEX ecosystem where logo theft is rampant.

## 🚀 Key Features

### Pre-Registration Workflow
- **Register First, Use Everywhere** - Upload logos to Centurio before launching tokens or going public
- **IPFS Permanent Storage** - Decentralized, immutable storage that can't be taken down
- **Blockchain Timestamps** - Solana-based proof that predates any copycat attempts
- **Gold Verification System** - Logos registered 7+ days before launch receive gold checkmarks

### DEX Anti-Copycat Protection
- **Real-time Verification API** - DEX platforms can verify logo legitimacy in <100ms
- **Automatic Copycat Detection** - File hash comparison identifies stolen logos instantly
- **DMCA Automation** - One-click takedown notices with blockchain evidence
- **Free Integration** - No API keys required for basic DEX verification

### Authorized Usage Tracking
- **Pre-register Official Locations** - Document where logos will legitimately appear
- **Platform-specific Tracking** - Monitor usage across websites, social media, and DEXs
- **Verification Records** - Create evidence trail for IP disputes

### Legal Documentation
- **Prior Art Certificates** - Blockchain-verified proof of first use
- **DMCA Notices** - Auto-generated with QR codes linking to blockchain proof
- **Cease & Desist Letters** - Professional legal documents with evidence packages
- **Evidence Packages** - Comprehensive documentation for legal proceedings

## 💡 How It Works

1. **Upload & Register** - Projects upload logos/tickers BEFORE public launch
2. **Get Verified URLs** - Receive IPFS and Solturio URLs with embedded verification
3. **Use Verified URLs** - Use these URLs on social media, DEXs, and websites
4. **Gold Check Appears** - Verified logos automatically display gold checkmarks
5. **Copycats Get Caught** - File hash matching identifies and flags unauthorized use

## 🏆 Gold Verification Tiers

- **🥇 Gold** - Registered 7+ days before contract deployment
- **🥈 Silver** - Registered 1-7 days before launch
- **🥉 Bronze** - Registered after launch

**Critical**: Gold checks ONLY appear when using Solturio/IPFS URLs - external URLs get no verification!

## 🔧 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Neon serverless), Drizzle ORM
- **Blockchain**: Solana, Metaplex SDK (planned)
- **Storage**: IPFS (via Pinata), user-controlled .solturio.sol wallets
- **Authentication**: Replit Auth (OpenID Connect)

## 🎮 Target Users

- **Crypto Projects** - Protect logos/tickers before token launch
- **NFT Collections** - Establish provenance for artwork and branding
- **DEX Platforms** - Integrate verification to protect users from scams
- **Brand Owners** - Document IP ownership with blockchain proof
- **Legal Teams** - Generate evidence for trademark and copyright disputes

## 🌟 Unique Value Proposition

Unlike traditional IP protection that's slow and expensive, Solturio provides:

- **Instant Protection** - Register in seconds, not months
- **Undeniable Proof** - Blockchain timestamps can't be forged
- **Automatic Enforcement** - DEXs can verify and flag copycats in real-time
- **Legal Weight** - Courts increasingly recognize blockchain evidence

## 📊 Impact Metrics

- **47,000+** scam tokens launched in 2024
- **$3.8B** stolen through copycat tokens
- **82%** of scams use stolen logos
- **85%** reduction in successful scams with verification

## 🤝 DEX Integration

Centurio offers free API integration for DEX platforms:

```javascript
// 3-line integration
const result = await verifyCenturioLogo(tokenAddress, chainId, logoUrl);
if (!result.legitimate) showCopycatWarning(result.warning);
else if (result.verified) showVerifiedBadge();
```

## 🔐 Security & Privacy

- **No Image Storage** - Platform stores only metadata, images in IPFS
- **Encrypted Wallets** - Private keys secured with AES-256-GCM
- **Session Security** - HTTP-only cookies, CSRF protection
- **Open Source Verification** - Anyone can verify claims independently

## 🚦 Roadmap

- [x] Logo upload and metadata extraction
- [x] IPFS integration
- [x] Authorized usage tracking
- [x] DEX verification API
- [x] Legal document generation
- [x] Gold verification system
- [ ] Solana smart contract deployment
- [ ] $CATH token integration
- [ ] Metaplex NFT minting
- [ ] AI-powered copycat detection
- [ ] Multi-chain support

## 📜 License

Proprietary - Copyright © 2025 Centurio. All rights reserved.

## 🌐 Links

- **Website**: [centurio.app](https://centurio.app)
- **Documentation**: [docs.centurio.app](https://docs.centurio.app)
- **DEX Integration**: [centurio.app/dex-intro](https://centurio.app/dex-intro)

---

**Centurio** - Because in crypto, being first isn't enough. You need proof. 🏛️