# Solturio Email Setup Guide

## Email Architecture

### Two Email Types:

1. **No-Reply Email (Transactional)**
   - Purpose: Registration confirmations, IP verification results, payment receipts
   - Service: SendGrid / AWS SES / Mailgun
   - Format: `noreply@solturio.com` or `noreply@yourdomain.com`
   - Cost: $0-20/month (depending on volume)
   - Users cannot reply to this

2. **Support Email (Communication)**
   - Purpose: User inquiries, disputes, general support
   - Service: Namecheap email hosting
   - Format: `support@solturio.com`
   - Cost: Usually $0-20/year (included with Namecheap domain)
   - Users CAN reply to support inquiries

---

## SETUP INSTRUCTIONS

### Step 1: Set Up Namecheap Email (Support Email)

**Go to:** https://www.namecheap.com/

1. Log into your Namecheap account
2. Find your `solturio.com` domain
3. Click "Manage" → "Email Hosting"
4. Create mailbox: `support@solturio.com`
5. Set password, add forwarding address if needed
6. Cost: Usually free or $5-10/year

**Result:**
- Email: `support@solturio.com`
- Password: [Your choice]
- Accessible via webmail or email client

---

### Step 2: Set Up No-Reply Email (Transactional)

**Recommended Service: SendGrid (Free tier available)**

#### Option A: SendGrid (Recommended for Startups)

1. Go to: https://sendgrid.com/
2. Sign up (free tier: 100 emails/day)
3. Verify domain:
   - Add DNS records to your domain registrar
   - Namecheap → DNS settings → Add SendGrid records
4. Create API key for backend
5. No-reply email: `noreply@solturio.com` (configured in SendGrid)

**Pricing:**
- Free: 100 emails/day
- Essentials: $9.95/month (unlimited)

#### Option B: AWS SES (Cheapest at Scale)

1. Go to: https://aws.amazon.com/ses/
2. Sign up for AWS
3. Request production access (takes 1 business day)
4. Verify domain in SES
5. Create SMTP credentials
6. No-reply email: `noreply@solturio.com`

**Pricing:**
- Free: 62K emails/month (if AWS account is within 12 months)
- Pay-as-you-go: $0.10 per 1K emails after free tier

#### Option C: Mailgun

1. Go to: https://www.mailgun.com/
2. Sign up (free tier: 100 emails/day)
3. Add domain
4. Get API key
5. No-reply email: `noreply@solturio.com`

**Pricing:**
- Free: 100 emails/day
- Standard: $35/month (unlimited)

---

## RECOMMENDED SETUP (FOR YOU)

**Best for Solturio:**
- **No-Reply Email:** SendGrid (free tier now, upgrade to Essentials $10/mo when you hit 100/day)
- **Support Email:** Namecheap (free/cheap, already with your domain)

**Why?**
- SendGrid is most developer-friendly
- Easy integration with Node.js/Express
- Clear delivery rates & analytics
- Free tier is generous (100/day)
- Scales well as you grow

---

## IMPLEMENTATION IN SOLTURIO APP

### Current Status:
- ❌ Email service not configured
- ❌ No email sending functions
- ✅ Can be added easily via SendGrid npm package

### Files to Update:

**1. Install SendGrid package:**
```bash
npm install @sendgrid/mail
```

**2. Create email service** (`server/services/email.ts`):
```typescript
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendTransactionalEmail(options: EmailOptions) {
  const msg = {
    to: options.to,
    from: "noreply@solturio.com", // Update to your domain
    subject: options.subject,
    text: options.text || "",
    html: options.html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${options.to}`);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export async function sendRegistrationConfirmation(
  userEmail: string,
  certificateId: string,
  solturioWallet: string
) {
  return sendTransactionalEmail({
    to: userEmail,
    subject: "Logo Registration Confirmation - Solturio",
    html: `
      <h2>Registration Confirmed! 🎉</h2>
      <p>Your logo has been successfully registered on Solturio.</p>
      
      <p><strong>Certificate ID:</strong> ${certificateId}</p>
      <p><strong>Solturio Wallet:</strong> ${solturioWallet}</p>
      
      <p>Your blockchain-verified proof of ownership is now immutable.</p>
      
      <p><strong>Next Steps:</strong></p>
      <ul>
        <li>View your certificate: <a href="https://solturio.com/cert/${certificateId}">solturio.com/cert/${certificateId}</a></li>
        <li>Add authorized usage locations</li>
        <li>Share your certificate for DEX verification</li>
      </ul>
      
      <p>Questions? Email us at support@solturio.com</p>
      
      <p>Built by Cooperanth Consulting LLC | CATH Ecosystem</p>
    `,
  });
}

export async function sendPaymentConfirmation(
  userEmail: string,
  amount: string,
  currency: string,
  txSignature: string
) {
  return sendTransactionalEmail({
    to: userEmail,
    subject: "Payment Received - Solturio",
    html: `
      <h2>Payment Received ✅</h2>
      <p>Thank you for registering with Solturio!</p>
      
      <p><strong>Amount:</strong> ${amount} ${currency}</p>
      <p><strong>Transaction:</strong> ${txSignature.substring(0, 20)}...</p>
      
      <p>Your logo registration is being processed. You'll receive your certificate within 24 hours.</p>
      
      <p>Questions? Email support@solturio.com</p>
    `,
  });
}

export async function sendVerificationComplete(
  userEmail: string,
  certificateId: string
) {
  return sendTransactionalEmail({
    to: userEmail,
    subject: "Social Verification Complete - Your NFT is Ready",
    html: `
      <h2>Verification Complete! 🎯</h2>
      <p>Your 24-hour social proof verification is complete.</p>
      
      <p>Your NFT certificate is now being minted on Solana.</p>
      
      <p><strong>Certificate ID:</strong> ${certificateId}</p>
      
      <p>View your blockchain proof: <a href="https://solturio.com/cert/${certificateId}">solturio.com/cert/${certificateId}</a></p>
      
      <p>Questions? Email support@solturio.com</p>
    `,
  });
}
```

**3. Add to environment variables** (request from user):
```
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
```

**4. Use in routes** (example):
```typescript
import { sendRegistrationConfirmation } from "@server/services/email";

router.post("/api/register", async (req, res) => {
  // ... registration logic ...
  
  await sendRegistrationConfirmation(
    userEmail,
    certificateId,
    solturioWallet
  );
  
  res.json({ success: true });
});
```

---

## EMAIL SENDING WORKFLOW

```
User completes registration
    ↓
Backend validates payment
    ↓
Backend stores in database
    ↓
Backend calls sendRegistrationConfirmation(userEmail, ...)
    ↓
SendGrid receives API call
    ↓
Email sent from noreply@solturio.com
    ↓
User receives confirmation email
    ↓
If user replies → Goes to support@solturio.com (Namecheap)
```

---

## ENVIRONMENT VARIABLES NEEDED

Add to `.env` (request from user via request_env_var):
```
SENDGRID_API_KEY=SG.your_api_key_here
NOREPLY_EMAIL=noreply@solturio.com
SUPPORT_EMAIL=support@solturio.com
```

---

## COST COMPARISON

| Service | Free Tier | Paid | Best For |
|---------|-----------|------|----------|
| **SendGrid** | 100/day | $9.95/mo | Easiest setup, great for startups |
| **AWS SES** | 62K/mo | $0.10/1K | Massive scale, cheapest |
| **Mailgun** | 100/day | $35/mo | European compliance needs |

**Recommendation:** Start with SendGrid free tier, upgrade to $9.95/mo when needed.

---

## CHECKLIST

- [ ] Create SendGrid account (free)
- [ ] Verify domain with SendGrid
- [ ] Get SendGrid API key
- [ ] Create Namecheap support@ email
- [ ] Install `@sendgrid/mail` package
- [ ] Create `server/services/email.ts`
- [ ] Add `SENDGRID_API_KEY` to environment
- [ ] Add email sending calls to registration routes
- [ ] Test email sending

---

## QUICK START (THIS WEEK)

**Option 1 (Fastest - 30 minutes):**
1. SignUp: SendGrid (https://sendgrid.com/)
2. Get API key
3. I'll add email service to the app
4. Cost: $0 (free tier)

**Option 2 (Complete - 1 hour):**
1. Setup: SendGrid + Namecheap email
2. I'll add email service to the app
3. Configure both support@ and noreply@ emails
4. Cost: $0-20/month

**Ready? Let me know which option!**
