import multer from "multer";
import sharp from "sharp";
import { createHash } from "crypto";
import path from "path";
import fs from "fs/promises";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const THUMBNAILS_DIR = path.join(UPLOAD_DIR, "thumbnails");

fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);
fs.mkdir(THUMBNAILS_DIR, { recursive: true }).catch(console.error);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "image/tiff",
      "application/pdf",
      "text/plain",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/flac",
      "audio/aiff",
      "audio/x-aiff",
      "audio/mp4",
      "audio/webm",
      "video/mp4",
      "video/webm",
      "application/zip",
      "application/x-zip-compressed",
      "text/javascript",
      "text/typescript",
      "application/json",
      "text/html",
      "text/css",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, true);
    }
  },
});

export async function generateThumbnail(
  buffer: Buffer,
  mimetype: string,
  logoId: string
): Promise<string | null> {
  try {
    const imageTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
      "image/tiff",
    ];

    if (!imageTypes.includes(mimetype)) {
      return null;
    }

    const thumbnailPath = path.join(THUMBNAILS_DIR, `${logoId}.jpg`);

    await sharp(buffer)
      .resize(200, 200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    return `/api/thumbnails/${logoId}.jpg`;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return null;
  }
}

export async function extractImageMetadata(buffer: Buffer, mimetype: string) {
  try {
    const fileHash = createHash("sha256").update(buffer).digest("hex");

    if (mimetype === "image/svg+xml") {
      const svgString = buffer.toString("utf-8");
      let width = 0;
      let height = 0;

      const viewBoxMatch = svgString.match(/viewBox=["']([^"']+)["']/);
      if (viewBoxMatch) {
        const viewBox = viewBoxMatch[1].split(/\s+/);
        if (viewBox.length === 4) {
          width = parseFloat(viewBox[2]);
          height = parseFloat(viewBox[3]);
        }
      }

      if (!width || !height) {
        const widthMatch = svgString.match(/\bwidth=["']?(\d+(?:\.\d+)?)/);
        const heightMatch = svgString.match(/\bheight=["']?(\d+(?:\.\d+)?)/);
        if (widthMatch) width = parseFloat(widthMatch[1]);
        if (heightMatch) height = parseFloat(heightMatch[1]);
      }

      return {
        width: Math.round(width) || 0,
        height: Math.round(height) || 0,
        format: "SVG",
        colorPalette: [],
        dominantColor: null,
        fileHash,
      };
    }

    const image = sharp(buffer);
    const metadata = await image.metadata();

    const stats = await image.stats();
    const dominantColor = `#${Math.round(stats.dominant.r).toString(16).padStart(2, "0")}${Math.round(stats.dominant.g).toString(16).padStart(2, "0")}${Math.round(stats.dominant.b).toString(16).padStart(2, "0")}`;

    let colorPalette = [dominantColor];
    try {
      const resized = await image
        .resize(100, 100, { fit: "inside" })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = resized.data;
      const channels = resized.info.channels;
      const colorMap = new Map<string, number>();

      for (let i = 0; i < pixels.length; i += channels * 10) {
        if (i + 2 < pixels.length) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
          colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
        }
      }

      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([color]) => color);

      colorPalette = sortedColors.length > 0 ? sortedColors : [dominantColor];
    } catch (paletteError) {
      console.warn("Could not extract full color palette:", paletteError);
    }

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format?.toUpperCase() || "UNKNOWN",
      colorPalette,
      dominantColor,
      fileHash,
    };
  } catch (error) {
    console.error("Error extracting image metadata:", error);
    return {
      width: 0,
      height: 0,
      format: "UNKNOWN",
      colorPalette: [],
      dominantColor: null,
      fileHash: createHash("sha256").update(buffer).digest("hex"),
    };
  }
}
