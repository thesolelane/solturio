import PinataClient from "@pinata/sdk";
import type { PinataPinOptions } from "@pinata/sdk";
import { Readable } from "stream";

class IPFSService {
  private pinata: PinataClient | null = null;

  constructor() {
    // Initialize Pinata if API keys are available
    const apiKey = process.env.PINATA_API_KEY;
    const secretKey = process.env.PINATA_SECRET_KEY;

    if (apiKey && secretKey) {
      this.pinata = new PinataClient(apiKey, secretKey);
    }
  }

  async testAuthentication(): Promise<boolean> {
    if (!this.pinata) {
      console.warn("IPFS: Pinata not configured - missing API keys");
      return false;
    }

    try {
      const result = await this.pinata.testAuthentication();
      console.log("IPFS: Pinata authentication successful");
      return true;
    } catch (error) {
      console.error("IPFS: Pinata authentication failed:", error);
      return false;
    }
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    metadata?: Record<string, any>
  ): Promise<{ ipfsHash: string; pinSize: number; timestamp: string } | null> {
    if (!this.pinata) {
      console.warn("IPFS: Cannot upload - Pinata not configured");
      return null;
    }

    try {
      // Create a readable stream from the buffer
      const readableStream = Readable.from(fileBuffer);

      const options: PinataPinOptions = {
        pinataMetadata: {
          name: fileName,
          keyvalues: metadata || {},
        },
        pinataOptions: {
          cidVersion: 1,
        },
      };

      const result = await this.pinata.pinFileToIPFS(readableStream, options);

      return {
        ipfsHash: result.IpfsHash,
        pinSize: result.PinSize,
        timestamp: result.Timestamp || new Date().toISOString(),
      };
    } catch (error) {
      console.error("IPFS: Upload failed:", error);
      return null;
    }
  }

  async uploadJSON(
    jsonData: any,
    name: string,
    metadata?: Record<string, any>
  ): Promise<{ ipfsHash: string; pinSize: number; timestamp: string } | null> {
    if (!this.pinata) {
      console.warn("IPFS: Cannot upload JSON - Pinata not configured");
      return null;
    }

    try {
      const options: PinataPinOptions = {
        pinataMetadata: {
          name: name,
          keyvalues: metadata || {},
        },
        pinataOptions: {
          cidVersion: 1,
        },
      };

      const result = await this.pinata.pinJSONToIPFS(jsonData, options);

      return {
        ipfsHash: result.IpfsHash,
        pinSize: result.PinSize,
        timestamp: result.Timestamp || new Date().toISOString(),
      };
    } catch (error) {
      console.error("IPFS: JSON upload failed:", error);
      return null;
    }
  }

  async unpinFile(ipfsHash: string): Promise<boolean> {
    if (!this.pinata) {
      console.warn("IPFS: Cannot unpin - Pinata not configured");
      return false;
    }

    try {
      await this.pinata.unpin(ipfsHash);
      console.log(`IPFS: Successfully unpinned ${ipfsHash}`);
      return true;
    } catch (error) {
      console.error(`IPFS: Failed to unpin ${ipfsHash}:`, error);
      return false;
    }
  }

  async getFileInfo(ipfsHash: string): Promise<any | null> {
    if (!this.pinata) {
      console.warn("IPFS: Cannot get file info - Pinata not configured");
      return null;
    }

    try {
      const filter = {
        hashContains: ipfsHash,
      };
      const result = await this.pinata.pinList(filter);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`IPFS: Failed to get info for ${ipfsHash}:`, error);
      return null;
    }
  }

  getGatewayUrl(ipfsHash: string): string {
    // Use Pinata's dedicated gateway if JWT is available, otherwise public gateway
    const pinataGateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
    const jwt = process.env.PINATA_JWT;
    
    if (jwt) {
      return `https://${pinataGateway}/ipfs/${ipfsHash}?pinataGatewayToken=${jwt}`;
    }
    return `https://ipfs.io/ipfs/${ipfsHash}`;
  }

  getCenturioGatewayUrl(ipfsHash: string): string {
    // Future: Use Centurio's own IPFS gateway
    return `https://ipfs.centurio.app/${ipfsHash}`;
  }

  isConfigured(): boolean {
    return this.pinata !== null;
  }
}

export const ipfsService = new IPFSService();