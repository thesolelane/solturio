import { Keypair } from "@solana/web3.js";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { randomBytes, createCipheriv, createDecipheriv, scrypt } from "crypto";
import { promisify } from "util";
import { env } from "./env";

const scryptAsync = promisify(scrypt);

export interface WalletGenerationResult {
  mnemonic: string;
  publicKey: string;
  encryptedPrivateKey: string;
  encryptedMnemonic: string;
  salt: string;
  walletType: "standard" | "premium";
  walletName: string;
}

export interface WalletConfig {
  walletType: "standard" | "premium";
  customName?: string;
  accountNumber?: number;
}

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'";

export async function generateSolanaWallet(config: WalletConfig): Promise<WalletGenerationResult> {
  const mnemonic = bip39.generateMnemonic(128);
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const derivedSeed = derivePath(SOLANA_DERIVATION_PATH, seed.toString("hex")).key;
  const keypair = Keypair.fromSeed(derivedSeed);

  const publicKey = keypair.publicKey.toBase58();
  const privateKeyBytes = keypair.secretKey;

  const salt = randomBytes(SALT_LENGTH).toString("hex");

  const encryptedPrivateKey = await encryptData(Buffer.from(privateKeyBytes).toString("hex"), salt);

  const encryptedMnemonic = await encryptData(mnemonic, salt);

  const walletName = generateWalletName(config);

  return {
    mnemonic,
    publicKey,
    encryptedPrivateKey,
    encryptedMnemonic,
    salt,
    walletType: config.walletType,
    walletName,
  };
}

function getMasterEncryptionKey(): string {
  const masterKey = env.walletEncryptionKey;

  if (!masterKey || masterKey.length < 32) {
    throw new Error(
      "CRITICAL: WALLET_ENCRYPTION_KEY environment variable must be set with at least 32 characters. " +
        "This master key protects all wallet private keys and recovery phrases. " +
        "NEVER commit this key to version control!"
    );
  }

  return masterKey;
}

async function encryptData(data: string, salt: string): Promise<string> {
  const iv = randomBytes(IV_LENGTH);

  const masterKey = getMasterEncryptionKey();

  const combinedSalt = `${masterKey}:${salt}`;

  const key = (await scryptAsync(combinedSalt, "solturio-v1", 32)) as Buffer;

  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
}

export async function decryptData(encryptedData: string, salt: string): Promise<string> {
  const [ivHex, encrypted, authTagHex] = encryptedData.split(":");

  if (!ivHex || !encrypted || !authTagHex) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid authentication tag length");
  }

  const masterKey = getMasterEncryptionKey();
  const combinedSalt = `${masterKey}:${salt}`;

  const key = (await scryptAsync(combinedSalt, "solturio-v1", 32)) as Buffer;

  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

function generateWalletName(config: WalletConfig): string {
  if (config.walletType === "premium") {
    if (!config.customName || config.customName.length < 3 || config.customName.length > 32) {
      throw new Error("Premium wallet custom name must be 3-32 alphanumeric characters");
    }

    const cleanName = config.customName.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanName.length < 3) {
      throw new Error("Custom name must contain at least 3 alphanumeric characters");
    }

    return `${cleanName}.solturio.sol`;
  }

  if (!config.accountNumber || config.accountNumber < 1) {
    throw new Error("Standard wallet requires account number");
  }

  const paddedNumber = config.accountNumber.toString().padStart(3, "0");
  return `${paddedNumber}.solturio.sol`;
}

export function getNextAccountNumber(existingWallets: string[]): number {
  const standardWallets = existingWallets
    .filter((name) => /^\d{3}\.solturio\.sol$/.test(name))
    .map((name) => parseInt(name.split(".")[0], 10));

  if (standardWallets.length === 0) {
    return 1;
  }

  return Math.max(...standardWallets) + 1;
}

export function validateCustomName(customName: string): boolean {
  if (!customName || customName.length < 3 || customName.length > 32) {
    return false;
  }

  const cleanName = customName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleanName.length >= 3;
}

export function isWalletNameTaken(walletName: string, existingWallets: string[]): boolean {
  const normalizedName = walletName.toLowerCase();
  return existingWallets.some((name) => name.toLowerCase() === normalizedName);
}

export async function getPrivateKeyFromEncrypted(
  encryptedPrivateKey: string,
  salt: string
): Promise<Keypair> {
  const privateKeyHex = await decryptData(encryptedPrivateKey, salt);
  const privateKeyBytes = Buffer.from(privateKeyHex, "hex");
  return Keypair.fromSecretKey(privateKeyBytes);
}
