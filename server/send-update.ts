import { quizBot } from './telegram-bot';

// CATH group chat ID
const CATH_GROUP_CHAT_ID = '-1002847619278';

async function sendUpdate() {
  console.log('📢 Sending Solturio update to CATH group...');
  
  // POST 4: Who Benefits
  const message = 
    `👥 *WHO BENEFITS FROM SOLTURIO?*\n\n` +
    `Everyone in crypto - but especially these groups:\n\n` +
    
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    
    `🚀 *TOKEN CREATORS*\n\n` +
    `Launching a new token? Get protected BEFORE scammers copy your logo.\n\n` +
    
    `What you get:\n` +
    `✅ Blockchain-verified ownership proof\n` +
    `✅ Timestamped before any copycats\n` +
    `✅ Legal questionnaire for IP claims\n` +
    `✅ 24-hour social proof verification\n` +
    `✅ Instant takedown authority\n\n` +
    
    `Pay in: SOL, BONK, Arweave, or $CATH\n\n` +
    
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    
    `🎨 *ARTISTS & DESIGNERS*\n\n` +
    `NFT creators, graphic designers, brand studios - protect your work.\n\n` +
    
    `What you get:\n` +
    `✅ Immutable proof of creation\n` +
    `✅ Portfolio protection system\n` +
    `✅ Authorized usage tracking\n` +
    `✅ License management tools\n` +
    `✅ Copyright evidence for disputes\n\n` +
    
    `Your art. Your blockchain proof. Forever.\n\n` +
    
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    
    `🏢 *BRANDS & BUSINESSES*\n\n` +
    `Already have a brand in Web2? Protect it in Web3.\n\n` +
    
    `What you get:\n` +
    `✅ Multi-logo protection (collections)\n` +
    `✅ Trademark-to-blockchain bridge\n` +
    `✅ Anti-impersonation system\n` +
    `✅ DEX verification API access\n` +
    `✅ Enterprise-grade IP security\n\n` +
    
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    
    `🐱 *$CATH COMMUNITY*\n\n` +
    `Special perks for $CATH holders:\n\n` +
    
    `💎 Discounted registration fees\n` +
    `💎 Priority access to new features\n` +
    `💎 Quiz rewards paid in $CATH\n` +
    `💎 Governance voting rights (coming)\n` +
    `💎 Early ecosystem benefits\n\n` +
    
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    
    `🔍 *DEX PLATFORMS*\n\n` +
    `Integration coming soon:\n` +
    `• Real-time logo verification API\n` +
    `• Detect stolen/copycat assets\n` +
    `• Automated flagging system\n` +
    `• Reduce scam listings by 90%+\n\n` +
    
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    
    `🌐 *THE ENTIRE CRYPTO SPACE*\n\n` +
    `When IP theft gets harder:\n` +
    `• Scammers lose their easiest weapon\n` +
    `• Legitimate projects gain trust\n` +
    `• Communities stop getting rugged\n` +
    `• Web3 becomes safer for everyone\n\n` +
    
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    
    `Solturio isn't just for protecting YOUR logo.\n\n` +
    
    `It's infrastructure for a safer crypto ecosystem.\n\n` +
    
    `Built by **Cooperanth Consulting LLC**. Powered by **$CATH**. 🛡️`;


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
