import { quizBot } from './telegram-bot';

// CATH group chat ID
const CATH_GROUP_CHAT_ID = '-1002847619278';

async function sendUpdate() {
  console.log('📢 Sending Solturio update to CATH group...');
  
  // POST 1: Vision & Mission
  const message = 
    `🎯 *WHAT IS SOLTURIO?*\n\n` +
    `Solturio is building the first fully decentralized IP protection platform on Solana.\n\n` +
    
    `We turn your logos, trademarks, and brand assets into blockchain-verified proof of ownership - immutable, timestamped NFT certificates that protect your creative work.\n\n` +
    
    `Think of it as a copyright office meets Web3:\n` +
    `• Upload your logo ➜ Get cryptographic proof\n` +
    `• Mint on Solana ➜ Timestamped forever\n` +
    `• Fight scammers ➜ Blockchain evidence\n\n` +
    
    `Pure DeFi. No fiat. No middlemen. Just verifiable IP ownership.\n\n` +
    
    `_More updates coming today... 🚀_`;

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
