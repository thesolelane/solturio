import { Telegraf, Context, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { db } from './db';
import { quizQuestions, quizAttempts, telegramLeaderboard } from '../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is not set in environment variables');
}

interface QuizAnswer {
  userId: string;
  username: string;
  firstName: string;
  answer: string;
  isCorrect: boolean;
  responseTime: number;
  pointsEarned: number;
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
  answers: QuizAnswer[]; // Track all answers during the 60 seconds
  answeredUserIds: Set<string>; // Track who already answered
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
        '/leaderboard - Game Points (competitive)\n' +
        '/exp - Experience Points (participation)\n' +
        '/mystats - View your quiz statistics\n' +
        '/rules - See scoring details\n\n' +
        '*Schedule:* 8-10 AM & 12-2 PM daily (EST)\n' +
        '*Dual Scoring System:*\n' +
        '🏆 Game Points: Only 1st place\n' +
        '⭐ Experience: Everyone who answers correctly\n\n' +
        '💡 Be the fastest to win big points!',
        { parse_mode: 'Markdown' }
      );
    });

    // Rules command - Show comprehensive guide
    this.bot.command('rules', async (ctx) => {
      await this.postRulesAndStrategy(ctx.chat.id.toString());
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

    // Game Points Leaderboard command
    this.bot.command('leaderboard', async (ctx) => {
      await this.showLeaderboard(ctx);
    });

    // Experience Leaderboard command
    this.bot.command('exp', async (ctx) => {
      await this.showExperienceLeaderboard(ctx);
    });

    // Personal stats command
    this.bot.command('mystats', async (ctx) => {
      await this.showUserStats(ctx);
    });

    // Listen for button clicks (callback queries)
    this.bot.on('callback_query', async (ctx) => {
      if (!this.currentSession || !ctx.from || !ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
      }

      const data = ctx.callbackQuery.data;
      
      // Check if this is an answer callback
      if (data.startsWith('answer:')) {
        const answer = data.replace('answer:', '');
        const userId = ctx.from.id.toString();
        const username = ctx.from.username || '';
        const firstName = ctx.from.first_name || 'Anonymous';

        await this.processAnswer(userId, username, firstName, answer, ctx);
      }
    });

    // Listen for text answers (fallback)
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
   * Calculate points based on ranking (competitive scoring)
   * 1st place: Full points based on time
   * 2nd place: 10 exp
   * 3rd place: 5 exp
   * 4th place: 3 exp
   * 5th+ place: 1 point for participation
   * Wrong answers: 0 points
   */
  private calculatePointsByRank(rank: number, responseTimeSeconds: number, basePoints: number): number {
    // Rank 1 (fastest): Calculate time-based points
    if (rank === 1) {
      const clampedTime = Math.max(0, Math.min(60, responseTimeSeconds));
      
      if (responseTimeSeconds > 60) return 0;

      const timeRanges = [
        { max: 1, multiplier: 1.0 },    // 0-1 sec: 100%
        { max: 10, multiplier: 0.9 },   // 2-10 sec: 90%
        { max: 20, multiplier: 0.8 },   // 11-20 sec: 80%
        { max: 30, multiplier: 0.7 },   // 21-30 sec: 70%
        { max: 40, multiplier: 0.6 },   // 31-40 sec: 60%
        { max: 60, multiplier: 0.5 },   // 41-60 sec: 50%
      ];

      for (const range of timeRanges) {
        if (clampedTime <= range.max) {
          return Math.floor(basePoints * range.multiplier);
        }
      }
      return 0;
    }

    // Fixed points for other ranks
    if (rank === 2) return 10;
    if (rank === 3) return 5;
    if (rank === 4) return 3;
    
    // 5th place and beyond: participation point
    return 1;
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
    
    // Check if user already answered this question (using session tracking)
    if (this.currentSession.answeredUserIds.has(userId)) {
      await ctx.answerCbQuery('⚠️ You already answered this question!');
      return;
    }

    const isCorrect = answer === this.currentSession.correctAnswer;
    
    // Store 0 points temporarily - we'll recalculate based on ranking at the end
    const pointsEarned = 0;

    // Mark user as answered and store their answer
    this.currentSession.answeredUserIds.add(userId);
    this.currentSession.answers.push({
      userId,
      username,
      firstName,
      answer,
      isCorrect,
      responseTime,
      pointsEarned // Will be updated in endQuestion
    });

    // Silently acknowledge the answer (don't reveal if correct/wrong yet!)
    await ctx.answerCbQuery('✅ Answer recorded! Results after timer ends...');
    
    // Don't end the question early - let the timer run for full 60 seconds
  }

  /**
   * Get current date in Eastern timezone (YYYY-MM-DD)
   */
  private getEasternDate(date: Date = new Date()): string {
    // Convert to Eastern timezone and get date string
    const easternDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    return easternDate.toISOString().split('T')[0];
  }

  /**
   * Update user's leaderboard stats with separate game points and experience
   */
  private async updateLeaderboard(
    userId: string,
    username: string,
    firstName: string,
    isCorrect: boolean,
    gamePoints: number,     // Only 1st place gets these (time-based)
    experience: number      // Everyone gets exp based on ranking
  ) {
    const existing = await db
      .select()
      .from(telegramLeaderboard)
      .where(eq(telegramLeaderboard.telegramUserId, userId))
      .limit(1);

    const now = new Date();
    const currentEasternDate = this.getEasternDate(now);

    if (existing.length === 0) {
      // Create new entry
      await db.insert(telegramLeaderboard).values({
        telegramUserId: userId,
        telegramUsername: username,
        telegramFirstName: firstName,
        totalQuestions: 1,
        correctAnswers: isCorrect ? 1 : 0,
        totalPoints: gamePoints,
        totalExperience: experience,
        dailyPoints: gamePoints,
        dailyExperience: experience,
        dailyCorrectAnswers: isCorrect ? 1 : 0,
        dailyQuestionsAnswered: 1,
        lastDailyReset: now,
        streak: isCorrect ? 1 : 0,
        longestStreak: isCorrect ? 1 : 0,
        lastQuizAt: now,
      });
    } else {
      const user = existing[0];
      
      // Check if we need to reset daily stats based on Eastern timezone
      const lastReset = user.lastDailyReset ? new Date(user.lastDailyReset) : now;
      const lastEasternDate = this.getEasternDate(lastReset);
      const shouldResetDaily = currentEasternDate !== lastEasternDate;

      const newStreak = isCorrect ? (user.streak || 0) + 1 : 0;
      const newLongestStreak = Math.max(newStreak, user.longestStreak || 0);

      await db
        .update(telegramLeaderboard)
        .set({
          telegramUsername: username,
          telegramFirstName: firstName,
          totalQuestions: (user.totalQuestions || 0) + 1,
          correctAnswers: (user.correctAnswers || 0) + (isCorrect ? 1 : 0),
          totalPoints: (user.totalPoints || 0) + gamePoints,
          totalExperience: (user.totalExperience || 0) + experience,
          dailyPoints: shouldResetDaily ? gamePoints : (user.dailyPoints || 0) + gamePoints,
          dailyExperience: shouldResetDaily ? experience : (user.dailyExperience || 0) + experience,
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
      answers: [], // Track all answers during the 60 seconds
      answeredUserIds: new Set(), // Track who already answered
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

    // Find correct answers and sort by response time (fastest first)
    const correctAnswers = this.currentSession.answers
      .filter(a => a.isCorrect)
      .sort((a, b) => a.responseTime - b.responseTime);

    // Recalculate points and experience based on ranking
    for (let i = 0; i < correctAnswers.length; i++) {
      const rank = i + 1; // 1st, 2nd, 3rd, etc.
      const answer = correctAnswers[i];
      
      // Calculate game points and experience separately
      let gamePoints = 0;
      let experience = 0;
      
      if (rank === 1) {
        // 1st place: Gets time-based game points AND same amount as experience
        gamePoints = this.calculatePointsByRank(rank, answer.responseTime, this.currentSession.points);
        experience = gamePoints; // Same as game points
      } else if (rank === 2) {
        // 2nd place: 0 game points, 10 experience
        gamePoints = 0;
        experience = 10;
      } else if (rank === 3) {
        // 3rd place: 0 game points, 5 experience
        gamePoints = 0;
        experience = 5;
      } else if (rank === 4) {
        // 4th place: 0 game points, 3 experience
        gamePoints = 0;
        experience = 3;
      } else {
        // 5th+ place: 0 game points, 1 experience
        gamePoints = 0;
        experience = 1;
      }
      
      // Update points in the answer object for display (show experience for everyone)
      answer.pointsEarned = experience;
      
      // Save to database
      await db.insert(quizAttempts).values({
        questionId: this.currentSession.questionId,
        telegramUserId: answer.userId,
        telegramUsername: answer.username,
        telegramFirstName: answer.firstName,
        userAnswer: answer.answer,
        isCorrect: answer.isCorrect,
        pointsEarned: experience, // Store experience for display
        questionPointValue: this.currentSession.points,
        timeToAnswer: answer.responseTime,
      });
      
      // Update leaderboard with both game points and experience
      await this.updateLeaderboard(
        answer.userId,
        answer.username,
        answer.firstName,
        answer.isCorrect,
        gamePoints,   // Only 1st place gets these
        experience    // Everyone gets exp based on ranking
      );
    }

    // Build results message
    let resultsMessage = `⏰ *Time's up!*\n\n`;
    resultsMessage += `✅ Correct answer: *${this.currentSession.correctAnswer}*\n\n`;

    if (correctAnswers.length > 0) {
      resultsMessage += `🏆 *Winners:*\n`;
      correctAnswers.forEach((answer, index) => {
        const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '✅';
        resultsMessage += `${emoji} @${answer.username || answer.firstName} `;
        resultsMessage += `(${answer.responseTime}s • ${answer.pointsEarned} pts)\n`;
      });
      resultsMessage += `\n`;
    } else {
      resultsMessage += `😔 No one got it right this time!\n\n`;
    }

    // Show participation stats
    const totalParticipants = this.currentSession.answers.length;
    if (totalParticipants > 0) {
      resultsMessage += `📊 ${totalParticipants} player${totalParticipants > 1 ? 's' : ''} participated\n\n`;
    }

    resultsMessage += `_Next question in 45 seconds..._`;

    // Send results
    await this.bot.telegram.sendMessage(
      chatId,
      resultsMessage,
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
   * Show game points leaderboard (competitive ranking)
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

    let message = '🏆 *Game Points Leaderboard*\n';
    message += '_Competitive ranking (1st place wins)_\n\n';

    topPlayers.forEach((player: any, index: number) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const accuracy = player.totalQuestions > 0 
        ? Math.floor((player.correctAnswers / player.totalQuestions) * 100) 
        : 0;

      message += `${emoji} @${player.telegramUsername || player.telegramFirstName} - ${player.totalPoints} pts (${accuracy}% accuracy)\n`;
    });

    message += '\n💡 _Use /exp to see Experience leaderboard_';

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  /**
   * Show experience leaderboard (participation rewards)
   */
  private async showExperienceLeaderboard(ctx: Context) {
    const topPlayers = await db
      .select()
      .from(telegramLeaderboard)
      .orderBy(desc(telegramLeaderboard.totalExperience))
      .limit(10);

    if (topPlayers.length === 0) {
      await ctx.reply('📊 No quiz data yet! Be the first to play!');
      return;
    }

    let message = '⭐ *Experience Points Leaderboard*\n';
    message += '_Participation rewards (all correct answers)_\n\n';

    topPlayers.forEach((player: any, index: number) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const accuracy = player.totalQuestions > 0 
        ? Math.floor((player.correctAnswers / player.totalQuestions) * 100) 
        : 0;

      message += `${emoji} @${player.telegramUsername || player.telegramFirstName} - ${player.totalExperience} exp (${accuracy}% accuracy)\n`;
    });

    message += '\n💡 _Use /leaderboard to see Game Points_';

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
      `🏆 Game Points: ${user.totalPoints}\n` +
      `⭐ Experience: ${user.totalExperience}\n` +
      `✅ Correct: ${user.correctAnswers}/${user.totalQuestions} (${accuracy}%)\n` +
      `🔥 Current Streak: ${user.streak}\n` +
      `🏅 Longest Streak: ${user.longestStreak}\n\n` +
      `*Today:*\n` +
      `• Game Points: ${user.dailyPoints}\n` +
      `• Experience: ${user.dailyExperience}\n` +
      `• Correct: ${user.dailyCorrectAnswers}/${user.dailyQuestionsAnswered}`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  /**
   * Send pre-game announcement
   */
  async sendAnnouncement(chatId: string, session: 'morning' | 'afternoon') {
    if (!this.bot) return;

    const sessionTime = session === 'morning' ? '8:00 AM' : '12:00 PM';
    const sessionEmoji = session === 'morning' ? '🌅' : '☀️';

    const message = 
      `${sessionEmoji} *Solturio IP Quiz Alert!*\n\n` +
      `📢 Quiz session starting in 5 minutes!\n` +
      `🕐 Time: ${sessionTime} EST\n` +
      `🏆 Rewards: Points + $CATH tokens (coming soon)\n\n` +
      `*Get ready to test your IP knowledge!*\n` +
      `Topics: Trademarks, Copyrights, Patents, NFTs\n\n` +
      `💡 Faster answers = More points!\n` +
      `⚡ First correct answer gets gold medal!\n\n` +
      `_Questions will start automatically at ${sessionTime}_`;

    await this.bot.telegram.sendMessage(
      parseInt(chatId),
      message,
      { parse_mode: 'Markdown' }
    );
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
        '🎓 *Quiz session starting NOW!*\n\nGet ready for IP education questions!',
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
   * Post comprehensive rules and strategy guide
   */
  async postRulesAndStrategy(chatId: string) {
    if (!this.bot) return;

    const message = 
      `🎓 *SOLTURIO IP QUIZ - COMPLETE GUIDE*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      
      `📋 *HOW TO PLAY*\n\n` +
      `1️⃣ Quiz sessions run automatically:\n` +
      `   • 🌅 Morning: 8-10 AM EST\n` +
      `   • ☀️ Afternoon: 12-2 PM EST\n` +
      `2️⃣ When a question appears, click your answer\n` +
      `3️⃣ You have 60 seconds to answer\n` +
      `4️⃣ Results reveal after time expires\n` +
      `5️⃣ New question every few minutes\n\n` +
      
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      
      `🏆 *DUAL SCORING SYSTEM*\n\n` +
      `We reward TWO different skills:\n\n` +
      
      `*Game Points* (Competitive 🥇)\n` +
      `• Only 1st place gets points\n` +
      `• Time-based: 50-150 points\n` +
      `• Faster answer = More points\n` +
      `• View: /leaderboard\n\n` +
      
      `*Experience Points* (Participation ⭐)\n` +
      `• Everyone who's correct gets exp\n` +
      `• Fixed rewards by ranking:\n` +
      `  🥇 1st: Same as game points (50-150)\n` +
      `  🥈 2nd: 10 exp\n` +
      `  🥉 3rd: 5 exp\n` +
      `  🏅 4th: 3 exp\n` +
      `  ✅ 5th+: 1 exp\n` +
      `  ❌ Wrong: 0 exp\n` +
      `• View: /exp\n\n` +
      
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      
      `🎯 *WINNING STRATEGIES*\n\n` +
      `*For Game Points (Competitive):*\n` +
      `✅ Study IP topics beforehand\n` +
      `✅ Read questions FAST but carefully\n` +
      `✅ Have Telegram notifications ON\n` +
      `✅ Be ready at session start times\n` +
      `✅ Don't second-guess yourself\n\n` +
      
      `*For Experience (Participation):*\n` +
      `✅ Answer every question correctly\n` +
      `✅ Don't rush - accuracy over speed\n` +
      `✅ Learn from each question\n` +
      `✅ Build knowledge over time\n` +
      `✅ Consistent play = More exp\n\n` +
      
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      
      `📚 *QUIZ TOPICS*\n` +
      `• Trademarks & Trade Dress\n` +
      `• Copyright & Fair Use\n` +
      `• Patents & Trade Secrets\n` +
      `• NFTs & Blockchain IP\n` +
      `• International IP Law\n\n` +
      
      `All questions from official sources:\n` +
      `USPTO, WIPO, Copyright Office\n\n` +
      
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      
      `💎 *COMMANDS*\n` +
      `/quiz - Start manual quiz\n` +
      `/leaderboard - Game Points ranking\n` +
      `/exp - Experience ranking\n` +
      `/mystats - Your stats\n` +
      `/rules - See this guide\n\n` +
      
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      
      `🎁 *REWARDS (COMING SOON)*\n` +
      `Top performers will earn $CATH tokens!\n` +
      `Both leaderboards will have rewards.\n\n` +
      
      `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      
      `💡 *PRO TIPS*\n` +
      `🔹 Wrong answers = 0 points & break streak\n` +
      `🔹 Speed matters for 1st place only\n` +
      `🔹 2nd-5th get exp just for being correct\n` +
      `🔹 Build streaks for bonus multipliers\n` +
      `🔹 Learn as you play - IP knowledge pays!\n\n` +
      
      `Good luck! 🚀`;

    await this.bot.telegram.sendMessage(
      parseInt(chatId),
      message,
      { parse_mode: 'Markdown' }
    );
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
