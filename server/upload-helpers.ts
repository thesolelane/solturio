import multer from "multer";
import sharp from "sharp";
import { createHash } from "crypto";
import path from "path";
import fs from "fs/promises";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const THUMBNAILS_DIR = path.join(UPLOAD_DIR, "thumbnails");

fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);
fs.mkdir(THUMBNAILS_DIR, { recursive: true }).catch(console.error);

const ALLOWED_MIME_TYPES = new Set([
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
]);

const EXTENSION_TO_MIME_TYPES: Record<string, string[]> = {
  png: ["image/png"],
  jpg: ["image/jpeg", "image/jpg"],
  jpeg: ["image/jpeg", "image/jpg"],
  gif: ["image/gif"],
  webp: ["image/webp"],
  svg: ["image/svg+xml"],
  tif: ["image/tiff"],
  tiff: ["image/tiff"],
  pdf: ["application/pdf"],
  txt: ["text/plain"],
  mp3: ["audio/mpeg"],
  wav: ["audio/wav"],
  ogg: ["audio/ogg"],
  flac: ["audio/flac"],
  aif: ["audio/aiff", "audio/x-aiff"],
  aiff: ["audio/aiff", "audio/x-aiff"],
  m4a: ["audio/mp4"],
  mp4: ["audio/mp4", "video/mp4"],
  webm: ["audio/webm", "video/webm"],
  zip: ["application/zip", "application/x-zip-compressed"],
  js: ["text/javascript"],
  ts: ["text/typescript"],
  json: ["application/json"],
  html: ["text/html"],
  css: ["text/css"],
};

const SVG_DANGEROUS_PATTERN =
  /<script\b|<foreignObject\b|\bonload\s*=|\bonerror\s*=|javascript:/i;

export class InvalidUploadError extends Error {
  status = 400;
  statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "InvalidUploadError";
  }
}

function getFileExtension(fileName: string): string {
  const safeName = path.basename(fileName).trim();
  const extension = safeName.split(".").pop();
  return extension ? extension.toLowerCase() : "";
}

function ensureSafeFileName(fileName: string): string {
  const safeName = path.basename(fileName).trim();

  if (!safeName) {
    throw new InvalidUploadError("Uploaded file must have a name.");
  }

  if (safeName !== fileName.trim()) {
    throw new InvalidUploadError("Invalid file name.");
  }

  if (
    safeName.startsWith(".") ||
    safeName === "Thumbs.db" ||
    safeName === "desktop.ini" ||
    /[\u0000-\u001f]/.test(safeName)
  ) {
    throw new InvalidUploadError("Unsupported file name.");
  }

  return safeName;
}

function detectUploadCategory(file: Express.Multer.File):
  | "image"
  | "svg"
  | "pdf"
  | "text"
  | "zip"
  | "audio"
  | "video" {
  const extension = getFileExtension(file.originalname);
  const allowedForExtension = EXTENSION_TO_MIME_TYPES[extension];

  if (allowedForExtension && !allowedForExtension.includes(file.mimetype)) {
    throw new InvalidUploadError(`File type does not match extension for ${file.originalname}.`);
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new InvalidUploadError(`Unsupported file type: ${file.mimetype || "unknown"}.`);
  }

  if (file.mimetype === "image/svg+xml") return "svg";
  if (file.mimetype.startsWith("image/")) return "image";
  if (file.mimetype === "application/pdf") return "pdf";
  if (
    file.mimetype === "text/plain" ||
    file.mimetype === "text/javascript" ||
    file.mimetype === "text/typescript" ||
    file.mimetype === "application/json" ||
    file.mimetype === "text/html" ||
    file.mimetype === "text/css"
  ) {
    return "text";
  }
  if (file.mimetype === "application/zip" || file.mimetype === "application/x-zip-compressed") {
    return "zip";
  }
  if (file.mimetype.startsWith("audio/")) return "audio";
  if (file.mimetype.startsWith("video/")) return "video";

  throw new InvalidUploadError(`Unsupported file type: ${file.mimetype || "unknown"}.`);
}

function ensureBufferHasNoNullBytes(buffer: Buffer, fileName: string) {
  if (buffer.includes(0)) {
    throw new InvalidUploadError(`${fileName} is not a valid text-based file.`);
  }
}

function validateAudioBuffer(buffer: Buffer, mimetype: string, fileName: string) {
  const isMp3 = buffer.subarray(0, 3).equals(Buffer.from("ID3")) || buffer[0] === 0xff;
  const isWav =
    buffer.subarray(0, 4).equals(Buffer.from("RIFF")) &&
    buffer.subarray(8, 12).equals(Buffer.from("WAVE"));
  const isOgg = buffer.subarray(0, 4).equals(Buffer.from("OggS"));
  const isFlac = buffer.subarray(0, 4).equals(Buffer.from("fLaC"));
  const isAiff =
    buffer.subarray(0, 4).equals(Buffer.from("FORM")) &&
    (buffer.subarray(8, 12).equals(Buffer.from("AIFF")) ||
      buffer.subarray(8, 12).equals(Buffer.from("AIFC")));
  const isMp4 = buffer.subarray(4, 8).equals(Buffer.from("ftyp"));
  const isWebm = buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));

  const valid =
    (mimetype === "audio/mpeg" && isMp3) ||
    (mimetype === "audio/wav" && isWav) ||
    (mimetype === "audio/ogg" && isOgg) ||
    (mimetype === "audio/flac" && isFlac) ||
    ((mimetype === "audio/aiff" || mimetype === "audio/x-aiff") && isAiff) ||
    (mimetype === "audio/mp4" && isMp4) ||
    (mimetype === "audio/webm" && isWebm);

  if (!valid) {
    throw new InvalidUploadError(`${fileName} content does not match its audio type.`);
  }
}

function validateVideoBuffer(buffer: Buffer, mimetype: string, fileName: string) {
  const isMp4 = buffer.subarray(4, 8).equals(Buffer.from("ftyp"));
  const isWebm = buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));

  const valid =
    (mimetype === "video/mp4" && isMp4) || (mimetype === "video/webm" && isWebm);

  if (!valid) {
    throw new InvalidUploadError(`${fileName} content does not match its video type.`);
  }
}

export async function assertValidUploadFile(file: Express.Multer.File): Promise<Express.Multer.File> {
  const safeName = ensureSafeFileName(file.originalname);

  if (!file.buffer || file.buffer.length === 0 || file.size <= 0) {
    throw new InvalidUploadError(`${safeName} is empty.`);
  }

  const category = detectUploadCategory(file);

  switch (category) {
    case "image": {
      const metadata = await sharp(file.buffer).metadata();
      if (!metadata.width || !metadata.height || !metadata.format) {
        throw new InvalidUploadError(`${safeName} is not a valid image file.`);
      }
      break;
    }
    case "svg": {
      const svgText = file.buffer.toString("utf8").trim();
      if (!svgText.includes("<svg") || SVG_DANGEROUS_PATTERN.test(svgText)) {
        throw new InvalidUploadError(`${safeName} contains unsafe or invalid SVG content.`);
      }
      break;
    }
    case "pdf":
      if (!file.buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
        throw new InvalidUploadError(`${safeName} is not a valid PDF file.`);
      }
      break;
    case "text":
      ensureBufferHasNoNullBytes(file.buffer, safeName);
      break;
    case "zip": {
      const header = file.buffer.subarray(0, 4);
      const isZip =
        header.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) ||
        header.equals(Buffer.from([0x50, 0x4b, 0x05, 0x06])) ||
        header.equals(Buffer.from([0x50, 0x4b, 0x07, 0x08]));
      if (!isZip) {
        throw new InvalidUploadError(`${safeName} is not a valid ZIP archive.`);
      }
      break;
    }
    case "audio":
      validateAudioBuffer(file.buffer, file.mimetype, safeName);
      break;
    case "video":
      validateVideoBuffer(file.buffer, file.mimetype, safeName);
      break;
  }

  file.originalname = safeName;
  return file;
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, true);
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
