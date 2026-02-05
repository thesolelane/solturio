/**
 * Watermark Protection API Routes
 * 
 * Provides file watermarking endpoints for IP protection.
 * Call before IPFS upload to embed ownership proof.
 */

import { Router, Request, Response } from "express";
import { isAuthenticated } from "./replitAuth";
import {
  applyWatermark,
  verifyWatermark,
  generateManifest,
  extractWatermarkHash,
  verifyManifest,
  getSupportedTypes,
  getFileCategory,
} from "./services/watermark";
import { createHash } from "crypto";

export const watermarkRouter = Router();

/**
 * POST /api/watermark/apply
 * Apply watermark to file content
 */
watermarkRouter.post("/apply", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { content, filename, isclId, ownerWallet } = req.body;

    if (!content || !filename || !isclId || !ownerWallet) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: content, filename, isclId, ownerWallet",
      });
    }

    const result = applyWatermark({ content, filename, isclId, ownerWallet });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    console.error("Watermark apply error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to apply watermark",
    });
  }
});

/**
 * POST /api/watermark/verify
 * Verify file has valid watermark
 */
watermarkRouter.post("/verify", async (req: Request, res: Response) => {
  try {
    const { content, filename, manifestContent } = req.body;

    if (!content || !filename) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: content, filename",
      });
    }

    const category = getFileCategory(filename);

    if (category === 'code') {
      const result = verifyWatermark(content, filename);
      res.json({
        success: true,
        ...result,
      });
    } else if (manifestContent) {
      const result = verifyManifest(manifestContent, content);
      res.json({
        success: true,
        found: result.valid,
        manifest: result.manifest,
        error: result.error,
        note: result.valid ? 'Manifest verified. File hash matches and signature is valid.' : undefined,
      });
    } else {
      res.json({
        success: true,
        found: false,
        error: "Non-code files require manifestContent for verification",
      });
    }
  } catch (error: any) {
    console.error("Watermark verify error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to verify watermark",
    });
  }
});

/**
 * POST /api/watermark/generate-manifest
 * Generate .solturio manifest file for binary files
 */
watermarkRouter.post("/generate-manifest", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { fileContent, isclId, ownerWallet } = req.body;

    if (!fileContent || !isclId || !ownerWallet) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: fileContent, isclId, ownerWallet",
      });
    }

    const fileHash = createHash('sha256').update(fileContent).digest('hex');
    const manifest = generateManifest({ isclId, ownerWallet, fileHash });

    res.json({
      success: true,
      manifest,
      manifestJson: JSON.stringify(manifest, null, 2),
      suggestedFilename: `${isclId}.solturio`,
    });
  } catch (error: any) {
    console.error("Generate manifest error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate manifest",
    });
  }
});

/**
 * POST /api/watermark/extract-hash
 * Extract watermark hash from file
 */
watermarkRouter.post("/extract-hash", async (req: Request, res: Response) => {
  try {
    const { content, filename } = req.body;

    if (!content || !filename) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: content, filename",
      });
    }

    const result = extractWatermarkHash(content, filename);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Extract hash error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to extract hash",
    });
  }
});

/**
 * GET /api/watermark/supported-types
 * List supported file types and their watermarking methods
 */
watermarkRouter.get("/supported-types", (req: Request, res: Response) => {
  res.json({
    success: true,
    types: getSupportedTypes(),
    notes: {
      code: "Code files get a visible comment header plus hidden steganographic mark using zero-width Unicode characters",
      binary: "Binary files (audio, image, document) use a companion .solturio manifest file stored alongside the original in IPFS",
      verification: "Watermark hash can be verified against on-chain IPRegistration record",
    },
  });
});
