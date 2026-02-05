/**
 * Watermark Protection Service
 * 
 * Provides file watermarking for IP protection before IPFS upload.
 * - Code files: Comment header + hidden steganographic mark (zero-width characters)
 * - Binary files: Companion .solturio manifest file
 */

import { createHash } from "crypto";

export interface WatermarkRequest {
  content: string;
  filename: string;
  isclId: string;
  ownerWallet: string;
}

export interface WatermarkResult {
  success: boolean;
  watermarkedContent?: string;
  watermarkHash: string;
  method: 'code_comment' | 'manifest_file';
  verifyUrl: string;
  manifestContent?: string;
  error?: string;
}

export interface ManifestData {
  version: string;
  isclId: string;
  ownerWallet: string;
  fileHash: string;
  timestamp: string;
  verifyUrl: string;
  signature: string;
}

const ZERO_WIDTH_CHARS = {
  ZERO: '\u200B',
  ONE: '\u200C',
  SEPARATOR: '\u200D',
  END: '\uFEFF',
};

const CODE_EXTENSIONS = [
  '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
  '.py', '.pyw',
  '.rs',
  '.sol',
  '.go',
  '.java', '.kt', '.scala',
  '.c', '.cpp', '.h', '.hpp', '.cc',
  '.cs',
  '.rb',
  '.php',
  '.swift',
  '.sh', '.bash', '.zsh',
  '.sql',
  '.css', '.scss', '.sass', '.less',
  '.html', '.htm', '.xml',
  '.yaml', '.yml',
  '.toml',
  '.lua',
  '.r', '.R',
  '.pl', '.pm',
];

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];
const DOCUMENT_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.md', '.rtf', '.odt'];

export function getFileCategory(filename: string): 'code' | 'audio' | 'image' | 'document' | 'generic' {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  
  if (CODE_EXTENSIONS.includes(ext)) return 'code';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (DOCUMENT_EXTENSIONS.includes(ext)) return 'document';
  return 'generic';
}

export function getSupportedTypes(): Record<string, { extensions: string[]; method: string }> {
  return {
    code: {
      extensions: CODE_EXTENSIONS,
      method: 'Comment header + hidden steganographic mark',
    },
    audio: {
      extensions: AUDIO_EXTENSIONS,
      method: 'Companion .solturio manifest file',
    },
    image: {
      extensions: IMAGE_EXTENSIONS,
      method: 'Companion .solturio manifest file',
    },
    document: {
      extensions: DOCUMENT_EXTENSIONS,
      method: 'Companion .solturio manifest file',
    },
    generic: {
      extensions: ['*'],
      method: 'Companion .solturio manifest file',
    },
  };
}

function getCommentStyle(filename: string): { start: string; end: string; single: string } {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  
  if (['.py', '.pyw', '.sh', '.bash', '.zsh', '.yaml', '.yml', '.toml', '.r', '.R', '.pl', '.pm', '.rb'].includes(ext)) {
    return { start: '', end: '', single: '#' };
  }
  if (['.html', '.htm', '.xml', '.svg'].includes(ext)) {
    return { start: '<!--', end: '-->', single: '' };
  }
  if (['.css', '.scss', '.sass', '.less'].includes(ext)) {
    return { start: '/*', end: '*/', single: '' };
  }
  if (['.sql', '.lua'].includes(ext)) {
    return { start: '--[[', end: ']]', single: '--' };
  }
  return { start: '/*', end: '*/', single: '//' };
}

function stringToBinary(str: string): string {
  return str.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join('');
}

function binaryToString(binary: string): string {
  const bytes = binary.match(/.{8}/g) || [];
  return bytes.map(byte => String.fromCharCode(parseInt(byte, 2))).join('');
}

function encodeHiddenMark(data: string): string {
  const binary = stringToBinary(data);
  let encoded = '';
  
  for (const bit of binary) {
    encoded += bit === '0' ? ZERO_WIDTH_CHARS.ZERO : ZERO_WIDTH_CHARS.ONE;
  }
  
  return ZERO_WIDTH_CHARS.SEPARATOR + encoded + ZERO_WIDTH_CHARS.END;
}

function decodeHiddenMark(content: string): string | null {
  const separatorIndex = content.indexOf(ZERO_WIDTH_CHARS.SEPARATOR);
  const endIndex = content.indexOf(ZERO_WIDTH_CHARS.END);
  
  if (separatorIndex === -1 || endIndex === -1 || endIndex <= separatorIndex) {
    return null;
  }
  
  const encoded = content.substring(separatorIndex + 1, endIndex);
  let binary = '';
  
  for (const char of encoded) {
    if (char === ZERO_WIDTH_CHARS.ZERO) binary += '0';
    else if (char === ZERO_WIDTH_CHARS.ONE) binary += '1';
  }
  
  if (binary.length % 8 !== 0) return null;
  
  const decoded = binaryToString(binary);
  
  // Validate hash format: must be 32 hex characters
  if (!/^[a-f0-9]{32}$/i.test(decoded)) {
    return null;
  }
  
  return decoded;
}

export function generateWatermarkHash(isclId: string, ownerWallet: string, timestamp: string): string {
  const data = `${isclId}:${ownerWallet}:${timestamp}`;
  return createHash('sha256').update(data).digest('hex').substring(0, 32);
}

export function generateManifest(params: {
  isclId: string;
  ownerWallet: string;
  fileHash: string;
}): ManifestData {
  const timestamp = new Date().toISOString();
  const watermarkHash = generateWatermarkHash(params.isclId, params.ownerWallet, timestamp);
  
  const signatureData = `${params.isclId}:${params.ownerWallet}:${params.fileHash}:${timestamp}`;
  const signature = createHash('sha256').update(signatureData).digest('hex');
  
  return {
    version: '1.0',
    isclId: params.isclId,
    ownerWallet: params.ownerWallet,
    fileHash: params.fileHash,
    timestamp,
    verifyUrl: `https://solturio.com/verify/${params.isclId}`,
    signature,
  };
}

export function applyWatermark(request: WatermarkRequest): WatermarkResult {
  const { content, filename, isclId, ownerWallet } = request;
  const category = getFileCategory(filename);
  const timestamp = new Date().toISOString();
  const watermarkHash = generateWatermarkHash(isclId, ownerWallet, timestamp);
  const verifyUrl = `https://solturio.com/verify/${isclId}`;
  
  if (category === 'code') {
    const commentStyle = getCommentStyle(filename);
    const hiddenMark = encodeHiddenMark(watermarkHash);
    
    let header: string;
    if (commentStyle.start && commentStyle.end) {
      header = `${commentStyle.start}
 * PROTECTED BY SOLTURIO - IP Protection Certificate
 * ISCL ID: ${isclId}
 * Owner: ${ownerWallet}
 * Registered: ${timestamp}
 * Verify: ${verifyUrl}
 * Hash: ${watermarkHash}
 ${commentStyle.end}${hiddenMark}

`;
    } else {
      header = `${commentStyle.single} PROTECTED BY SOLTURIO - IP Protection Certificate
${commentStyle.single} ISCL ID: ${isclId}
${commentStyle.single} Owner: ${ownerWallet}
${commentStyle.single} Registered: ${timestamp}
${commentStyle.single} Verify: ${verifyUrl}
${commentStyle.single} Hash: ${watermarkHash}
${hiddenMark}

`;
    }
    
    return {
      success: true,
      watermarkedContent: header + content,
      watermarkHash,
      method: 'code_comment',
      verifyUrl,
    };
  }
  
  const fileHash = createHash('sha256').update(content).digest('hex');
  const manifest = generateManifest({ isclId, ownerWallet, fileHash });
  
  return {
    success: true,
    watermarkHash,
    method: 'manifest_file',
    verifyUrl,
    manifestContent: JSON.stringify(manifest, null, 2),
  };
}

export function verifyWatermark(content: string, filename: string): {
  found: boolean;
  watermarkHash?: string;
  isclId?: string;
  ownerWallet?: string;
  note?: string;
  error?: string;
} {
  const category = getFileCategory(filename);
  
  if (category === 'code') {
    // First try to find the steganographic hidden mark
    const hiddenMark = decodeHiddenMark(content);
    if (hiddenMark) {
      const isclMatch = content.match(/ISCL ID:\s*([a-zA-Z0-9_-]+)/);
      const ownerMatch = content.match(/Owner:\s*([a-zA-Z0-9]+)/);
      
      return {
        found: true,
        watermarkHash: hiddenMark,
        isclId: isclMatch?.[1],
        ownerWallet: ownerMatch?.[1],
        note: 'Watermark found. Verify hash against on-chain IPRegistration for ownership proof.',
      };
    }
    
    // Fallback to comment header hash
    const hashMatch = content.match(/Hash:\s*([a-f0-9]{32})/i);
    if (hashMatch) {
      const isclMatch = content.match(/ISCL ID:\s*([a-zA-Z0-9_-]+)/);
      const ownerMatch = content.match(/Owner:\s*([a-zA-Z0-9]+)/);
      
      return {
        found: true,
        watermarkHash: hashMatch[1],
        isclId: isclMatch?.[1],
        ownerWallet: ownerMatch?.[1],
        note: 'Watermark found in comment header. Verify hash against on-chain IPRegistration for ownership proof.',
      };
    }
    
    return { found: false, error: 'No Solturio watermark found in code file' };
  }
  
  return { found: false, error: 'Use manifest file for non-code files. Provide manifestContent in request.' };
}

export function extractWatermarkHash(content: string, filename: string): {
  found: boolean;
  hash?: string;
  method?: string;
  error?: string;
} {
  const category = getFileCategory(filename);
  
  if (category === 'code') {
    const hiddenMark = decodeHiddenMark(content);
    if (hiddenMark) {
      return { found: true, hash: hiddenMark, method: 'steganographic' };
    }
    
    const hashMatch = content.match(/Hash:\s*([a-f0-9]{32})/);
    if (hashMatch) {
      return { found: true, hash: hashMatch[1], method: 'comment_header' };
    }
    
    return { found: false, error: 'No watermark hash found' };
  }
  
  try {
    const manifest = JSON.parse(content) as ManifestData;
    if (manifest.signature && manifest.isclId) {
      const watermarkHash = generateWatermarkHash(manifest.isclId, manifest.ownerWallet, manifest.timestamp);
      return { found: true, hash: watermarkHash, method: 'manifest' };
    }
  } catch {
    return { found: false, error: 'Invalid manifest file' };
  }
  
  return { found: false, error: 'Could not extract watermark hash' };
}

export function verifyManifest(manifestContent: string, fileContent: string): {
  valid: boolean;
  manifest?: ManifestData;
  error?: string;
} {
  try {
    const manifest = JSON.parse(manifestContent) as ManifestData;
    
    if (!manifest.version || !manifest.isclId || !manifest.ownerWallet || !manifest.signature) {
      return { valid: false, error: 'Invalid manifest structure' };
    }
    
    const fileHash = createHash('sha256').update(fileContent).digest('hex');
    if (fileHash !== manifest.fileHash) {
      return { valid: false, error: 'File hash mismatch - file may have been modified' };
    }
    
    const signatureData = `${manifest.isclId}:${manifest.ownerWallet}:${manifest.fileHash}:${manifest.timestamp}`;
    const expectedSignature = createHash('sha256').update(signatureData).digest('hex');
    
    if (expectedSignature !== manifest.signature) {
      return { valid: false, error: 'Invalid manifest signature' };
    }
    
    return { valid: true, manifest };
  } catch (e) {
    return { valid: false, error: 'Failed to parse manifest JSON' };
  }
}
