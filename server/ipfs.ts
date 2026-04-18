import axios from "axios";
import FormData from "form-data";
import { createHash } from "crypto";
import { env } from "./env";

// IPFS configuration - uses Pinata for reliable pinning
// User will need to provide their own Pinata keys for production
const PINATA_API_KEY = env.pinataApiKey || "";
const PINATA_SECRET_KEY = env.pinataSecretKey || "";
const PINATA_JWT = env.pinataJwt || "";

// Public IPFS gateways for retrieval
const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.ipfs.io/ipfs/",
];

interface IPFSUploadResult {
  ipfsHash: string;
  pinSize: number;
  timestamp: string;
  gatewayUrl: string;
}

interface IPFSMetadata {
  name: string;
  keyvalues?: Record<string, any>;
}

/**
 * Upload a file to IPFS via Pinata
 */
export async function uploadToIPFS(
  buffer: Buffer,
  fileName: string,
  metadata?: IPFSMetadata
): Promise<IPFSUploadResult> {
  // If no Pinata credentials, return mock data for development
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    const mockHash = createHash("sha256").update(buffer).digest("hex");
    return {
      ipfsHash: `Qm${mockHash.substring(0, 44)}`, // Mock IPFS hash format
      pinSize: buffer.length,
      timestamp: new Date().toISOString(),
      gatewayUrl: `https://ipfs.io/ipfs/Qm${mockHash.substring(0, 44)}`,
    };
  }

  try {
    const formData = new FormData();
    formData.append("file", buffer, fileName);

    if (metadata) {
      const pinataMetadata = JSON.stringify({
        name: metadata.name,
        keyvalues: metadata.keyvalues || {},
      });
      formData.append("pinataMetadata", pinataMetadata);
    }

    const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      headers: {
        ...formData.getHeaders(),
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      maxBodyLength: Infinity,
    });

    return {
      ipfsHash: response.data.IpfsHash,
      pinSize: response.data.PinSize,
      timestamp: response.data.Timestamp || new Date().toISOString(),
      gatewayUrl: `${IPFS_GATEWAYS[0]}${response.data.IpfsHash}`,
    };
  } catch (error: any) {
    console.error("IPFS upload failed:", error.response?.data || error.message);
    throw new Error(`Failed to upload to IPFS: ${error.message}`);
  }
}

/**
 * Upload JSON metadata to IPFS
 */
export async function uploadJSONToIPFS(
  data: Record<string, any>,
  metadata?: IPFSMetadata
): Promise<IPFSUploadResult> {
  // If no Pinata credentials, return mock data for development
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    const jsonString = JSON.stringify(data);
    const mockHash = createHash("sha256").update(jsonString).digest("hex");
    return {
      ipfsHash: `Qm${mockHash.substring(0, 44)}`,
      pinSize: jsonString.length,
      timestamp: new Date().toISOString(),
      gatewayUrl: `https://ipfs.io/ipfs/Qm${mockHash.substring(0, 44)}`,
    };
  }

  try {
    const response = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", data, {
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
    });

    return {
      ipfsHash: response.data.IpfsHash,
      pinSize: response.data.PinSize,
      timestamp: response.data.Timestamp || new Date().toISOString(),
      gatewayUrl: `${IPFS_GATEWAYS[0]}${response.data.IpfsHash}`,
    };
  } catch (error: any) {
    console.error("IPFS JSON upload failed:", error.response?.data || error.message);
    throw new Error(`Failed to upload JSON to IPFS: ${error.message}`);
  }
}

/**
 * Get file from IPFS using multiple gateways
 */
export async function getFromIPFS(ipfsHash: string): Promise<Buffer> {
  let lastError: Error | null = null;

  // Try each gateway until one succeeds
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await axios.get(`${gateway}${ipfsHash}`, {
        responseType: "arraybuffer",
        timeout: 30000, // 30 second timeout
      });
      return Buffer.from(response.data);
    } catch (error: any) {
      lastError = error;
      console.warn(`Gateway ${gateway} failed:`, error.message);
      continue;
    }
  }

  throw new Error(`Failed to retrieve from IPFS: ${lastError?.message || "All gateways failed"}`);
}

/**
 * Verify file integrity by comparing hashes
 */
export function verifyIPFSContent(buffer: Buffer, expectedHash: string): boolean {
  // For IPFS CIDs, we would need to decode the multihash
  // For simplicity, we'll use SHA-256 verification
  const actualHash = createHash("sha256").update(buffer).digest("hex");
  return actualHash === expectedHash;
}

/**
 * Generate IPFS metadata for a logo
 */
export function generateLogoMetadata(logo: {
  fileName: string;
  description: string;
  ownershipDescription: string;
  userId: string;
  timestamp: Date;
  copyrightStatus?: string | null;
  trademarkStatus?: string | null;
  patentStatus?: string | null;
}): Record<string, any> {
  return {
    name: logo.fileName,
    description: logo.description,
    image: "", // Will be filled with IPFS hash
    attributes: [
      {
        trait_type: "Owner",
        value: logo.userId,
      },
      {
        trait_type: "Registration Date",
        value: logo.timestamp.toISOString(),
      },
      {
        trait_type: "Ownership Claim",
        value: logo.ownershipDescription,
      },
      ...(logo.copyrightStatus && logo.copyrightStatus !== "none"
        ? [
            {
              trait_type: "Copyright Status",
              value: logo.copyrightStatus,
            },
          ]
        : []),
      ...(logo.trademarkStatus && logo.trademarkStatus !== "none"
        ? [
            {
              trait_type: "Trademark Status",
              value: logo.trademarkStatus,
            },
          ]
        : []),
      ...(logo.patentStatus && logo.patentStatus !== "none"
        ? [
            {
              trait_type: "Patent Status",
              value: logo.patentStatus,
            },
          ]
        : []),
    ],
    properties: {
      category: "intellectual-property",
      files: [],
      creators: [
        {
          address: logo.userId,
          share: 100,
        },
      ],
    },
  };
}
