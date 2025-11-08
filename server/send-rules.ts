import { quizBot } from './telegram-bot';

// CATH group chat ID
const CATH_GROUP_CHAT_ID = '-1002847619278';

async function sendRules() {
  console.log('📋 Sending comprehensive rules guide to CATH group...');
  
  try {
    await quizBot.postRulesAndStrategy(CATH_GROUP_CHAT_ID);
    console.log('✅ Rules guide posted successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error posting rules:', error);
    process.exit(1);
  }
}

// Give the bot a moment to initialize
setTimeout(sendRules, 2000);
