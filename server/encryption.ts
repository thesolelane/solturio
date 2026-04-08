import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-cbc";

function getEncryptionKey(): Buffer {
  const rawKey = process.env.SECRETS_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY environment variable is not set. " +
        "Generate a 64-char hex key with: openssl rand -hex 32"
    );
  }
  const keyHex = rawKey.trim();
  if (keyHex.length !== 64) {
    throw new Error(
      `SECRETS_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes), ` +
        `got ${keyHex.length} characters.`
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY contains invalid characters. It must be a 64-character hex string " +
        "(characters 0-9 and a-f only). Generate one with: openssl rand -hex 32"
    );
  }
  return Buffer.from(keyHex, "hex");
}

export function encrypt(plaintext: string): { encryptedValue: string; iv: string } {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    encryptedValue: encrypted.toString("hex"),
    iv: iv.toString("hex"),
  };
}

export function decrypt(encryptedValue: string, iv: string): string {
  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
