import sharp from "sharp";
import axios from "axios";
import { VERIFICATION_ASSETS, getAssetUrl } from "@shared/verification-assets";

// Cache the badge buffer to avoid repeated downloads
let badgeBuffer: Buffer | null = null;

/**
 * Downloads and caches the verification badge from IPFS
 */
async function getBadgeBuffer(): Promise<Buffer> {
  if (badgeBuffer) {
    return badgeBuffer;
  }

  const badgeUrl = getAssetUrl(VERIFICATION_ASSETS.badge.cid, "pinata");
  console.log(`Downloading verification badge from: ${badgeUrl}`);

  const response = await axios.get(badgeUrl, { responseType: "arraybuffer" });
  badgeBuffer = Buffer.from(response.data);

  // Badge is already PNG with transparency - just resize for caching
  badgeBuffer = await sharp(badgeBuffer).resize(256, 256).ensureAlpha().png().toBuffer();

  return badgeBuffer;
}

/**
 * Creates a composite image with the verification badge overlayed
 * Badge is scaled to 5% of the smaller image dimension (capped)
 * Always placed in lower-left corner
 * @param imageBuffer - The original image buffer
 * @returns Buffer of the composite image with badge
 */
export async function createVerifiedImage(
  imageBuffer: Buffer,
  options: {
    badgeSizePercent?: number;
    marginPercent?: number;
  } = {}
): Promise<Buffer> {
  // Badge at 7% of image size, margin at 1%
  const { badgeSizePercent = 7, marginPercent = 1 } = options;

  try {
    // Get image metadata
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Unable to read image dimensions");
    }

    // Calculate badge size based on image dimensions (capped at 5%)
    const smallerDimension = Math.min(metadata.width, metadata.height);
    const badgeSize = Math.max(24, Math.floor(smallerDimension * (badgeSizePercent / 100)));

    // Calculate margin based on image size (1% of smaller dimension, min 4px)
    const margin = Math.max(4, Math.floor(smallerDimension * (marginPercent / 100)));

    // Get and resize the badge with transparency preserved
    const badge = await getBadgeBuffer();
    const resizedBadge = await sharp(badge)
      .resize(badgeSize, badgeSize)
      .ensureAlpha()
      .png()
      .toBuffer();

    // Calculate position (lower-left corner with margin)
    const left = margin;
    const top = metadata.height - badgeSize - margin;

    // Composite the badge onto the image
    const compositeImage = await sharp(imageBuffer)
      .composite([
        {
          input: resizedBadge,
          left,
          top,
        },
      ])
      .png()
      .toBuffer();

    return compositeImage;
  } catch (error) {
    console.error("Error creating verified image:", error);
    throw new Error(
      `Failed to create verified image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Checks if a file is an image that can be composited
 */
export function isCompositableImage(mimeType: string): boolean {
  const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/tiff"];
  return supportedTypes.includes(mimeType);
}

/**
 * Gets the appropriate output format for a verified image
 */
export function getVerifiedImageFormat(originalMimeType: string): {
  format: "png" | "jpeg" | "webp";
  mimeType: string;
} {
  // Always output as PNG for transparency support with the badge
  return { format: "png", mimeType: "image/png" };
}
