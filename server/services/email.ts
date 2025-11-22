import sgMail from "@sendgrid/mail";

// Initialize SendGrid if API key is provided
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const NOREPLY_EMAIL = process.env.NOREPLY_EMAIL || "noreply@solturio.com";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@solturio.com";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send a transactional email via SendGrid
 */
export async function sendTransactionalEmail(options: EmailOptions): Promise<boolean> {
  // If no API key, log and skip
  if (!SENDGRID_API_KEY) {
    console.warn(`📧 Email service disabled - No SENDGRID_API_KEY. Would send: ${options.to}`);
    return false;
  }

  try {
    const msg = {
      to: options.to,
      from: NOREPLY_EMAIL,
      subject: options.subject,
      text: options.text || "",
      html: options.html,
    };

    await sgMail.send(msg);
    console.log(`✅ Email sent to ${options.to}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to send email to ${options.to}:`, error.message);
    return false;
  }
}

/**
 * Send registration confirmation email
 */
export async function sendRegistrationConfirmation(
  userEmail: string,
  logoFileName: string,
  collectionId: string
): Promise<boolean> {
  return sendTransactionalEmail({
    to: userEmail,
    subject: "Logo Registration Confirmed - Solturio",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2C3E50;">🎉 Registration Confirmed!</h2>
        
        <p>Your logo has been successfully registered on Solturio.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Logo:</strong> ${logoFileName}</p>
          <p><strong>Collection ID:</strong> ${collectionId}</p>
          <p><strong>Status:</strong> Registered & Protected ✅</p>
        </div>
        
        <h3>What's Next?</h3>
        <ul>
          <li>View your dashboard: <a href="https://solturio.com/dashboard">solturio.com/dashboard</a></li>
          <li>Create your Solturio wallet (xxx.solturio.sol)</li>
          <li>Mint your NFT certificate</li>
          <li>Add authorized usage locations</li>
        </ul>
        
        <p>Your blockchain-verified proof of ownership is now immutable. 🛡️</p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="color: #888; font-size: 12px;">
          Questions? Email us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a><br>
          Built by Cooperanth Consulting LLC • CATH Ecosystem
        </p>
      </div>
    `,
    text: `Your logo "${logoFileName}" has been registered on Solturio. View your dashboard at https://solturio.com/dashboard`,
  });
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmation(
  userEmail: string,
  amount: string,
  currency: string,
  txSignature: string
): Promise<boolean> {
  return sendTransactionalEmail({
    to: userEmail,
    subject: "Payment Received - Solturio Registration",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27AE60;">✅ Payment Received</h2>
        
        <p>Thank you for registering with Solturio!</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> ${amount} ${currency}</p>
          <p><strong>Transaction:</strong> ${txSignature.substring(0, 20)}...</p>
          <p><strong>Status:</strong> Confirmed ✅</p>
        </div>
        
        <p>Your logo registration is being processed. You'll receive your certificate within 24 hours.</p>
        
        <p><a href="https://solturio.com/dashboard" style="background: #3498DB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a></p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="color: #888; font-size: 12px;">
          Questions? Email us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a><br>
          Built by Cooperanth Consulting LLC • CATH Ecosystem
        </p>
      </div>
    `,
    text: `Payment of ${amount} ${currency} received. Transaction: ${txSignature}`,
  });
}

/**
 * Send wallet creation confirmation
 */
export async function sendWalletCreated(
  userEmail: string,
  walletDomain: string
): Promise<boolean> {
  return sendTransactionalEmail({
    to: userEmail,
    subject: "Your Solturio Wallet Created - Action Required",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #9B59B6;">🎯 Your Solturio Wallet is Ready</h2>
        
        <p>Congratulations! Your Solturio wallet has been created.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Wallet Domain:</strong> <code style="background: #e0e0e0; padding: 5px 10px; border-radius: 3px;">${walletDomain}</code></p>
          <p><strong>Type:</strong> Solturio IP Protection Wallet</p>
          <p style="color: #e74c3c;"><strong>⚠️ Important:</strong> Only this wallet can mint your IP certificates</p>
        </div>
        
        <h3>Critical Security Steps:</h3>
        <ol>
          <li>✅ Save your 12-word recovery phrase in a safe place</li>
          <li>✅ Enable 2-factor authentication</li>
          <li>✅ Never share your private key</li>
          <li>✅ Verify the wallet domain before transactions</li>
        </ol>
        
        <p style="color: #888; font-size: 14px; background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
          💡 This wallet is designed to ONLY accept Solturio certificates. SPL tokens are automatically rejected for security.
        </p>
        
        <p><a href="https://solturio.com/ceremony" style="background: #3498DB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Key Handover Ceremony</a></p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="color: #888; font-size: 12px;">
          Questions? Email us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a><br>
          Built by Cooperanth Consulting LLC • CATH Ecosystem
        </p>
      </div>
    `,
    text: `Your Solturio wallet ${walletDomain} has been created. Save your recovery phrase and complete the key handover ceremony.`,
  });
}

/**
 * Send NFT minting started notification
 */
export async function sendNFTMintingStarted(
  userEmail: string,
  certificateId: string,
  walletDomain: string
): Promise<boolean> {
  return sendTransactionalEmail({
    to: userEmail,
    subject: "NFT Certificate Minting in Progress",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F39C12;">🚀 Minting Your NFT Certificate</h2>
        
        <p>Your IP protection certificate is being minted on the Solana blockchain!</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Certificate ID:</strong> ${certificateId}</p>
          <p><strong>Minting to Wallet:</strong> ${walletDomain}</p>
          <p><strong>Status:</strong> In Progress... ⏳</p>
        </div>
        
        <p>This usually takes 2-5 minutes. You'll receive another email when your certificate is complete.</p>
        
        <p>In the meantime, you can:</p>
        <ul>
          <li>Set up authorized usage locations</li>
          <li>Add additional logos to your collection</li>
          <li>Review your protection details</li>
        </ul>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="color: #888; font-size: 12px;">
          Questions? Email us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a><br>
          Built by Cooperanth Consulting LLC • CATH Ecosystem
        </p>
      </div>
    `,
    text: `NFT Certificate ${certificateId} is being minted to wallet ${walletDomain}. This should complete within 5 minutes.`,
  });
}

/**
 * Send NFT minting complete notification
 */
export async function sendNFTMintingComplete(
  userEmail: string,
  certificateId: string,
  walletDomain: string,
  nftMintAddress: string
): Promise<boolean> {
  return sendTransactionalEmail({
    to: userEmail,
    subject: "NFT Certificate Minted Successfully! 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27AE60;">✅ Your NFT Certificate is Live!</h2>
        
        <p>Congratulations! Your IP protection certificate has been minted on Solana.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Certificate ID:</strong> ${certificateId}</p>
          <p><strong>NFT Mint Address:</strong> <code style="background: #e0e0e0; padding: 5px 10px; border-radius: 3px; word-break: break-all;">${nftMintAddress}</code></p>
          <p><strong>Wallet:</strong> ${walletDomain}</p>
          <p><strong>Status:</strong> ✅ Complete & Immutable</p>
        </div>
        
        <p>Your blockchain-verified proof of logo ownership is now permanent and verifiable worldwide.</p>
        
        <h3>You Can Now:</h3>
        <ul>
          <li>✅ Share certificate with platforms (DEX, social, etc.)</li>
          <li>✅ Use as evidence in IP disputes</li>
          <li>✅ Register additional logos</li>
          <li>✅ Track authorized usage</li>
        </ul>
        
        <p><a href="https://solturio.com/certificate/${certificateId}" style="background: #27AE60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Certificate</a></p>
        
        <p><a href="https://solscan.io/token/${nftMintAddress}" style="color: #3498DB; text-decoration: none;">View on Blockchain Explorer →</a></p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="color: #888; font-size: 12px;">
          Questions? Email us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a><br>
          Built by Cooperanth Consulting LLC • CATH Ecosystem
        </p>
      </div>
    `,
    text: `NFT Certificate ${certificateId} minted! NFT: ${nftMintAddress}. View at https://solturio.com/certificate/${certificateId}`,
  });
}

/**
 * Check if email service is configured
 */
export function isEmailServiceConfigured(): boolean {
  return !!SENDGRID_API_KEY;
}

export { NOREPLY_EMAIL, SUPPORT_EMAIL };
