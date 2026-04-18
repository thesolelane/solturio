import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import { sha256Hex } from "../lib/hash";
import { encryptAesGcm } from "../lib/crypto-aes";
import { hybridContextHash, hybridId } from "../lib/hybrid";
import { storage } from "../storage";
import type { MasterAccessResponse } from "@shared/schema";
import { env, requireEnv } from "../env";

const upload = multer({ storage: multer.memoryStorage() });
export const musicRouter = Router();

// Signed URL tokens for master access (in-memory for v1)
// Tokens are valid for TTL and allow multiple requests from same user
const accessTokens = new Map<
  string,
  {
    trackId: string;
    userId: string;
    expiresAt: number;
  }
>();

// Generate short-lived signed access token (5 minutes default)
function generateAccessToken(trackId: string, userId: string, ttlSeconds = 300): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + ttlSeconds * 1000;
  accessTokens.set(token, { trackId, userId, expiresAt });
  return token;
}

// Validate access token (allows multiple uses within TTL for range requests)
function validateAccessToken(token: string, trackId: string, userId: string): boolean {
  const entry = accessTokens.get(token);
  if (!entry) return false;
  if (entry.trackId !== trackId) return false;
  if (entry.userId !== userId) return false;

  // Check if expired
  if (Date.now() > entry.expiresAt) {
    accessTokens.delete(token);
    return false;
  }

  return true;
}

// Cleanup expired tokens periodically
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(accessTokens.entries());
  for (const [token, entry] of entries) {
    if (now > entry.expiresAt) {
      accessTokens.delete(token);
    }
  }
}, 60000);

musicRouter.post("/upload", upload.single("file"), async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const file = req.file;
  if (!file) return res.status(400).json({ error: "missing file" });

  const { collectionId, title, mode, releaseType, releaseTitle, trackNumber } = req.body;

  const audioHash = sha256Hex(file.buffer);

  const context =
    mode === "part_of_release"
      ? `${releaseType}:${releaseTitle}:${trackNumber ?? "1"}`
      : `SINGLE_STANDALONE:${title}`;

  const contextHash = hybridContextHash(audioHash, context);

  const previewBuf = file.buffer;

  const masterKey = Buffer.from(
    requireEnv("MUSIC_MASTER_KEK", env.musicMasterKek),
    "hex"
  ).subarray(0, 32);
  const { iv, enc, tag } = encryptAesGcm(file.buffer, masterKey);
  const encryptedMaster = Buffer.concat([iv, tag, enc]);

  const previewHash = sha256Hex(previewBuf);
  const encryptedHash = sha256Hex(encryptedMaster);

  const previewUri = "ar://PREVIEW_TX";
  const audioEncryptedUri = "ar://ENCRYPTED_TX";
  const manifestUri = "ar://MANIFEST_TX";

  return res.json({
    ok: true,
    audioHash,
    contextHash,
    previewHash,
    encryptedHash,
    previewUri,
    audioEncryptedUri,
    manifestUri,
  });
});

// ============================================
// MASTER ACCESS - License-gated playback
// ============================================

/**
 * Check if user has license to access master audio
 *
 * v1 DB Flow:
 * 1. Track owner always has access to their own tracks
 * 2. Check license_contracts for ACTIVE license where:
 *    - assetId matches the track's asset ID (hybridId format)
 *    - licensee is the requesting user
 *    - status = 'active'
 *
 * For testing: Set STUB_LICENSED=true env var to bypass license check
 */
async function checkMasterLicense(userId: string, trackId: string): Promise<boolean> {
  // Test mode: bypass license check
  if (env.stubLicensed) {
    return true;
  }

  // For music tracks, the assetId in license_contracts uses the hybridId format
  // which combines audioHash and context. For now, we use trackId as assetId.
  // TODO: Map trackId to actual assetId when track storage is implemented
  const assetId = trackId;

  // Check for active license in database
  const license = await storage.getActiveLicenseForUserAndAsset(userId, assetId);

  return !!license;
}

musicRouter.get("/tracks/:id/master-access", async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({
      authorized: false,
      reason: "Authentication required",
    } as MasterAccessResponse);
  }

  const trackId = req.params.id;

  // Check license using stub function (ready for future implementation)
  const isLicensed = await checkMasterLicense(userId, trackId);

  if (!isLicensed) {
    return res.json({
      authorized: false,
      reason:
        "License required to access master audio. Purchase a license to unlock full quality playback.",
    } as MasterAccessResponse);
  }

  // Generate short-lived access token (5 minutes)
  const token = generateAccessToken(trackId, userId, 300);
  const expiresAt = new Date(Date.now() + 300 * 1000).toISOString();

  return res.json({
    authorized: true,
    playbackUrl: `/api/music/tracks/${trackId}/stream?token=${token}`,
    expiresAt,
  } as MasterAccessResponse);
});

// Stream master audio (requires valid access token)
musicRouter.get("/tracks/:id/stream", async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const trackId = req.params.id;
  const token = req.query.token as string;

  if (!token || !validateAccessToken(token, trackId, userId)) {
    return res.status(403).json({ error: "Invalid or expired access token" });
  }

  // Token is validated - grace period allows subsequent range requests

  // When STUB_LICENSED is set, serve a test audio response
  // In production, this would fetch encrypted audio from Arweave and decrypt
  if (env.stubLicensed) {
    // Return a simple sine wave audio as test (generate minimal WAV header)
    // This is a 1-second 440Hz sine wave at 8000Hz sample rate, 8-bit mono
    const sampleRate = 8000;
    const duration = 1;
    const numSamples = sampleRate * duration;
    const dataSize = numSamples;
    const fileSize = 44 + dataSize;

    const buffer = Buffer.alloc(fileSize);

    // WAV header
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(fileSize - 8, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
    buffer.writeUInt16LE(1, 22); // NumChannels (Mono)
    buffer.writeUInt32LE(sampleRate, 24); // SampleRate
    buffer.writeUInt32LE(sampleRate, 28); // ByteRate
    buffer.writeUInt16LE(1, 32); // BlockAlign
    buffer.writeUInt16LE(8, 34); // BitsPerSample
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Generate 440Hz sine wave
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * 440 * t);
      buffer.writeUInt8(Math.round((sample + 1) * 127.5), 44 + i);
    }

    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Length", fileSize);
    res.setHeader("Cache-Control", "no-store");
    return res.send(buffer);
  }

  // Production: Fetch encrypted audio from Arweave, decrypt with MUSIC_MASTER_KEK
  return res.status(501).json({
    error: "Master streaming not yet implemented - awaiting Arweave integration",
  });
});
