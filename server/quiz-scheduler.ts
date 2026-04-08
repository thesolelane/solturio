import cron, { ScheduledTask } from "node-cron";
import { quizBot } from "./telegram-bot";

/**
 * Solturio Quiz Scheduler
 * Runs IP quiz sessions:
 * - 8:00 AM - 10:00 AM
 * - 12:00 PM - 2:00 PM
 *
 * Posts daily leaderboard at 2:01 PM
 */

const QUIZ_CHAT_ID = process.env.TELEGRAM_QUIZ_CHAT_ID || "";

class QuizScheduler {
  private morningAnnouncementJob: ScheduledTask | null = null;
  private morningStartJob: ScheduledTask | null = null;
  private morningEndJob: ScheduledTask | null = null;
  private afternoonAnnouncementJob: ScheduledTask | null = null;
  private afternoonStartJob: ScheduledTask | null = null;
  private afternoonEndJob: ScheduledTask | null = null;
  private dailyLeaderboardJob: ScheduledTask | null = null;

  constructor() {
    this.setupSchedule();
  }

  private setupSchedule() {
    if (!QUIZ_CHAT_ID) {
      console.warn("⚠️  TELEGRAM_QUIZ_CHAT_ID not set - bot will not auto-schedule");
      console.log("   Use /quiz command in your group to start manually");
      return;
    }

    // Morning announcement: 7:55 AM (5 minutes before)
    this.morningAnnouncementJob = cron.schedule(
      "55 7 * * *",
      async () => {
        console.log("📢 Sending morning quiz announcement (7:55 AM)");
        await quizBot.sendAnnouncement(QUIZ_CHAT_ID, "morning");
      },
      {
        timezone: "America/New_York",
      }
    );

    // Morning session: 8:00 AM - 10:00 AM
    this.morningStartJob = cron.schedule(
      "0 8 * * *",
      async () => {
        console.log("🌅 Starting morning quiz session (8 AM)");
        await quizBot.startQuizSession(QUIZ_CHAT_ID);
      },
      {
        timezone: "America/New_York",
      }
    );

    this.morningEndJob = cron.schedule(
      "0 10 * * *",
      async () => {
        console.log("🌅 Ending morning quiz session (10 AM)");
        await quizBot.stopQuizSession();
      },
      {
        timezone: "America/New_York",
      }
    );

    // Afternoon announcement: 11:55 AM (5 minutes before)
    this.afternoonAnnouncementJob = cron.schedule(
      "55 11 * * *",
      async () => {
        console.log("📢 Sending afternoon quiz announcement (11:55 AM)");
        await quizBot.sendAnnouncement(QUIZ_CHAT_ID, "afternoon");
      },
      {
        timezone: "America/New_York",
      }
    );

    // Afternoon session: 12:00 PM - 2:00 PM
    this.afternoonStartJob = cron.schedule(
      "0 12 * * *",
      async () => {
        console.log("☀️  Starting afternoon quiz session (12 PM)");
        await quizBot.startQuizSession(QUIZ_CHAT_ID);
      },
      {
        timezone: "America/New_York",
      }
    );

    this.afternoonEndJob = cron.schedule(
      "0 14 * * *",
      async () => {
        console.log("☀️  Ending afternoon quiz session (2 PM)");
        await quizBot.stopQuizSession();
      },
      {
        timezone: "America/New_York",
      }
    );

    // Daily leaderboard: 2:01 PM
    this.dailyLeaderboardJob = cron.schedule(
      "1 14 * * *",
      async () => {
        console.log("📊 Posting daily leaderboard");
        await quizBot.postDailyLeaderboard(QUIZ_CHAT_ID);
      },
      {
        timezone: "America/New_York",
      }
    );

    console.log("📅 Quiz scheduler initialized");
    console.log("   Morning announcement: 7:55 AM");
    console.log("   Morning session: 8:00 AM - 10:00 AM");
    console.log("   Afternoon announcement: 11:55 AM");
    console.log("   Afternoon session: 12:00 PM - 2:00 PM");
    console.log("   Daily leaderboard: 2:01 PM");
    console.log(`   Target chat: ${QUIZ_CHAT_ID}`);
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    this.morningAnnouncementJob?.start();
    this.morningStartJob?.start();
    this.morningEndJob?.start();
    this.afternoonAnnouncementJob?.start();
    this.afternoonStartJob?.start();
    this.afternoonEndJob?.start();
    this.dailyLeaderboardJob?.start();
    console.log("✅ Quiz scheduler started");
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    this.morningAnnouncementJob?.stop();
    this.morningStartJob?.stop();
    this.morningEndJob?.stop();
    this.afternoonAnnouncementJob?.stop();
    this.afternoonStartJob?.stop();
    this.afternoonEndJob?.stop();
    this.dailyLeaderboardJob?.stop();
    console.log("🛑 Quiz scheduler stopped");
  }

  /**
   * Check if currently in quiz hours
   */
  isQuizTime(): boolean {
    const now = new Date();
    const hour = now.getHours();

    // 8-10 AM or 12-2 PM (14:00 in 24-hour format)
    return (hour >= 8 && hour < 10) || (hour >= 12 && hour < 14);
  }
}

export const quizScheduler = new QuizScheduler();
