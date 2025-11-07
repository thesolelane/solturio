# Solturio Telegram Quiz Bot

## Overview
The Solturio Telegram Bot runs IP education quizzes in your Telegram group with automated scheduling, real-time scoring, and leaderboard tracking.

## Features

### Automated Quiz Sessions
- **Morning Session:** 8:00 AM - 10:00 AM
- **Afternoon Session:** 12:00 PM - 2:00 PM  
- **Daily Leaderboard:** Posts at 2:01 PM

### Dynamic Scoring System
Points are awarded based on response speed (faster = more points):
- **0-1 seconds:** 100% of points ⚡ (instant answers)
- **2-10 seconds:** 90% of points
- **11-20 seconds:** 80% of points
- **21-30 seconds:** 70% of points
- **31-40 seconds:** 60% of points
- **41-60 seconds:** 50% of points
- **Over 60 seconds:** 0% of points (too slow)

### Question Flow
1. Bot posts question with multiple choice options
2. 60-second timer starts
3. First correct answer wins full points (based on speed)
4. Wrong answers get 0 points
5. 45-second cooldown before next question

## Setup Instructions

### 1. Create Your Telegram Bot
1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow prompts to create your bot
4. Save the bot token (format: `123456789:AbCdefGhIJKlmNoPQRsTUVwxyZ`)

### 2. Add Bot to Your Group
1. Create a Telegram group or use existing one
2. Add your bot as a member
3. Make bot an administrator (required to post messages)

### 3. Get Your Group Chat ID
1. Add the bot to your group
2. Send a message in the group
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find `"chat":{"id":-123456789,...}` in the response
5. Copy the chat ID (including the minus sign)

### 4. Configure Environment Variables
Add these to your Replit Secrets:

```
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_QUIZ_CHAT_ID=your_group_chat_id_here
```

**Important:** The bot token is already set. You just need to add `TELEGRAM_QUIZ_CHAT_ID`.

### 5. Restart Application
After adding the chat ID, restart the application for scheduled sessions to begin automatically.

## Bot Commands

### `/start`
Shows welcome message with bot information and command list.

### `/quiz`
Manually start a quiz session (useful for testing outside scheduled hours).

### `/leaderboard`
Display top 10 players by all-time points with accuracy stats.

### `/mystats`
View your personal quiz statistics including:
- Total points and accuracy
- Current and longest streaks
- Daily points and questions answered

## Scoring & Rewards

### Points System
- Each question has a base point value (typically 100 points)
- Points are multiplied by speed percentage
- Example: Answer in 5 seconds = 90 pts (90%), Answer in 25 seconds = 70 pts (70%)
- Instant answers (< 1 second) get full 100% points

### Leaderboard Tracking
- **All-time stats:** Total points, questions, accuracy
- **Daily stats:** Reset at midnight, posted at 2:01 PM
- **Streaks:** Consecutive correct answers

### Future Rewards
- $CATH token rewards will be added for top performers
- Special achievements for streaks and accuracy milestones

## Database Tables

### `quiz_questions`
Stores IP education questions with multiple choice options, correct answers, categories, and source citations.

### `quiz_attempts`
Tracks every user answer with timing, correctness, and points earned.

### `telegram_leaderboard`
Maintains user statistics for both all-time and daily performance.

## Adding Quiz Questions

Quiz questions can be added directly to the database:

```sql
INSERT INTO quiz_questions (
  category, difficulty, points, question, options, answer, 
  explanation, source_authority, source_url
) VALUES (
  'Trademark',
  'medium',
  100,
  'What is the primary purpose of a trademark?',
  ARRAY['To protect inventions', 'To identify the source of goods or services', 'To secure copyright', 'To patent a design'],
  'To identify the source of goods or services',
  'Trademarks identify and distinguish the source of goods of one party from those of others.',
  'USPTO',
  'https://www.uspto.gov/trademarks/basics'
);
```

## Timezone Configuration

The scheduler uses `America/New_York` timezone by default. To change:

1. Edit `server/quiz-scheduler.ts`
2. Update the `timezone` parameter in cron.schedule calls
3. Restart the application

## Troubleshooting

### Bot Not Responding
- Verify `TELEGRAM_BOT_TOKEN` is set correctly
- Check bot is added to group and is an administrator
- Look for errors in server logs

### Scheduled Sessions Not Starting
- Ensure `TELEGRAM_QUIZ_CHAT_ID` is set (including minus sign)
- Verify timezone matches your location
- Check server logs for scheduler initialization

### Questions Not Appearing
- Add questions to `quiz_questions` table
- Ensure `is_active` = true for questions
- Check that questions have valid `options` array

## Manual Testing

To test the bot without waiting for scheduled times:

1. Use `/quiz` command in your Telegram group
2. Bot will start a question immediately
3. Answer to test scoring and leaderboard updates
4. Use `/leaderboard` and `/mystats` to verify data

## Technical Details

- **Framework:** Telegraf (Telegram Bot API for Node.js)
- **Scheduler:** node-cron for automated sessions
- **Database:** PostgreSQL with Drizzle ORM
- **Scoring Algorithm:** Time-based multiplier (60s to 1s scale)
- **Cooldown:** 45 seconds between questions to prevent spam

## Future Enhancements

- [ ] $CATH token integration for rewards
- [ ] Question difficulty levels (easy/medium/hard)
- [ ] Category-specific quizzes (trademark, copyright, patent)
- [ ] Battle mode (1v1 challenges)
- [ ] Hint system (reduces points by 25%)
- [ ] Achievement badges
- [ ] Weekly tournaments
