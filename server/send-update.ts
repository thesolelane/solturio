import { quizBot } from './telegram-bot';

// CATH group chat ID
const CATH_GROUP_CHAT_ID = '-1002847619278';

async function sendUpdate() {
  console.log('📢 Sending Solturio update to CATH group...');
  
  // POST 3: Why CATH?
  const message = 
    `🐱 *WHY BUILD ON $CATH?*\n\n` +
    `Solturio is a **Cooperanth Consulting LLC** project - part of the **$CATH Ecosystem** from day one. Here's why:\n\n` +
    
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    
    `🎯 *ALIGNED MISSION*\n\n` +
    `Cooperanth Consulting / $CATH is about community-driven innovation and real utility. Solturio delivers exactly that - a platform solving actual crypto problems (IP theft, scams, rugpulls).\n\n` +
    
    `We're not building hype. We're building infrastructure.\n\n` +
    
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    
    `💎 *PURE DEFI VALUES*\n\n` +
    `$CATH represents true decentralization - no fiat, no banks, no Web2 compromise.\n\n` +
    
    `Solturio follows the same principles:\n` +
    `• Crypto-only payments (SOL, BONK, Arweave, $CATH)\n` +
    `• Decentralized storage (IPFS)\n` +
    `• Blockchain verification (Solana)\n` +
    `• Community governance (coming)\n\n` +
    
    `We're 100% Web3. Just like $CATH.\n\n` +
    
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    
    `🚀 *FIRST-MOVER ECOSYSTEM*\n\n` +
    `$CATH holders are early adopters who understand crypto deeply. You get what we're building before everyone else catches on.\n\n` +
    
    `When DEX platforms start requiring IP verification (and they will), $CATH community will already have:\n` +
    `• Protected assets\n` +
    `• Discounted rates\n` +
    `• Priority access\n` +
    `• Token rewards\n\n` +
    
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    
    `🤝 *MUTUAL GROWTH*\n\n` +
    `As Solturio grows:\n` +
    `• More projects register with $CATH\n` +
    `• Quiz rewards paid in $CATH\n` +
    `• $CATH holders get platform discounts\n` +
    `• Ecosystem expands together\n\n` +
    
    `We're not just using $CATH - it's integrated into every layer of the platform.\n\n` +
    
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    
    `🛡️ *ANTI-SCAM SYNERGY*\n\n` +
    `$CATH community fights scams daily. Solturio gives you the tools to:\n` +
    `• Verify legitimate projects\n` +
    `• Report imposters with proof\n` +
    `• Protect your own brand\n` +
    `• Build trust in crypto\n\n` +
    
    `Together, we're making Web3 safer.\n\n` +
    
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    
    `This is Solturio - a **Cooperanth Consulting LLC** project.\n\n` +
    
    `Built on $CATH. Powered by this community. 🐱🛡️`;


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
