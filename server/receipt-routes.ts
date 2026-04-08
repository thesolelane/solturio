import { Router } from "express";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import {
  sendDynamicReceipt,
  type ReceiptData,
  type LineItem,
} from "./services/email";

export const receiptRouter = Router();

function buildReceiptData(
  registrationId: string,
  customerName: string,
  email: string,
  registrationType: "Token Creator" | "Artwork Artist" | "General Registration",
  itemName: string,
  lineItems: LineItem[],
  total: string,
  currency: string = "SOL",
  paymentStatus: "confirmed" | "pending" | "failed" = "confirmed",
  txHash?: string,
  walletAddress?: string
): ReceiptData {
  const subtotal = lineItems
    .reduce((sum, item) => {
      return sum + parseFloat(item.subtotal);
    }, 0)
    .toFixed(6);

  return {
    registrationId,
    customerName,
    email,
    walletAddress,
    registrationType,
    itemName,
    lineItems,
    subtotal,
    total,
    currency,
    paymentStatus,
    txHash,
    timestamp: new Date().toISOString(),
  };
}

export { buildReceiptData };

receiptRouter.post("/receipt/send", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const {
      registrationId,
      itemName,
      lineItems,
      total,
      currency = "SOL",
      txHash,
      registrationType = "General Registration",
    } = req.body;

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!registrationId || !itemName || !lineItems || !total) {
      return res.status(400).json({
        error: "Missing required fields: registrationId, itemName, lineItems, total",
      });
    }

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({
        error: "lineItems must be a non-empty array",
      });
    }

    for (const item of lineItems) {
      if (!item.description || item.quantity === undefined || !item.unitPrice || !item.subtotal) {
        return res.status(400).json({
          error: "Each line item must have: description, quantity, unitPrice, subtotal",
        });
      }
    }

    const customerName =
      user.firstName || user.lastName
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
        : user.email || "Valued Customer";

    const receiptData = buildReceiptData(
      registrationId,
      customerName,
      user.email || "",
      registrationType as "Token Creator" | "Artwork Artist" | "General Registration",
      itemName,
      lineItems,
      total,
      currency,
      "confirmed",
      txHash,
      user.solanaPublicKey || undefined
    );

    const sent = await sendDynamicReceipt(receiptData);

    res.json({
      success: sent,
      message: sent
        ? "Receipt sent successfully"
        : "Email service not configured. Please set SENDGRID_API_KEY.",
      receiptId: registrationId,
      sentTo: user.email,
    });
  } catch (error: any) {
    console.error("Error sending receipt:", error);
    res.status(500).json({
      error: "Failed to send receipt",
      details: error.message,
    });
  }
});
