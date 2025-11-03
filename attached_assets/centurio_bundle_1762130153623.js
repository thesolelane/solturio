// Centurio Bundle
// Generated 2025-11-03T00:31:27.483417 ET
// Cooperanth Consulting LLC / Anthony Cooper
//
// This file is intended to drop directly into Replit.
// It contains:
//  - Express API for Centurio verification + badge overlay
//  - Token metadata ($CNTRO + cents fractional unit)
//  - Basic README + LICENSE text
//
// NOTE:
// Images (logos + badge assets) must live in ./centurio-logos/
// and be deployed publicly by your static layer or CDN.
// The API will watermark creator uploads with the Centurio Gold Check badge.
// The stamped result is served via a hosted URL. Users are NOT allowed to
// self-apply the badge manually.
//
// DISCLAIMER:
// Centurio provides blockchain proof-of-first-use and authenticity signaling.
// It is not a substitute for copyright, trademark, securities clearance,
// or legal registration.


// ------------------------------
// 1. ENV CONFIG SAMPLE
// ------------------------------

const ENV_SAMPLE = `
PORT=3000
BASE_URL=https://centurio.app
ISSUER_NAME="Cooperanth Consulting LLC"
ISSUER_EMAIL="info@cooperanth.com"

PUBLIC_DIR=api/data/verified
PRIVATE_DIR=api/data/proofs
REGISTRY_PATH=api/data/registry.json
`;

// ------------------------------
// 2. TOKEN METADATA
// ------------------------------

const CNTRO_METADATA = {
  name: "Centurio",
  symbol: "CNTRO",
  display_units: {
    main: "CNTRO",
    fractional_name: "cents",
    fractional_per_unit: 100
  },
  purpose: "Access token for Centurio IP protection and verification rights.",
  utility: [
    "Unlocks Centurio Verified badge issuance",
    "Allows logo + ticker authenticity claims",
    "Enables creator copycat/ticker-squat takedown requests"
  ],
  issuer: "Cooperanth Consulting LLC",
  contact: "info@cooperanth.com",
  disclaimer:
    "Centurio provides blockchain proof-of-first-use and authenticity signaling. It is not a substitute for any national copyright, trademark, or regulatory filing."
};

const CENTS_METADATA = {
  note: "cents are the fractional display unit of CNTRO; not a separate token mint.",
  fractional_name: "cents",
  ratio: "1 CNTRO = 100 cents",
  used_for: [
    "Per-upload verification fee",
    "Timestamp mint fee",
    "Requesting Centurio review of a suspected copycat or fake ticker"
  ]
};


// ------------------------------
// 3. LICENSE TEXT
// ------------------------------

const CENTURIO_LICENSE = `
Centurio Brand Assets License v1.0
Copyright © Cooperanth Consulting LLC

You are granted a limited, revocable, non-transferable right to DISPLAY the Centurio Verified™ badge
only when that badge is served directly from an official Centurio URL issued to you.

You MAY NOT:
- Copy, clone, screenshot, or rehost the badge.
- Edit, stretch, recolor, or animate the badge.
- Use the Centurio name, badge, or Gold Check to imply legal approval, securities clearance,
  or trademark registration status.

All rights reserved. Unauthorized use will result in removal from the Centurio registry.
`;


// ------------------------------
// 4. EXPRESS API IMPLEMENTATION
// ------------------------------

/*
This section inlines:
- package.json equivalent (for your reference)
- server.js
- /routes/verify.js
- /services/generateOverlay.js
- /services/mintMetadata.js
- /utils/hashFile.js
- /utils/idFactory.js

To use in Replit:
1. Split these logical sections into files OR eval directly (for prototyping).
2. Ensure you install deps:
   npm install express multer sharp uuid dotenv fs-extra
*/

// 4a. package.json reference (not executed here, just informational)
const PACKAGE_JSON_REFERENCE = {
  name: "centurio-verification-api",
  version: "1.0.0",
  description: "Centurio IP verification / Gold Check overlay service",
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


// ----- core imports -----
// IMPORTANT: These require Node environment to actually run.
// For a pure bundle file, we wrap them so this file can be imported
// without instantly crashing in non-Node contexts.

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
  // we're in a non-node parser environment, ignore
}

// UTILS
function hashBuffer(buf) {
  // sha256 hash of uploaded asset
  const h = crypto.createHash('sha256').update(buf).digest('hex');
  return h;
}

function makeCenturioId() {
  // Ex: CEN-0x + first 8 of uuid
  const raw = uuidv4().replace(/-/g, '');
  return `CEN-0x${raw.slice(0, 8).toUpperCase()}`;
}

// SERVICE: generateOverlay
// overlays the Centurio Gold Check badge (from ./centurio-logos/gold_check_badge_centurio.png)
// onto the submitted image. badge ~20% of canvas on bottom-right.

async function generateOverlay(userBuffer) {
  // load the official Centurio badge asset (final badge with 'CENTURIO' text)
  const badgePath = path.resolve(__dirname, 'centurio-logos/gold_check_badge_centurio.png');
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
// writes a metadata json for public viewing, and appends to registry.
// In production you'd pin this to IPFS or Arweave + mint NFT.

async function mintMetadata({
  baseUrl,
  centurioId,
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
    centurio_id: centurioId,
    creator_wallet: walletAddress || null,
    original_file_hash: fileHash,
    verification_status: "verified",
    issued_by: issuerName,
    contact: issuerEmail,
    timestamp,
    stamped_asset_url: `${baseUrl}/verify/${stampedFilename}`,
    public_metadata_url: `${baseUrl}/verify-json/${centurioId}.json`,
    disclaimer:
      "Centurio provides blockchain proof-of-first-use and authenticity signaling. It is not a substitute for copyright, trademark, securities compliance, or fraud review by any regulator or marketplace."
  };

  const publicMetaPath = path.resolve(publicDir, `${centurioId}.json`);
  fs.writeFileSync(publicMetaPath, JSON.stringify(record, null, 2), 'utf8');

  registry.push(record);
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');

  return record;
}

// ROUTER: /api/verify/upload
// expects multipart/form-data with field 'asset' and optional 'wallet'

async function buildAppAndRouter() {
  require('dotenv').config();

  const app = express();
  app.use(express.json());

  const upload = multer({ storage: multer.memoryStorage() });

  const PUBLIC_DIR = process.env.PUBLIC_DIR || 'api/data/verified';
  const PRIVATE_DIR = process.env.PRIVATE_DIR || 'api/data/proofs';
  const REGISTRY_PATH = process.env.REGISTRY_PATH || 'api/data/registry.json';
  const BASE_URL = process.env.BASE_URL || 'https://centurio.app';
  const ISSUER_NAME = process.env.ISSUER_NAME || 'Cooperanth Consulting LLC';
  const ISSUER_EMAIL = process.env.ISSUER_EMAIL || 'info@cooperanth.com';

  // static hosting of verified images + metadata json
  app.use('/verify', express.static(path.resolve(PUBLIC_DIR)));
  app.use('/verify-json', express.static(path.resolve(PUBLIC_DIR)));

  // core route
  app.post('/api/verify/upload', upload.single('asset'), async (req, res) => {
    try {
      const walletAddress = req.body.wallet || null;

      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'No asset uploaded' });
      }

      // 1. hash original
      const fileHash = hashBuffer(req.file.buffer);

      // 2. create ID + timestamp
      const centurioId = makeCenturioId();
      const timestamp = new Date().toISOString();

      // 3. save original privately
      await fse.ensureDir(PRIVATE_DIR);
      const originalFilename = `${centurioId}_original.png`;
      fs.writeFileSync(
        path.join(PRIVATE_DIR, originalFilename),
        req.file.buffer
      );

      // 4. generate stamped overlay
      const stampedBuffer = await generateOverlay(req.file.buffer);

      // 5. save stamped publicly
      await fse.ensureDir(PUBLIC_DIR);
      const stampedFilename = `${centurioId}.png`;
      fs.writeFileSync(
        path.join(PUBLIC_DIR, stampedFilename),
        stampedBuffer
      );

      // 6. metadata
      const record = await mintMetadata({
        baseUrl: BASE_URL,
        centurioId,
        walletAddress,
        fileHash,
        timestamp,
        stampedFilename,
        issuerName: ISSUER_NAME,
        issuerEmail: ISSUER_EMAIL,
        registryPath: REGISTRY_PATH,
        publicDir: PUBLIC_DIR
      });

      // 7. response
      return res.json({
        status: "ok",
        centurio_id: centurioId,
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

  // run server (for direct node usage)
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Centurio Verification API running on :${PORT}`);
  });

  return app;
}

// Export for Node require()
module.exports = {
  ENV_SAMPLE,
  CNTRO_METADATA,
  CENTS_METADATA,
  CENTURIO_LICENSE,
  PACKAGE_JSON_REFERENCE,
  buildAppAndRouter
};
