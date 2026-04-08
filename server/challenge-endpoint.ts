/**
 * Challenge-Response Endpoints for Security Ceremony
 */

import { Router } from "express";
import { isAuthenticated } from "./replitAuth";
import { generateChallenge, verifyChallengeSignature } from "./security-ceremony";
import { formatSuccess, formatError } from "./error-handler";

export const challengeRouter = Router();

/**
 * GET CHALLENGE
 * GET /api/security/challenge
 * Returns a challenge for user to sign
 */
challengeRouter.get("/security/challenge", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const challenge = generateChallenge(userId);

    return res.json(
      formatSuccess({
        challenge,
        message: "Sign this challenge with your wallet private key",
        expiresIn: 300, // 5 minutes
      })
    );
  } catch (error: any) {
    res.status(500).json(formatError(error));
  }
});

/**
 * VERIFY CHALLENGE
 * POST /api/security/verify-challenge
 * Verify signed challenge (internal use)
 */
challengeRouter.post("/security/verify-challenge", isAuthenticated, async (req: any, res) => {
  try {
    const { challenge, signature } = req.body;
    const userPublicKey = req.user.solanaPublicKey;

    if (!challenge || !signature) {
      return res.status(400).json({
        success: false,
        error: "Challenge and signature required",
      });
    }

    const valid = verifyChallengeSignature(challenge, signature, userPublicKey);

    if (!valid) {
      return res.status(401).json({
        success: false,
        error: "Challenge verification failed",
      });
    }

    return res.json(
      formatSuccess({
        verified: true,
        message: "Challenge verified successfully",
      })
    );
  } catch (error: any) {
    res.status(500).json(formatError(error));
  }
});
