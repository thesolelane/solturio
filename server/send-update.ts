import { quizBot } from './telegram-bot';

// CATH group chat ID
const CATH_GROUP_CHAT_ID = '-1002847619278';

async function sendUpdate() {
  console.log('📢 Sending Solturio update to CATH group...');
  
  // POST 2: The Problem
  const message = 
    `🚨 *THE PROBLEM SOLTURIO SOLVES*\n\n` +
    `Every single day in crypto:\n\n` +
    
    `🔴 Scammers steal legitimate project logos\n` +
    `🔴 Rugpull tokens use copied branding\n` +
    `🔴 DEX platforms can't verify real vs fake\n` +
    `🔴 Artists lose IP ownership claims\n` +
    `🔴 Takedown requests get ignored (no proof)\n` +
    `🔴 Communities get impersonated\n\n` +
    
    `*The Reality:*\n` +
    `Traditional IP registration is:\n` +
    `• Slow (months to process)\n` +
    `• Expensive ($250-$2000+ per trademark)\n` +
    `• Disconnected from Web3\n` +
    `• No blockchain verification\n\n` +
    
    `DEX platforms have ZERO way to verify if a logo is legitimate. They list thousands of tokens daily - scammers exploit this.\n\n` +
    
    `*Solturio Changes This:*\n` +
    `✅ Instant blockchain proof of ownership\n` +
    `✅ Timestamped immutable evidence\n` +
    `✅ Cryptographic file verification (SHA-256)\n` +
    `✅ API for DEX platforms to check legitimacy\n` +
    `✅ Automated takedown system\n\n` +
    
    `This is why we built Solturio as a **CATH Ecosystem project** - to give crypto the IP protection infrastructure it desperately needs.\n\n` +
    
    `Running on $CATH. Built for the community. 🛡️`;

  try {
    const bot = quizBot.getBotInstance();
    if (!bot) {
      console.error('Bot not initialized');
      process.exit(1);
    }

    await bot.telegram.sendMessage(
      parseInt(CATH_GROUP_CHAT_ID),
      message,
      { parse_mode: 'Markdown' }
    );
    
    console.log('✅ Update posted successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error posting update:', error);
    process.exit(1);
  }
}

setTimeout(sendUpdate, 2000);
