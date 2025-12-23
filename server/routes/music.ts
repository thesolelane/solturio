import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import { sha256Hex } from "../lib/hash";
import { encryptAesGcm } from "../lib/crypto-aes";
import { hybridContextHash, hybridId } from "../lib/hybrid";
import type { MasterAccessResponse } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });
export const musicRouter = Router();

// Signed URL tokens for master access (in-memory for v1)
const accessTokens = new Map<string, { trackId: string; userId: string; expiresAt: number }>();

// Generate short-lived signed access token
function generateAccessToken(trackId: string, userId: string, ttlSeconds = 300): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + ttlSeconds * 1000;
  accessTokens.set(token, { trackId, userId, expiresAt });
  return token;
}

// Validate and consume access token
function validateAccessToken(token: string, trackId: string): boolean {
  const entry = accessTokens.get(token);
  if (!entry) return false;
  if (entry.trackId !== trackId) return false;
  if (Date.now() > entry.expiresAt) {
    accessTokens.delete(token);
    return false;
  }
  return true;
}

// Cleanup expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of accessTokens.entries()) {
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

  const {
    collectionId,
    title,
    mode,
    releaseType,
    releaseTitle,
    trackNumber,
  } = req.body;

  const audioHash = sha256Hex(file.buffer);

  const context =
    mode === "part_of_release"
      ? `${releaseType}:${releaseTitle}:${trackNumber ?? "1"}`
      : `SINGLE_STANDALONE:${title}`;

  const contextHash = hybridContextHash(audioHash, context);

  const previewBuf = file.buffer;

  const masterKey = Buffer.from(process.env.MUSIC_MASTER_KEK!, "hex").subarray(0, 32);
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

// Check if user has license to access master audio
// v1: Stub with isLicensed = false (no music licensing yet)
musicRouter.get("/tracks/:id/master-access", async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) {
    return res.status(401).json({ 
      authorized: false, 
      reason: "Authentication required" 
    } as MasterAccessResponse);
  }

  const trackId = req.params.id;
  
  // TODO: Replace with actual license check from license_contracts table
  // For v1, stub as unlicensed
  const isLicensed = false;
  
  if (!isLicensed) {
    return res.json({
      authorized: false,
      reason: "License required to access master audio. Purchase a license to unlock full quality playback."
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
  const trackId = req.params.id;
  const token = req.query.token as string;
  
  if (!token || !validateAccessToken(token, trackId)) {
    return res.status(403).json({ error: "Invalid or expired access token" });
  }
  
  // TODO: Fetch encrypted audio from Arweave, decrypt with MUSIC_MASTER_KEK
  // For now, return placeholder response
  return res.status(501).json({ 
    error: "Master streaming not yet implemented - awaiting Arweave integration" 
  });
});
