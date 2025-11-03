
// Solturio Bundle
// Cooperanth Consulting LLC / Anthony Cooper
// Consolidated drop-in file for Replit + GitHub.
//
// Includes:
//  - Express API for Solturio verification + badge overlay
//  - Token metadata ($SLTR + "cents")
//  - License text
//  - .env sample
//  - package.json reference
//
// Solturio = creator IP timestamping + authenticity watermark for DeFi tokens,
// logos, tickers. NOT a substitute for copyright, trademark, or securities review.
//
// Visual Identity:
// - Wordmark uses Orbitron Bold in all caps: "SOLTURIO"
// - Guardian/knight shield logo in silver/gold
// - Gold Check badge: hex shield w/ gold check engraved "SOLTURIO"
// - Fonts: Orbitron Bold (logo + engraved badge), Montserrat Regular (UI)
//
// NOTE:
// The API NEVER hands out a raw standalone badge. Creators only get a hosted,
// stamped composite via a URL. That prevents fake self-badging.
//
// Images live in ./solturio-logos/
//   solturio_dark.png
//   solturio_light.png
//   solturio_badge_goldcheck.png
//   solturio_wordmark.png
//
// Each also has .jpg and .svg versions for social / embeds / fallback.


// ------------------------------
// 1. ENV CONFIG SAMPLE
// ------------------------------

const ENV_SAMPLE = `
PORT=3000
BASE_URL=https://solturio.app
ISSUER_NAME="Cooperanth Consulting LLC"
ISSUER_EMAIL="info@cooperanth.com"

PUBLIC_DIR=api/data/verified
PRIVATE_DIR=api/data/proofs
REGISTRY_PATH=api/data/registry.json
`;


// ------------------------------
// 2. TOKEN METADATA
// ------------------------------

const SLTR_METADATA = {
  name: "Solturio",
  symbol: "SLTR",
  display_units: {
    main: "SLTR",
    fractional_name: "cents",
    fractional_per_unit: 100
  },
  purpose: "Access token for Solturio IP authenticity + verification rights.",
  utility: [
    "Unlocks Solturio Verified badge issuance",
    "Allows logo + ticker authenticity claims",
    "Enables reporting of copycats / ticker squatters / fake launches"
  ],
  issuer: "Cooperanth Consulting LLC",
  contact: "info@cooperanth.com",
  disclaimer:
    "Solturio is a timestamp and authenticity signaling service for creators and token founders. It is not a substitute for any national copyright, trademark, or securities filing."
};

const CENTS_METADATA = {
  note: "cents are the fractional display unit of SLTR; not a separate token mint.",
  fractional_name: "cents",
  ratio: "1 SLTR = 100 cents",
  used_for: [
    "Per-upload verification fee",
    "Timestamp mint fee",
    "Requesting Solturio review of a suspected copycat / fake ticker / fake token launch"
  ]
};


// ------------------------------
// 3. LICENSE TEXT
// ------------------------------

const SOLTURIO_LICENSE = `
Solturio Brand Assets License v1.0
Copyright © Cooperanth Consulting LLC

You are granted a limited, revocable, non-transferable right to DISPLAY the Solturio Verified™ badge
only when that badge is served directly from an official Solturio URL issued to you.

You MAY NOT:
- Copy, clone, screenshot, or rehost the badge.
- Edit, stretch, recolor, or animate the badge.
- Use the Solturio name, badge, or Gold Check to imply legal approval, securities clearance,
  or formal trademark/copyright registration status.

Solturio is a timestamp + authenticity signaling service. It is not a substitute for national
copyright, trademark, or securities review.

All rights reserved. Unauthorized use will result in removal from the Solturio registry.
`;

// ------------------------------
// 4. EXPRESS API IMPLEMENTATION
// ------------------------------

/*
To use in Replit:
1. Put this file at: solturio-kit/solturio_bundle.js
2. Put image assets in: solturio-kit/solturio-logos/
3. npm install express multer sharp uuid dotenv fs-extra
4. Create .env using ENV_SAMPLE as a template
5. Create index.js with:

   const { buildAppAndRouter } = require('./solturio_bundle');
   buildAppAndRouter();
*/

const PACKAGE_JSON_REFERENCE = {
  name: "solturio-verification-api",
  version: "1.0.0",
  description: "Solturio IP authenticity / Gold Check overlay service",
  main: "server.js",
  scripts: {
    start: "node server.js",
    dev: "nodemon server.js"
  },
  dependencies: {
    express: "^4.19.2",
    multer: "^1.4.5",
    sharp: "^0.33.3",
    uuid: "^9.0.1",
    crypto: "^1.0.1",
    dotenv: "^16.4.5",
    "fs-extra": "^11.2.0"
  },
  devDependencies: {
    nodemon: "^3.1.0"
  }
};


// Attempt to require Node libs. If this file is parsed somewhere non-Node,
// we'll fail gracefully.
let express, path, multer, fs, fse, sharp, crypto, uuidv4;
try {
  express = require('express');
  path = require('path');
  multer = require('multer');
  fs = require('fs');
  fse = require('fs-extra');
  sharp = require('sharp');
  crypto = require('crypto');
  uuidv4 = require('uuid').v4;
} catch (err) {
  // ignore if environment isn't Node
}


// UTILS
function hashBuffer(buf) {
  // sha256 hash of uploaded asset
  const h = crypto.createHash('sha256').update(buf).digest('hex');
  return h;
}

// Generate Solturio ID, like SLT-0xA48F23AB
function makeSolturioId() {
  const raw = uuidv4().replace(/-/g, '');
  return `SLT-0x${raw.slice(0, 8).toUpperCase()}`;
}


// SERVICE: generateOverlay
// overlays the Solturio Gold Check badge (solturio_badge_goldcheck.png)
// in lower-right corner of the submitted image (~20% scale).
async function generateOverlay(userBuffer) {
  const badgePath = path.resolve(__dirname, 'solturio-logos/solturio_badge_goldcheck.png');
  const badgeBuffer = fs.readFileSync(badgePath);

  const baseImg = sharp(userBuffer).resize({
    width: 800,
    height: 800,
    fit: 'inside',
    withoutEnlargement: true
  });

  const baseMeta = await baseImg.metadata();
  const outW = baseMeta.width || 800;
  const outH = baseMeta.height || 800;

  const badgeSize = Math.floor(Math.min(outW, outH) * 0.22);

  const badgePng = await sharp(badgeBuffer)
    .resize(badgeSize, badgeSize, { fit: 'contain' })
    .png()
    .toBuffer();

  const inset = Math.floor(badgeSize * 0.15);

  const stamped = await baseImg
    .composite([{
      input: badgePng,
      gravity: 'southeast',
      top: outH - badgeSize - inset,
      left: outW - badgeSize - inset
    }])
    .png()
    .toBuffer();

  return stamped;
}


// SERVICE: mintMetadata
// Writes public JSON + registry entry.
// This is what DEXs or communities can check to confirm authenticity.
async function mintMetadata({
  baseUrl,
  solturioId,
  walletAddress,
  fileHash,
  timestamp,
  stampedFilename,
  issuerName,
  issuerEmail,
  registryPath,
  publicDir
}) {
  await fse.ensureFile(registryPath);

  let registry = [];
  if (fs.existsSync(registryPath)) {
    try {
      registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    } catch {
      registry = [];
    }
  }

  const record = {
    solturio_id: solturioId,
    creator_wallet: walletAddress || null,
    original_file_hash: fileHash,
    verification_status: "verified",
    issued_by: issuerName,
    contact: issuerEmail,
    timestamp,
    stamped_asset_url: `${baseUrl}/verify/${stampedFilename}`,
    public_metadata_url: `${baseUrl}/verify-json/${solturioId}.json`,
    disclaimer:
      "Solturio provides blockchain timestamping and authenticity signaling. It is not a substitute for copyright, trademark, or securities review."
  };

  const publicMetaPath = path.resolve(publicDir, `${solturioId}.json`);
  fs.writeFileSync(publicMetaPath, JSON.stringify(record, null, 2), 'utf8');

  registry.push(record);
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');

  return record;
}


// BUILD APP AND ROUTES
// POST /api/verify/upload
// multipart/form-data with "asset" and optional "wallet"
// returns: solturio_id, stamped_asset_url, public_metadata_url, timestamp, file_hash
async function buildAppAndRouter() {
  require('dotenv').config();

  const app = express();
  app.use(express.json());

  const upload = multer({ storage: multer.memoryStorage() });

  const PUBLIC_DIR = process.env.PUBLIC_DIR || 'api/data/verified';
  const PRIVATE_DIR = process.env.PRIVATE_DIR || 'api/data/proofs';
  const REGISTRY_PATH = process.env.REGISTRY_PATH || 'api/data/registry.json';
  const BASE_URL = process.env.BASE_URL || 'https://solturio.app';
  const ISSUER_NAME = process.env.ISSUER_NAME || 'Cooperanth Consulting LLC';
  const ISSUER_EMAIL = process.env.ISSUER_EMAIL || 'info@cooperanth.com';

  // Serve stamped assets and verification JSON
  app.use('/verify', express.static(path.resolve(PUBLIC_DIR)));
  app.use('/verify-json', express.static(path.resolve(PUBLIC_DIR)));

  app.post('/api/verify/upload', upload.single('asset'), async (req, res) => {
    try {
      const walletAddress = req.body.wallet || null;

      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'No asset uploaded' });
      }

      // 1. hash original file
      const fileHash = hashBuffer(req.file.buffer);

      // 2. assign Solturio ID + timestamp
      const solturioId = makeSolturioId();
      const timestamp = new Date().toISOString();

      // 3. save original privately
      await fse.ensureDir(PRIVATE_DIR);
      const originalFilename = `${solturioId}_original.png`;
      fs.writeFileSync(
        path.join(PRIVATE_DIR, originalFilename),
        req.file.buffer
      );

      // 4. generate stamped overlay
      const stampedBuffer = await generateOverlay(req.file.buffer);

      // 5. save stamped publicly
      await fse.ensureDir(PUBLIC_DIR);
      const stampedFilename = `${solturioId}.png`;
      fs.writeFileSync(
        path.join(PUBLIC_DIR, stampedFilename),
        stampedBuffer
      );

      // 6. record metadata
      const record = await mintMetadata({
        baseUrl: BASE_URL,
        solturioId,
        walletAddress,
        fileHash,
        timestamp,
        stampedFilename,
        issuerName: ISSUER_NAME,
        issuerEmail: ISSUER_EMAIL,
        registryPath: REGISTRY_PATH,
        publicDir: PUBLIC_DIR
      });

      // 7. response to frontend / partner DEX
      return res.json({
        status: "ok",
        solturio_id: solturioId,
        stamped_asset_url: record.stamped_asset_url,
        public_metadata_url: record.public_metadata_url,
        timestamp,
        file_hash: fileHash,
        disclaimer: record.disclaimer
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  // start server live
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Solturio Verification API running on :${PORT}`);
  });

  return app;
}


// EXPORTS
module.exports = {
  ENV_SAMPLE,
  SLTR_METADATA,
  CENTS_METADATA,
  SOLTURIO_LICENSE,
  PACKAGE_JSON_REFERENCE,
  buildAppAndRouter
};
