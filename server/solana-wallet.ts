import { Keypair } from "@solana/web3.js";
import crypto from "crypto";

// Require strong encryption key - fail if not set
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || process.env.SESSION_SECRET;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  console.error(
    "CRITICAL: WALLET_ENCRYPTION_KEY or SESSION_SECRET must be set and at least 32 characters"
  );
  console.error(
    "For development, SESSION_SECRET should be sufficient. For production, set a dedicated WALLET_ENCRYPTION_KEY."
  );
  // In development, allow SESSION_SECRET. In production, this should fail hard.
  if (process.env.NODE_ENV === "production") {
    throw new Error("WALLET_ENCRYPTION_KEY must be set in production");
  }
}

const ALGORITHM = "aes-256-gcm";

export interface SolanaWallet {
  publicKey: string;
  encryptedPrivateKey: string;
}

export function generateSolanaWallet(): SolanaWallet {
  const keypair = Keypair.generate();

  const publicKey = keypair.publicKey.toBase58();
  const privateKeyArray = Array.from(keypair.secretKey);
  const privateKeyJson = JSON.stringify(privateKeyArray);

  const encryptedPrivateKey = encryptPrivateKey(privateKeyJson);

  return {
    publicKey,
    encryptedPrivateKey,
  };
}

export function encryptPrivateKey(privateKey: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error("Cannot encrypt: WALLET_ENCRYPTION_KEY not configured");
  }

  // Generate unique random salt for this wallet (32 bytes)
  const salt = crypto.randomBytes(32);

  // Generate random IV (16 bytes for AES)
  const iv = crypto.randomBytes(16);

  // Derive key using scrypt with unique salt
  const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Store: salt:iv:authTag:encrypted (all hex-encoded)
  return `${salt.toString("hex")}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptPrivateKey(encryptedData: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error("Cannot decrypt: WALLET_ENCRYPTION_KEY not configured");
  }

  const parts = encryptedData.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted data format");
  }

  const salt = Buffer.from(parts[0], "hex");
  const iv = Buffer.from(parts[1], "hex");
  const authTag = Buffer.from(parts[2], "hex");
  const encrypted = parts[3];

  // Derive key using the same salt that was used for encryption
  const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: 16 });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export function formatPrivateKeyForPhantom(encryptedPrivateKey: string): number[] {
  const decrypted = decryptPrivateKey(encryptedPrivateKey);
  return JSON.parse(decrypted);
}
