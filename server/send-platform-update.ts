import { quizBot } from "./telegram-bot";

// CATH group chat ID
const CATH_GROUP_CHAT_ID = "-1002847619278";

async function sendPlatformUpdate() {
  console.log("📢 Sending Solturio platform update to CATH group...");

  const message =
    `🚀 *SOLTURIO PLATFORM UPDATE*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🎯 *OUR VISION*\n\n` +
    `Solturio is building the first fully decentralized IP protection platform on Solana. We're creating blockchain-verified proof of ownership for logos, trademarks, and brand assets - turning your creative work into immutable, timestamped NFT certificates.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🔥 *THE PROBLEM WE SOLVE*\n\n` +
    `Every day in crypto:\n` +
    `• Scammers steal logos for rugpull tokens\n` +
    `• DEX platforms can't verify legitimate projects\n` +
    `• Artists lose ownership claims\n` +
    `• Brands have no blockchain proof of IP\n` +
    `• Takedown requests get ignored without evidence\n\n` +
    `Traditional IP registration is slow, expensive, and disconnected from Web3. Solturio bridges this gap.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `💎 *WHO BENEFITS*\n\n` +
    `*Token Launchers:* Register your logo before launch. Get blockchain proof that stops copycats and builds trust on DEX platforms.\n\n` +
    `*Artists & Designers:* Mint your artwork as IP-protected NFTs. Proof-of-creation timestamps that hold up in disputes.\n\n` +
    `*Established Brands:* Protect your trademark on-chain. Combat crypto impersonators with verifiable ownership.\n\n` +
    `*Communities (like CATH):* Secure your brand identity. Authorized usage tracking. Automated DMCA takedowns for imposters.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🛡️ *HOW IT WORKS*\n\n` +
    `1️⃣ Upload your logo to our platform\n` +
    `2️⃣ We generate cryptographic proof (SHA-256)\n` +
    `3️⃣ Mint minimal on-chain NFT metadata on Solana\n` +
    `4️⃣ Store full assets on IPFS (platform-controlled)\n` +
    `5️⃣ Receive your \`xxx.solturio.sol\` wallet with certificates\n\n` +
    `Your IP is now blockchain-verified with immutable timestamps - perfect evidence for disputes and takedowns.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🌟 *WHY THIS NICHE IS OPEN*\n\n` +
    `• No other platform combines Solana NFTs + IP protection\n` +
    `• DEX platforms desperately need anti-scam verification\n` +
    `• Web3 creators lack affordable IP registration\n` +
    `• Traditional IP law hasn't caught up to blockchain\n` +
    `• First-mover advantage in decentralized IP proof\n\n` +
    `We're not just building another NFT marketplace - we're creating the infrastructure for intellectual property protection in Web3.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `💰 *PURE DEFI APPROACH*\n\n` +
    `Crypto-only payments:\n` +
    `• SOL (Standard tier)\n` +
    `• BONK (Community favorite)\n` +
    `• Arweave (Permanent storage)\n` +
    `• CATH (Discounted rates for holders! 🎁)\n\n` +
    `No fiat. No banks. Pure decentralization.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📚 *BUILDING IN PUBLIC*\n\n` +
    `Current Progress:\n` +
    `✅ Core platform architecture complete\n` +
    `✅ Solana wallet system (\`xxx.solturio.sol\`)\n` +
    `✅ Multi-step registration wizard\n` +
    `✅ Crypto payment integration\n` +
    `✅ IP Education Quiz Bot (you're using it!)\n` +
    `✅ Security hardening (CSRF, payment verification)\n` +
    `🔄 DEX anti-copycat API (in development)\n` +
    `🔄 NFT minting integration (testing)\n` +
    `🔜 Public beta launch\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🎁 *SPECIAL FOR CATH COMMUNITY*\n\n` +
    `As early supporters, CATH holders will get:\n` +
    `• Discounted registration fees when paying in $CATH\n` +
    `• Quiz rewards in $CATH tokens (coming soon)\n` +
    `• Early access to beta features\n` +
    `• Community governance input\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🚀 *JOIN THE JOURNEY*\n\n` +
    `We're not just protecting IP - we're building the future of decentralized intellectual property rights. Every logo minted, every quiz answered, every community member contributes to this vision.\n\n` +
    `Stay tuned for beta launch announcements.\n` +
    `Keep learning with our IP quizzes.\n` +
    `Help us build the anti-scam infrastructure Web3 needs.\n\n` +
    `Together, we're making crypto safer. 🛡️\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Questions? Feedback? Drop them below! 👇`;

  try {
    const bot = quizBot.getBotInstance();
    if (!bot) {
      console.error("Bot not initialized");
      process.exit(1);
    }

    await bot.telegram.sendMessage(parseInt(CATH_GROUP_CHAT_ID), message, {
      parse_mode: "Markdown",
    });

    console.log("✅ Platform update posted successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error posting update:", error);
    process.exit(1);
  }
}

// Give the bot a moment to initialize
setTimeout(sendPlatformUpdate, 2000);
