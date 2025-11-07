import { Telegraf, Context, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { db } from './db';
import { quizQuestions, quizAttempts, telegramLeaderboard } from '../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is not set in environment variables');
}

interface QuizSession {
  questionId: string;
  question: string;
  correctAnswer: string;
  allAnswers: string[];
  points: number;
  startTime: number;
  messageId?: number;
  timerInterval?: NodeJS.Timeout;
  currentTimeLeft: number;
}

class SolturioQuizBot {
  private bot: Telegraf | null = null;
  private currentSession: QuizSession | null = null;
  private isActive: boolean = false;
  private cooldownTimeout: NodeJS.Timeout | null = null;
  private chatId: string | null = null; // Target group chat ID

  constructor() {
    if (!BOT_TOKEN) {
      console.warn('Telegram bot not initialized: Missing TELEGRAM_BOT_TOKEN');
      return;
    }

    this.bot = new Telegraf(BOT_TOKEN);
    this.setupHandlers();
  }

  private setupHandlers() {
    if (!this.bot) return;

    // Start command - for group admins to configure bot
    this.bot.command('start', async (ctx) => {
      await ctx.reply(
        '🎓 *Solturio IP Quiz Bot*\n\n' +
        'This bot runs IP education quizzes with rewards!\n\n' +
        '*Commands:*\n' +
        '/quiz - Start a quiz session\n' +
        '/leaderboard - Show current standings\n' +
        '/mystats - View your quiz statistics\n\n' +
        '*Schedule:* 8-10 AM & 12-2 PM daily\n' +
        '*Scoring:* Faster answers earn more points!\n' +
        '• 60-51 sec: 100% points\n' +
        '• 50-41 sec: 90% points\n' +
        '• 40-31 sec: 80% points\n' +
        '• 30-21 sec: 70% points\n' +
        '• 20-11 sec: 60% points\n' +
        '• 10-1 sec: 50% points',
        { parse_mode: 'Markdown' }
      );
    });

    // Manual quiz start (for testing)
    this.bot.command('quiz', async (ctx) => {
      if (this.currentSession) {
        await ctx.reply('⏳ A quiz is already in progress! Answer the current question first.');
        return;
      }

      this.chatId = ctx.chat.id.toString();
      await this.postNextQuestion(ctx.chat.id);
    });

    // Leaderboard command
    this.bot.command('leaderboard', async (ctx) => {
      await this.showLeaderboard(ctx);
    });

    // Personal stats command
    this.bot.command('mystats', async (ctx) => {
      await this.showUserStats(ctx);
    });

    // Listen for answers
    this.bot.on(message('text'), async (ctx) => {
      // Only process if quiz is active and user is answering
      if (!this.currentSession || !ctx.from) return;

      const answer = ctx.message.text.trim();
      const userId = ctx.from.id.toString();
      const username = ctx.from.username || '';
      const firstName = ctx.from.first_name || 'Anonymous';

      // Check if answer matches any of the quiz options
      if (this.currentSession.allAnswers.includes(answer)) {
        await this.processAnswer(userId, username, firstName, answer, ctx);
      }
    });

    // Error handling
    this.bot.catch((err, ctx) => {
      console.error('Telegram bot error:', err);
    });
  }

  /**
   * Calculate points based on response time
   * 60-51 sec: 100% | 50-41: 90% | 40-31: 80% | 30-21: 70% | 20-11: 60% | 10-1: 50%
   */
  private calculatePoints(responseTimeSeconds: number, basePoints: number): number {
    if (responseTimeSeconds > 60 || responseTimeSeconds < 1) return 0;

    const timeRanges = [
      { max: 60, min: 51, multiplier: 1.0 },
      { max: 50, min: 41, multiplier: 0.9 },
      { max: 40, min: 31, multiplier: 0.8 },
      { max: 30, min: 21, multiplier: 0.7 },
      { max: 20, min: 11, multiplier: 0.6 },
      { max: 10, min: 1, multiplier: 0.5 },
    ];

    for (const range of timeRanges) {
      if (responseTimeSeconds <= range.max && responseTimeSeconds >= range.min) {
        return Math.floor(basePoints * range.multiplier);
      }
    }

    return 0;
  }

  /**
   * Process user's answer
   */
  private async processAnswer(
    userId: string,
    username: string,
    firstName: string,
    answer: string,
    ctx: Context
  ) {
    if (!this.currentSession) return;

    const responseTime = Math.floor((Date.now() - this.currentSession.startTime) / 1000);
    
    // Prevent duplicate answers from same user
    const existingAnswer = await db
      .select()
      .from(quizAttempts)
      .where(
        sql`${quizAttempts.questionId} = ${this.currentSession.questionId} 
            AND ${quizAttempts.telegramUserId} = ${userId}`
      )
      .limit(1);

    if (existingAnswer.length > 0) {
      return; // User already answered this question
    }

    const isCorrect = answer === this.currentSession.correctAnswer;
    const pointsEarned = isCorrect ? this.calculatePoints(responseTime, this.currentSession.points) : 0;

    // Save answer to database
    await db.insert(quizAttempts).values({
      questionId: this.currentSession.questionId,
      telegramUserId: userId,
      telegramUsername: username,
      telegramFirstName: firstName,
      userAnswer: answer,
      isCorrect,
      pointsEarned,
      questionPointValue: this.currentSession.points,
      timeToAnswer: responseTime,
    });

    // Update leaderboard
    await this.updateLeaderboard(userId, username, firstName, isCorrect, pointsEarned);

    // Send feedback
    if (isCorrect) {
      const percentageScore = Math.floor((pointsEarned / this.currentSession.points) * 100);
      await ctx.reply(
        `✅ *Correct!* @${username || firstName}\n` +
        `⚡ ${responseTime}s • 🎯 ${pointsEarned}/${this.currentSession.points} pts (${percentageScore}%)`,
        { parse_mode: 'Markdown' }
      );

      // End question and start cooldown
      await this.endQuestion(ctx.chat!.id);
    } else {
      await ctx.reply(
        `❌ *Wrong!* @${username || firstName}\n` +
        `The correct answer was: *${this.currentSession.correctAnswer}*`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Update user's leaderboard stats
   */
  private async updateLeaderboard(
    userId: string,
    username: string,
    firstName: string,
    isCorrect: boolean,
    pointsEarned: number
  ) {
    const existing = await db
      .select()
      .from(telegramLeaderboard)
      .where(eq(telegramLeaderboard.telegramUserId, userId))
      .limit(1);

    const now = new Date();

    if (existing.length === 0) {
      // Create new entry
      await db.insert(telegramLeaderboard).values({
        telegramUserId: userId,
        telegramUsername: username,
        telegramFirstName: firstName,
        totalQuestions: 1,
        correctAnswers: isCorrect ? 1 : 0,
        totalPoints: pointsEarned,
        dailyPoints: pointsEarned,
        dailyCorrectAnswers: isCorrect ? 1 : 0,
        dailyQuestionsAnswered: 1,
        lastDailyReset: now,
        streak: isCorrect ? 1 : 0,
        longestStreak: isCorrect ? 1 : 0,
        lastQuizAt: now,
      });
    } else {
      const user = existing[0];
      
      // Check if we need to reset daily stats (new day)
      const lastReset = user.lastDailyReset ? new Date(user.lastDailyReset) : now;
      const shouldResetDaily = now.toDateString() !== lastReset.toDateString();

      const newStreak = isCorrect ? (user.streak || 0) + 1 : 0;
      const newLongestStreak = Math.max(newStreak, user.longestStreak || 0);

      await db
        .update(telegramLeaderboard)
        .set({
          telegramUsername: username,
          telegramFirstName: firstName,
          totalQuestions: (user.totalQuestions || 0) + 1,
          correctAnswers: (user.correctAnswers || 0) + (isCorrect ? 1 : 0),
          totalPoints: (user.totalPoints || 0) + pointsEarned,
          dailyPoints: shouldResetDaily ? pointsEarned : (user.dailyPoints || 0) + pointsEarned,
          dailyCorrectAnswers: shouldResetDaily ? (isCorrect ? 1 : 0) : (user.dailyCorrectAnswers || 0) + (isCorrect ? 1 : 0),
          dailyQuestionsAnswered: shouldResetDaily ? 1 : (user.dailyQuestionsAnswered || 0) + 1,
          lastDailyReset: shouldResetDaily ? now : user.lastDailyReset,
          streak: newStreak,
          longestStreak: newLongestStreak,
          lastQuizAt: now,
          updatedAt: now,
        })
        .where(eq(telegramLeaderboard.telegramUserId, userId));
    }
  }

  /**
   * Post next quiz question
   */
  private async postNextQuestion(chatId: number) {
    // Get random active question
    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.isActive, true))
      .limit(50);

    if (questions.length === 0) {
      if (this.bot) {
        await this.bot.telegram.sendMessage(chatId, '❌ No quiz questions available!');
      }
      return;
    }

    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    
    // Prepare answer options
    const allAnswers = randomQuestion.options || [randomQuestion.answer];
    const shuffledAnswers = [...allAnswers].sort(() => Math.random() - 0.5);

    // Create session
    this.currentSession = {
      questionId: randomQuestion.id,
      question: randomQuestion.question,
      correctAnswer: randomQuestion.answer,
      allAnswers: shuffledAnswers,
      points: randomQuestion.points || 100,
      startTime: Date.now(),
      currentTimeLeft: 60,
    };

    // Create buttons for answers
    const buttons = shuffledAnswers.map(answer => 
      Markup.button.callback(answer, `answer:${answer}`)
    );

    const keyboard = Markup.inlineKeyboard(buttons, { columns: 2 });

    // Post question
    const message = await this.bot!.telegram.sendMessage(
      chatId,
      `🎓 *IP Quiz Question* (${this.currentSession.points} points)\n\n` +
      `${randomQuestion.question}\n\n` +
      `⏱️ Time: 60 seconds\n` +
      `💡 Category: ${randomQuestion.category || 'General'}`,
      { 
        parse_mode: 'Markdown',
        ...keyboard 
      }
    );

    this.currentSession.messageId = message.message_id;

    // Start timer countdown (update every 10 seconds)
    this.startTimerCountdown(chatId, message.message_id);

    // Auto-end after 60 seconds
    setTimeout(() => {
      this.endQuestion(chatId);
    }, 60000);
  }

  /**
   * Start timer countdown display
   */
  private startTimerCountdown(chatId: number, messageId: number) {
    if (!this.currentSession || !this.bot) return;

    this.currentSession.timerInterval = setInterval(() => {
      if (!this.currentSession) {
        return;
      }

      this.currentSession.currentTimeLeft -= 10;

      if (this.currentSession.currentTimeLeft <= 0) {
        if (this.currentSession.timerInterval) {
          clearInterval(this.currentSession.timerInterval);
        }
      }
    }, 10000);
  }

  /**
   * End current question and start cooldown
   */
  private async endQuestion(chatId: number) {
    if (!this.currentSession || !this.bot) return;

    // Clear timer
    if (this.currentSession.timerInterval) {
      clearInterval(this.currentSession.timerInterval);
    }

    // Show correct answer if not already shown
    await this.bot.telegram.sendMessage(
      chatId,
      `⏰ *Time's up!*\n\nCorrect answer: *${this.currentSession.correctAnswer}*\n\n` +
      `${this.currentSession.question}\n\n` +
      `_Next question in 45 seconds..._`,
      { parse_mode: 'Markdown' }
    );

    this.currentSession = null;

    // 45-second cooldown before next question
    this.cooldownTimeout = setTimeout(() => {
      if (this.isActive && this.chatId) {
        this.postNextQuestion(parseInt(this.chatId));
      }
    }, 45000);
  }

  /**
   * Show leaderboard
   */
  private async showLeaderboard(ctx: Context) {
    const topPlayers = await db
      .select()
      .from(telegramLeaderboard)
      .orderBy(desc(telegramLeaderboard.totalPoints))
      .limit(10);

    if (topPlayers.length === 0) {
      await ctx.reply('📊 No quiz data yet! Be the first to play!');
      return;
    }

    let message = '🏆 *Solturio IP Quiz Leaderboard*\n\n';
    message += '*All-Time Top 10:*\n\n';

    topPlayers.forEach((player: any, index: number) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const accuracy = player.totalQuestions > 0 
        ? Math.floor((player.correctAnswers / player.totalQuestions) * 100) 
        : 0;

      message += `${emoji} @${player.telegramUsername || player.telegramFirstName} - ${player.totalPoints} pts (${accuracy}% accuracy)\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  /**
   * Show user's personal stats
   */
  private async showUserStats(ctx: Context) {
    if (!ctx.from) return;

    const userId = ctx.from.id.toString();
    const stats = await db
      .select()
      .from(telegramLeaderboard)
      .where(eq(telegramLeaderboard.telegramUserId, userId))
      .limit(1);

    if (stats.length === 0) {
      await ctx.reply('📊 You haven\'t played any quizzes yet! Use /quiz to start.');
      return;
    }

    const user = stats[0];
    const accuracy = user.totalQuestions > 0 
      ? Math.floor((user.correctAnswers / user.totalQuestions) * 100) 
      : 0;

    const message = 
      `📊 *Your Quiz Stats*\n\n` +
      `🎯 Total Points: ${user.totalPoints}\n` +
      `✅ Correct: ${user.correctAnswers}/${user.totalQuestions} (${accuracy}%)\n` +
      `🔥 Current Streak: ${user.streak}\n` +
      `🏆 Longest Streak: ${user.longestStreak}\n\n` +
      `*Today:*\n` +
      `• Points: ${user.dailyPoints}\n` +
      `• Correct: ${user.dailyCorrectAnswers}/${user.dailyQuestionsAnswered}`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  /**
   * Start quiz session
   */
  async startQuizSession(chatId: string) {
    this.isActive = true;
    this.chatId = chatId;
    console.log(`🎓 Starting quiz session in chat ${chatId}`);
    
    if (this.bot) {
      await this.bot.telegram.sendMessage(
        parseInt(chatId),
        '🎓 *Quiz session starting!*\n\nGet ready for IP education questions!',
        { parse_mode: 'Markdown' }
      );

      await this.postNextQuestion(parseInt(chatId));
    }
  }

  /**
   * Stop quiz session
   */
  async stopQuizSession() {
    this.isActive = false;
    
    if (this.currentSession?.timerInterval) {
      clearInterval(this.currentSession.timerInterval);
    }

    if (this.cooldownTimeout) {
      clearTimeout(this.cooldownTimeout);
    }

    if (this.chatId && this.bot) {
      await this.bot.telegram.sendMessage(
        parseInt(this.chatId),
        '🏁 *Quiz session ended!*\n\nThanks for playing! Check /leaderboard for standings.',
        { parse_mode: 'Markdown' }
      );
    }

    this.currentSession = null;
    console.log('🛑 Quiz session stopped');
  }

  /**
   * Post daily leaderboard summary
   */
  async postDailyLeaderboard(chatId: string) {
    if (!this.bot) return;

    const topDailyPlayers = await db
      .select()
      .from(telegramLeaderboard)
      .orderBy(desc(telegramLeaderboard.dailyPoints))
      .limit(5);

    if (topDailyPlayers.length === 0) {
      return;
    }

    let message = '📊 *Daily Quiz Results*\n\n';
    message += `Today's Top 5:\n\n`;

    topDailyPlayers.forEach((player: any, index: number) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      message += `${emoji} @${player.telegramUsername || player.telegramFirstName} - ${player.dailyPoints} pts\n`;
    });

    message += '\n_See you tomorrow for more IP quiz fun!_';

    await this.bot.telegram.sendMessage(parseInt(chatId), message, { parse_mode: 'Markdown' });
  }

  /**
   * Launch bot
   */
  launch() {
    if (!this.bot) {
      console.error('Cannot launch bot: TELEGRAM_BOT_TOKEN not set');
      return;
    }

    this.bot.launch();
    console.log('🤖 Solturio Quiz Bot is running!');

    // Graceful shutdown
    process.once('SIGINT', () => {
      if (this.bot) {
        this.bot.stop('SIGINT');
      }
    });
    process.once('SIGTERM', () => {
      if (this.bot) {
        this.bot.stop('SIGTERM');
      }
    });
  }

  getBotInstance() {
    return this.bot;
  }
}

export const quizBot = new SolturioQuizBot();
