import { Router } from "express";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { type AppResponse, type AuthenticatedRequest } from "./http-types";

export const quizRouter = Router();

quizRouter.get("/quiz/questions", async (req, res) => {
  try {
    const { category, points } = req.query;
    const questions = await storage.getQuizQuestions(
      category as string | undefined,
      points ? Number(points) : undefined
    );
    res.json(questions);
  } catch (error) {
    console.error("Error fetching quiz questions:", error);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

quizRouter.get(
  "/quiz/stats",
  isAuthenticated,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const stats = await storage.getQuizStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching quiz stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  }
);

quizRouter.post(
  "/quiz/answer",
  isAuthenticated,
  async (req: AuthenticatedRequest, res: AppResponse) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { questionId, answer, timeToAnswer, hintUsed, originalPoints } = req.body;

      const result = await storage.submitQuizAnswer(userId, {
        questionId,
        answer,
        timeToAnswer,
        hintUsed,
        originalPoints,
      });

      res.json(result);
    } catch (error) {
      console.error("Error submitting quiz answer:", error);
      res.status(500).json({ error: "Failed to submit answer" });
    }
  }
);

quizRouter.post("/quiz/seed", async (req, res) => {
  try {
    const { sampleQuestions, foreignIpQuestions } = await import("./seed-quiz-questions");
    const allQuestions = [...sampleQuestions, ...foreignIpQuestions];
    await storage.createQuizQuestions(allQuestions);
    res.json({ message: `Successfully seeded ${allQuestions.length} quiz questions` });
  } catch (error) {
    console.error("Error seeding quiz questions:", error);
    res.status(500).json({ error: "Failed to seed questions" });
  }
});
