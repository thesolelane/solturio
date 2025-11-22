/**
 * Security Ceremony Module
 * - Challenge-response for sensitive operations
 * - Signature verification
 */

import { randomBytes } from "crypto";
import { Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

// In-memory store for challenges (use DB in production)
const activeChallenges = new Map<string, { userId: string; challenge: string; timestamp: number }>();
const CHALLENGE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function generateChallenge(userId: string): string {
  // Generate random challenge
  const challenge = randomBytes(32).toString("hex");
  
  // Store challenge
  activeChallenges.set(challenge, {
    userId,
    challenge,
    timestamp: Date.now(),
  });

  // Clean old challenges
  for (const [key, value] of activeChallenges) {
    if (Date.now() - value.timestamp > CHALLENGE_TIMEOUT) {
      activeChallenges.delete(key);
    }
  }

  return challenge;
}

export function verifyChallengeSignature(
  challenge: string,
  signature: string,
  userPublicKey: string
): boolean {
  try {
    // Check if challenge exists and is valid
    const entry = activeChallenges.get(challenge);
    if (!entry) return false;

    // Check if challenge hasn't expired
    if (Date.now() - entry.timestamp > CHALLENGE_TIMEOUT) {
      activeChallenges.delete(challenge);
      return false;
    }

    // Verify signature
    const signatureBytes = Buffer.from(signature, "hex");
    const challengeBytes = Buffer.from(challenge, "hex");
    const publicKeyBytes = new PublicKey(userPublicKey).toBytes();

    const valid = nacl.sign.detached.verify(
      challengeBytes,
      signatureBytes,
      publicKeyBytes
    );

    // Delete challenge after use (one-time)
    activeChallenges.delete(challenge);

    return valid;
  } catch (error) {
    return false;
  }
}
