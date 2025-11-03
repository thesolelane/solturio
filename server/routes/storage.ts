import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { ipfsService } from "../services/ipfs";
import { arweaveService } from "../services/arweave";
import multer from "multer";
import sharp from "sharp";

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  }
});

// Check storage service status
router.get("/status", requireAuth, async (req, res) => {
  try {
    const ipfsConfigured = ipfsService.isConfigured();
    const arweaveConfigured = arweaveService.isConfigured();
    const ipfsAuth = ipfsConfigured ? await ipfsService.testAuthentication() : false;
    const arweaveBalance = arweaveConfigured ? await arweaveService.getWalletBalance() : null;

    res.json({
      ipfs: {
        configured: ipfsConfigured,
        authenticated: ipfsAuth,
        gateway: ipfsConfigured ? "https://ipfs.io" : null,
      },
      arweave: {
        configured: arweaveConfigured,
        balance: arweaveBalance,
        gateway: "https://arweave.net",
      },
    });
  } catch (error) {
    console.error("Storage status error:", error);
    res.status(500).json({ error: "Failed to check storage status" });
  }
});

// Upload file to IPFS
router.post("/ipfs/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    if (!ipfsService.isConfigured()) {
      return res.status(503).json({ error: "IPFS service not configured" });
    }

    // Extract metadata
    const metadata = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user!.email,
      uploadedAt: new Date().toISOString(),
      platform: "Solturio",
      ...req.body.metadata, // Additional metadata from request
    };

    // Upload to IPFS
    const result = await ipfsService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      metadata
    );

    if (!result) {
      return res.status(500).json({ error: "Failed to upload to IPFS" });
    }

    // Return IPFS details
    res.json({
      success: true,
      ipfsHash: result.ipfsHash,
      pinSize: result.pinSize,
      timestamp: result.timestamp,
      gatewayUrl: ipfsService.getGatewayUrl(result.ipfsHash),
      solturioUrl: ipfsService.getSolturioGatewayUrl(result.ipfsHash),
    });
  } catch (error) {
    console.error("IPFS upload error:", error);
    res.status(500).json({ error: "Failed to upload to IPFS" });
  }
});

// Upload file to Arweave
router.post("/arweave/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    if (!arweaveService.isConfigured()) {
      return res.status(503).json({ error: "Arweave service not configured" });
    }

    // Prepare tags
    const tags = [
      { name: "Original-Name", value: req.file.originalname },
      { name: "Content-Type", value: req.file.mimetype },
      { name: "Uploaded-By", value: req.user!.email },
      { name: "Platform", value: "Solturio" },
    ];

    // Add custom tags from request
    if (req.body.tags) {
      const customTags = JSON.parse(req.body.tags);
      tags.push(...customTags);
    }

    // Upload to Arweave
    const result = await arweaveService.uploadFile(
      req.file.buffer,
      req.file.mimetype,
      tags
    );

    if (!result) {
      return res.status(500).json({ error: "Failed to upload to Arweave" });
    }

    // Return Arweave details
    res.json({
      success: true,
      txId: result.txId,
      url: result.url,
      solturioUrl: arweaveService.getSolturioGatewayUrl(result.txId),
    });
  } catch (error) {
    console.error("Arweave upload error:", error);
    res.status(500).json({ error: "Failed to upload to Arweave" });
  }
});

// Upload JSON metadata to IPFS
router.post("/ipfs/metadata", requireAuth, async (req, res) => {
  try {
    if (!ipfsService.isConfigured()) {
      return res.status(503).json({ error: "IPFS service not configured" });
    }

    const { metadata, name } = req.body;

    if (!metadata || !name) {
      return res.status(400).json({ error: "Metadata and name are required" });
    }

    // Add platform metadata
    const enrichedMetadata = {
      ...metadata,
      platform: "Solturio",
      uploadedBy: req.user!.email,
      uploadedAt: new Date().toISOString(),
    };

    // Upload to IPFS
    const result = await ipfsService.uploadJSON(enrichedMetadata, name);

    if (!result) {
      return res.status(500).json({ error: "Failed to upload metadata to IPFS" });
    }

    res.json({
      success: true,
      ipfsHash: result.ipfsHash,
      pinSize: result.pinSize,
      timestamp: result.timestamp,
      gatewayUrl: ipfsService.getGatewayUrl(result.ipfsHash),
    });
  } catch (error) {
    console.error("IPFS metadata upload error:", error);
    res.status(500).json({ error: "Failed to upload metadata to IPFS" });
  }
});

// Upload JSON metadata to Arweave
router.post("/arweave/metadata", requireAuth, async (req, res) => {
  try {
    if (!arweaveService.isConfigured()) {
      return res.status(503).json({ error: "Arweave service not configured" });
    }

    const { metadata, tags = [] } = req.body;

    if (!metadata) {
      return res.status(400).json({ error: "Metadata is required" });
    }

    // Add platform metadata
    const enrichedMetadata = {
      ...metadata,
      platform: "Solturio",
      uploadedBy: req.user!.email,
      uploadedAt: new Date().toISOString(),
    };

    // Prepare tags
    const arweaveTags = [
      { name: "Type", value: "metadata" },
      { name: "Platform", value: "Solturio" },
      { name: "Uploaded-By", value: req.user!.email },
      ...tags,
    ];

    // Upload to Arweave
    const result = await arweaveService.uploadJSON(enrichedMetadata, arweaveTags);

    if (!result) {
      return res.status(500).json({ error: "Failed to upload metadata to Arweave" });
    }

    res.json({
      success: true,
      txId: result.txId,
      url: result.url,
    });
  } catch (error) {
    console.error("Arweave metadata upload error:", error);
    res.status(500).json({ error: "Failed to upload metadata to Arweave" });
  }
});

// Estimate Arweave storage cost
router.post("/arweave/estimate", requireAuth, async (req, res) => {
  try {
    const { dataSize } = req.body;

    if (!dataSize || dataSize <= 0) {
      return res.status(400).json({ error: "Invalid data size" });
    }

    const cost = await arweaveService.estimateCost(dataSize);

    res.json({
      dataSize,
      estimatedCost: cost,
      currency: "AR",
    });
  } catch (error) {
    console.error("Arweave estimate error:", error);
    res.status(500).json({ error: "Failed to estimate cost" });
  }
});

// Get IPFS file info
router.get("/ipfs/:hash", requireAuth, async (req, res) => {
  try {
    const { hash } = req.params;

    if (!ipfsService.isConfigured()) {
      return res.status(503).json({ error: "IPFS service not configured" });
    }

    const info = await ipfsService.getFileInfo(hash);

    if (!info) {
      return res.status(404).json({ error: "File not found on IPFS" });
    }

    res.json({
      ...info,
      gatewayUrl: ipfsService.getGatewayUrl(hash),
    });
  } catch (error) {
    console.error("IPFS info error:", error);
    res.status(500).json({ error: "Failed to get IPFS file info" });
  }
});

// Get Arweave transaction status
router.get("/arweave/:txId", requireAuth, async (req, res) => {
  try {
    const { txId } = req.params;

    const status = await arweaveService.getTransactionStatus(txId);

    if (!status) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json({
      txId,
      status,
      url: arweaveService.getGatewayUrl(txId),
    });
  } catch (error) {
    console.error("Arweave status error:", error);
    res.status(500).json({ error: "Failed to get transaction status" });
  }
});

export default router;