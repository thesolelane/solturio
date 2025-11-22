# Solturio Receipt Branding Setup

Your receipt template now includes **full Solturio branding** with your logo and gold badge. Follow these steps to connect your SendGrid assets.

## Step 1: Get Your Asset URLs from SendGrid

1. **Log in to SendGrid Dashboard** → https://sendgrid.com
2. **Navigate to:** Settings → Mail Settings → Event Webhook (or) Marketing → Content
3. **Find Asset Library** (usually under Marketing or Content section)
4. **Locate your uploaded assets:**
   - `solturio-logo-white-bg.png` - Your Solturio logo with white background
   - `solturio-gold-badge.png` - Your gold Solturio badge

5. **Copy the URLs:**
   - Right-click → **Copy Image Link** or
   - Click the asset → Copy the full URL provided

URLs should look like:
```
https://sendgrid.com/user_uploads/[unique-id]/solturio-logo-white-bg.png
```

## Step 2: Update Receipt Template

In `server/services/email.ts`, find the `sendDynamicReceipt()` function around line 336-345.

Replace these placeholder URLs with your actual SendGrid asset URLs:

```html
<!-- BEFORE: -->
<img src="https://cdn.sendgrid.net/v1/user_uploads/solturio-logo-white-bg.png" alt="Solturio" ... />
<img src="https://cdn.sendgrid.net/v1/user_uploads/solturio-gold-badge.png" alt="Solturio Badge" ... />

<!-- AFTER: (with your actual URLs) -->
<img src="https://sendgrid.com/user_uploads/YOUR_ASSET_ID_1/solturio-logo-white-bg.png" alt="Solturio" ... />
<img src="https://sendgrid.com/user_uploads/YOUR_ASSET_ID_2/solturio-gold-badge.png" alt="Solturio Badge" ... />
```

## Receipt Features

✅ **Professional Branding:**
- Solturio logo prominently displayed with white background
- Gold badge watermark (30% opacity) on header
- Gold accent color throughout (#D4AF37)

✅ **Line Items Table:**
- Description, Quantity, Unit Price, Total
- Gold column headers
- Clean, transparent design

✅ **Dynamic Content:**
- Customer name & email
- Registration type (Token Creator, Artwork Artist, etc.)
- Wallet address (if available)
- Transaction hash (if payment confirmed)

✅ **Status Indicators:**
- ✅ Confirmed (Green)
- ⏳ Pending (Orange)
- ❌ Failed (Red)

✅ **Call-to-Action:**
- Gold gradient button
- Links to dashboard
- Blockchain explorer link

## Sending Receipts

### Via Frontend
After payment, send receipt by calling `/api/receipt/send`:

```javascript
const response = await fetch('/api/receipt/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    registrationId: "REG-2025-001234",
    itemName: "Logo IP Protection Certificate",
    lineItems: [
      {
        description: "Logo Registration + NFT Certificate",
        quantity: 1,
        unitPrice: "0.1",
        currency: "SOL",
        subtotal: "0.1"
      },
      {
        description: "Platform Security Fee",
        quantity: 1,
        unitPrice: "0.01",
        currency: "SOL",
        subtotal: "0.01"
      }
    ],
    total: "0.11",
    currency: "SOL",
    registrationType: "Token Creator",
    txHash: "5X6xZ9mK2..." // Optional, for confirmed payments
  })
});
```

### Response
```json
{
  "success": true,
  "message": "Receipt sent successfully",
  "receiptId": "REG-2025-001234",
  "sentTo": "user@example.com"
}
```

## Troubleshooting

**Images not showing?**
- Verify SendGrid asset URLs are correct
- Check URLs are publicly accessible
- Use browser DevTools → Network tab to see if images load

**Wrong styling?**
- Clear email cache (some clients cache inline styles)
- Test with Gmail, Outlook, Apple Mail

**Font/Color issues?**
- Gold color: `#D4AF37` (primary brand)
- Dark text: `#2C3E50` (headings)
- Light text: `#888` (secondary info)

## Email Templates Included

1. **Registration Confirmation** - Sent immediately after logo upload
2. **Payment Confirmation** - Sent after payment verified
3. **Wallet Created** - Sent when xxx.solturio.sol wallet created
4. **NFT Minting Started** - Sent when minting begins
5. **NFT Minting Complete** - Sent when certificate ready
6. **Dynamic Receipt** - Customizable with line items & logo

All templates include your Solturio branding once assets are connected.

---

**Questions?** Check the email logs: `console.log()` shows sent/failed emails with details.
