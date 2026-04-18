import { Router } from "express";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { env } from "./env";

export const visitorRouter = Router();

visitorRouter.post("/visitor/register", async (req, res) => {
  try {
    const { email, marketingOptIn } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    const existing = await storage.getVisitorAccountByEmail(email);
    if (existing) {
      if (existing.emailVerified) {
        return res.status(400).json({ error: "This email is already registered. Please login." });
      } else {
        return res.json({
          message: "Verification email resent",
          visitorId: existing.id,
          requiresVerification: true,
        });
      }
    }

    const visitor = await storage.createVisitorAccount(email, marketingOptIn || false);

    if (!env.isProduction) {
      await storage.verifyVisitorEmail(visitor.verificationToken!);
    }

    res.json({
      message: "Account created successfully",
      visitorId: visitor.id,
      requiresVerification: env.isProduction,
      ...(!env.isProduction && {
        verificationToken: visitor.verificationToken,
      }),
    });
  } catch (error) {
    console.error("Error registering visitor:", error);
    res.status(500).json({ error: "Failed to register visitor" });
  }
});

visitorRouter.get("/visitor/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const visitor = await storage.verifyVisitorEmail(token);
    if (!visitor) {
      return res.status(400).json({ error: "Invalid or expired verification token" });
    }

    res.json({
      message: "Email verified successfully",
      visitorId: visitor.id,
      email: visitor.email,
    });
  } catch (error) {
    console.error("Error verifying visitor email:", error);
    res.status(500).json({ error: "Failed to verify email" });
  }
});

visitorRouter.post("/visitor/login", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const visitor = await storage.getVisitorAccountByEmail(email);
    if (!visitor) {
      return res.status(404).json({ error: "Visitor not found. Please register first." });
    }

    if (!visitor.emailVerified) {
      return res.status(403).json({ error: "Please verify your email first" });
    }

    if (visitor.convertedToUserId) {
      return res.status(400).json({
        error: "This email has been upgraded to a full account. Please use Replit Auth to login.",
      });
    }

    const updated = await storage.updateVisitorLastLogin(visitor.id);

    res.json({
      visitorId: updated.id,
      email: updated.email,
      sessionToken: updated.newSessionToken,
      pendingSoltRewards: updated.pendingSoltRewards,
      rewardsExpireAt: updated.rewardsExpireAt,
    });
  } catch (error) {
    console.error("Error logging in visitor:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

visitorRouter.get("/visitor/:visitorId", async (req, res) => {
  try {
    const { visitorId } = req.params;

    const visitor = await storage.getVisitorAccountById(visitorId);
    if (!visitor) {
      return res.status(404).json({ error: "Visitor not found" });
    }

    const stats = await storage.getVisitorQuizStats(visitorId);

    res.json({
      id: visitor.id,
      email: visitor.email,
      emailVerified: visitor.emailVerified,
      createdAt: visitor.createdAt,
      lastLoginAt: visitor.lastLoginAt,
      stats,
    });
  } catch (error) {
    console.error("Error fetching visitor profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

visitorRouter.post("/visitor/:visitorId/quiz/answer", async (req, res) => {
  try {
    const { visitorId } = req.params;
    const { questionId, answer, timeToAnswer, hintUsed, sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(401).json({ error: "Session token required. Please login first." });
    }

    const isValidSession = await storage.verifyVisitorSessionToken(visitorId, sessionToken);
    if (!isValidSession) {
      return res.status(401).json({ error: "Invalid or expired session. Please login again." });
    }

    const visitor = await storage.getVisitorAccountById(visitorId);
    if (!visitor) {
      return res.status(404).json({ error: "Visitor not found" });
    }

    if (!visitor.emailVerified) {
      return res.status(403).json({ error: "Please verify your email first" });
    }

    const result = await storage.submitVisitorQuizAnswer(visitorId, {
      questionId,
      answer,
      timeToAnswer,
      hintUsed,
    });

    res.json(result);
  } catch (error) {
    console.error("Error submitting visitor quiz answer:", error);
    res.status(500).json({ error: "Failed to submit answer" });
  }
});

visitorRouter.get("/visitor/:visitorId/quiz/stats", async (req, res) => {
  try {
    const { visitorId } = req.params;

    const stats = await storage.getVisitorQuizStats(visitorId);
    if (!stats) {
      return res.status(404).json({ error: "Visitor not found" });
    }

    res.json(stats);
  } catch (error) {
    console.error("Error fetching visitor quiz stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

visitorRouter.post("/visitor/convert", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { visitorId } = req.body;

    if (!visitorId) {
      return res.status(400).json({ error: "Visitor ID is required" });
    }

    const visitor = await storage.getVisitorAccountById(visitorId);
    if (!visitor) {
      return res.status(404).json({ error: "Visitor not found" });
    }

    const result = await storage.convertVisitorToUser(visitorId, userId);

    res.json({
      message: result.transferred
        ? `Successfully transferred ${result.soltRewards} $SOLT and ${result.gamePoints} Game Points to your account!`
        : "Account upgraded, but pending rewards had expired.",
      ...result,
    });
  } catch (error) {
    console.error("Error converting visitor to user:", error);
    res.status(500).json({ error: "Failed to convert account" });
  }
});

visitorRouter.post("/visitor/cleanup-expired", async (req, res) => {
  try {
    const count = await storage.checkExpiredVisitorRewards();
    res.json({ message: `Cleaned up ${count} expired visitor reward records` });
  } catch (error) {
    console.error("Error cleaning up expired rewards:", error);
    res.status(500).json({ error: "Failed to cleanup" });
  }
});
