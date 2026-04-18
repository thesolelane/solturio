import sgMail from "@sendgrid/mail";
import { env } from "../env";

// Initialize SendGrid if API key is provided
const SENDGRID_API_KEY = env.sendgridApiKey;
const NOREPLY_EMAIL = env.noreplyEmail;
const SUPPORT_EMAIL = env.supportEmail;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: string;
  currency: string;
  subtotal: string;
}

export interface ReceiptData {
  registrationId: string;
  customerName: string;
  email: string;
  walletAddress?: string;
  registrationType: "Token Creator" | "Artwork Artist" | "General Registration";
  itemName: string;

  lineItems: LineItem[];

  subtotal: string;
  platformFee?: string;
  discount?: string;
  total: string;
  currency: string;

  paymentStatus: "confirmed" | "pending" | "failed";
  txHash?: string;
  timestamp: string;
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
export async function sendWalletCreated(userEmail: string, walletDomain: string): Promise<boolean> {
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

export async function sendEmailVerificationEmail(
  userEmail: string,
  verificationUrl: string,
  firstName?: string | null
): Promise<boolean> {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";

  return sendTransactionalEmail({
    to: userEmail,
    subject: "Verify Your Email - Solturio",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2C3E50;">Verify Your Email</h2>

        <p>${greeting}</p>
        <p>Confirm your email address to unlock wallet generation and protected account actions on Solturio.</p>

        <p style="margin: 24px 0;">
          <a
            href="${verificationUrl}"
            style="background: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;"
          >
            Verify Email
          </a>
        </p>

        <p>This verification link expires in 24 hours.</p>
        <p>If you did not request this, you can safely ignore this email.</p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="color: #888; font-size: 12px;">
          Need help? Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>
        </p>
      </div>
    `,
    text:
      `${greeting}\n\n` +
      `Verify your email for Solturio by opening this link:\n${verificationUrl}\n\n` +
      `This link expires in 24 hours.`,
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
 * Generate and send a dynamic receipt with line items
 */
export async function sendDynamicReceipt(receipt: ReceiptData): Promise<boolean> {
  const statusColors = {
    confirmed: "#27AE60",
    pending: "#F39C12",
    failed: "#E74C3C",
  };
  const statusIcons = {
    confirmed: "✅",
    pending: "⏳",
    failed: "❌",
  };

  // Build line items HTML table
  const lineItemsHtml = receipt.lineItems
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #f0f0f0;">
      <td style="padding: 12px 0; text-align: left; color: #333;">${item.description}</td>
      <td style="padding: 12px 0; text-align: center; color: #666; width: 60px;">${item.quantity}</td>
      <td style="padding: 12px 0; text-align: right; color: #666; width: 100px;">${item.unitPrice} ${item.currency}</td>
      <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #333; width: 100px;">${item.subtotal} ${item.currency}</td>
    </tr>
  `
    )
    .join("");

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #ffffff;">
      <!-- Header with Solturio Logo Branding -->
      <div style="background: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; position: relative; border-bottom: 3px solid #D4AF37;">
        <!-- Gold Badge Watermark (Top Right) -->
        <div style="position: absolute; top: 10px; right: 10px; opacity: 0.3;">
          <img src="https://cdn.sendgrid.net/v1/user_uploads/solturio-gold-badge.png" alt="Solturio Badge" style="width: 80px; height: auto;" />
        </div>
        
        <!-- Solturio Logo (White Background) -->
        <img src="https://cdn.sendgrid.net/v1/user_uploads/solturio-logo-white-bg.png" alt="Solturio" style="width: 180px; height: auto; margin: 0 auto; display: block;" />
        <p style="color: #2C3E50; margin: 10px 0 0 0; font-size: 13px; letter-spacing: 2px; font-weight: 600;">IP PROTECTION RECEIPT</p>
      </div>

      <!-- Main Receipt Container (Transparent Background) -->
      <div style="padding: 40px 30px; background: #fafbfc; border: 1px solid #e8ecf1; border-radius: 0 0 8px 8px;">
        
        <!-- Receipt Number & Status -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e8ecf1;">
          <div>
            <p style="margin: 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Receipt ID</p>
            <p style="margin: 5px 0 0 0; color: #2C3E50; font-size: 16px; font-weight: bold;">${receipt.registrationId}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Status</p>
            <p style="margin: 5px 0 0 0; color: ${statusColors[receipt.paymentStatus]}; font-size: 14px; font-weight: bold;">
              ${statusIcons[receipt.paymentStatus]} ${receipt.paymentStatus.toUpperCase()}
            </p>
          </div>
        </div>

        <!-- Customer Information -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; background: white; padding: 20px; border-radius: 6px; border: 1px solid #e8ecf1;">
          <div>
            <p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Customer Name</p>
            <p style="margin: 5px 0 0 0; color: #333; font-size: 15px; font-weight: 500;">${receipt.customerName}</p>
            
            <p style="margin: 15px 0 0 0; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
            <p style="margin: 5px 0 0 0; color: #3498DB; font-size: 14px; word-break: break-all;">${receipt.email}</p>
          </div>
          <div>
            <p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Registration Type</p>
            <p style="margin: 5px 0 0 0; color: #333; font-size: 15px; font-weight: 500;">${receipt.registrationType}</p>
            
            ${
              receipt.walletAddress
                ? `
              <p style="margin: 15px 0 0 0; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Wallet</p>
              <p style="margin: 5px 0 0 0; color: #666; font-size: 12px; word-break: break-all; font-family: monospace;">${receipt.walletAddress}</p>
            `
                : ""
            }
          </div>
        </div>

        <!-- Item Description -->
        <div style="background: white; padding: 20px; border-radius: 6px; border: 1px solid #e8ecf1; margin-bottom: 30px;">
          <p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Service Registered</p>
          <p style="margin: 8px 0 0 0; color: #333; font-size: 15px; font-weight: 500;">${receipt.itemName}</p>
        </div>

        <!-- Line Items Table Header -->
        <div style="margin-bottom: 5px;">
          <div style="display: grid; grid-template-columns: 1fr 60px 100px 100px; gap: 10px; padding: 12px 0; border-bottom: 2px solid #D4AF37;">
            <div style="text-align: left; color: #D4AF37; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Description</div>
            <div style="text-align: center; color: #D4AF37; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Qty</div>
            <div style="text-align: right; color: #D4AF37; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Unit Price</div>
            <div style="text-align: right; color: #D4AF37; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Total</div>
          </div>
        </div>

        <!-- Line Items -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>

        <!-- Totals Section -->
        <div style="background: white; border: 1px solid #e8ecf1; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e8ecf1;">
            <span style="color: #666; font-size: 14px;">Subtotal</span>
            <span style="color: #333; font-size: 14px; font-weight: 500;">${receipt.subtotal} ${receipt.currency}</span>
          </div>
          
          ${
            receipt.platformFee
              ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e8ecf1;">
              <span style="color: #666; font-size: 14px;">Platform Fee</span>
              <span style="color: #333; font-size: 14px; font-weight: 500;">${receipt.platformFee} ${receipt.currency}</span>
            </div>
          `
              : ""
          }
          
          ${
            receipt.discount
              ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e8ecf1;">
              <span style="color: #27AE60; font-size: 14px;">Discount</span>
              <span style="color: #27AE60; font-size: 14px; font-weight: 500;">-${receipt.discount} ${receipt.currency}</span>
            </div>
          `
              : ""
          }
          
          <div style="display: flex; justify-content: space-between; background: linear-gradient(135deg, #D4AF37 0%, #C9A227 100%); padding: 15px; border-radius: 4px;">
            <span style="color: white; font-size: 16px; font-weight: bold;">Total Amount</span>
            <span style="color: white; font-size: 18px; font-weight: bold;">${receipt.total} ${receipt.currency}</span>
          </div>
        </div>

        <!-- Transaction Details (if confirmed) -->
        ${
          receipt.paymentStatus === "confirmed" && receipt.txHash
            ? `
          <div style="background: #ecf7ed; border: 1px solid #d4edda; border-radius: 6px; padding: 15px; margin-bottom: 30px;">
            <p style="margin: 0; color: #155724; font-size: 12px; font-weight: bold; text-transform: uppercase;">Transaction Confirmed</p>
            <p style="margin: 8px 0 0 0; color: #666; font-size: 13px;">
              <strong>Hash:</strong> 
              <a href="https://solscan.io/tx/${receipt.txHash}" style="color: #3498DB; text-decoration: none; font-family: monospace; word-break: break-all;">
                ${receipt.txHash.substring(0, 32)}...
              </a>
            </p>
            <p style="margin: 8px 0 0 0; color: #666; font-size: 13px;">
              <strong>Date:</strong> ${new Date(receipt.timestamp).toLocaleString()}
            </p>
          </div>
        `
            : receipt.paymentStatus === "pending"
              ? `
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin-bottom: 30px;">
            <p style="margin: 0; color: #856404; font-size: 12px; font-weight: bold; text-transform: uppercase;">⏳ Payment Pending</p>
            <p style="margin: 8px 0 0 0; color: #666; font-size: 13px;">Your payment is being verified on the blockchain. This typically takes 2-5 minutes.</p>
          </div>
        `
              : ""
        }

        <!-- Next Steps -->
        <div style="background: #fffaf0; border: 1px solid #e8dcc8; border-left: 4px solid #D4AF37; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
          <p style="margin: 0; color: #D4AF37; font-size: 14px; font-weight: bold;">✅ What's Next?</p>
          <ul style="margin: 12px 0 0 0; padding-left: 20px; color: #333;">
            <li style="margin: 8px 0; font-size: 13px;">Create your Solturio wallet (xxx.solturio.sol)</li>
            <li style="margin: 8px 0; font-size: 13px;">Complete the Key Handover Ceremony</li>
            <li style="margin: 8px 0; font-size: 13px;">Mint your NFT certificate</li>
            <li style="margin: 8px 0; font-size: 13px;">Add authorized usage locations for protection</li>
          </ul>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="https://solturio.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #C9A227 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);">
            View Dashboard →
          </a>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e8ecf1; padding-top: 20px; text-align: center;">
          <p style="margin: 0; color: #888; font-size: 12px;">
            Questions? Contact us at 
            <a href="mailto:${SUPPORT_EMAIL}" style="color: #3498DB; text-decoration: none;">${SUPPORT_EMAIL}</a>
          </p>
          <p style="margin: 8px 0 0 0; color: #aaa; font-size: 11px;">
            Built by Cooperanth Consulting LLC • CATH Ecosystem<br>
            Your blockchain-verified IP protection platform
          </p>
        </div>
      </div>
    </div>
  `;

  return sendTransactionalEmail({
    to: receipt.email,
    subject: `Registration Receipt - ${receipt.registrationId}`,
    html,
    text: `Receipt ${receipt.registrationId}\n\nTotal: ${receipt.total} ${receipt.currency}\nStatus: ${receipt.paymentStatus}`,
  });
}

/**
 * Check if email service is configured
 */
export function isEmailServiceConfigured(): boolean {
  return !!SENDGRID_API_KEY;
}

export { NOREPLY_EMAIL, SUPPORT_EMAIL };
