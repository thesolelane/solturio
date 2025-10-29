import { Keypair } from "@solana/web3.js";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || process.env.SESSION_SECRET || "default-encryption-key-change-me";
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
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptPrivateKey(encryptedData: string): string {
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }
  
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

export function formatPrivateKeyForPhantom(encryptedPrivateKey: string): number[] {
  const decrypted = decryptPrivateKey(encryptedPrivateKey);
  return JSON.parse(decrypted);
}
