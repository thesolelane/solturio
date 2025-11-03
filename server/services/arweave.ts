import Arweave from "arweave";
import type { JWKInterface } from "arweave/node/lib/wallet";

class ArweaveService {
  private arweave: Arweave;
  private wallet: JWKInterface | null = null;

  constructor() {
    // Initialize Arweave client
    this.arweave = Arweave.init({
      host: "arweave.net",
      port: 443,
      protocol: "https",
    });

    // Load wallet from environment if available
    this.loadWallet();
  }

  private loadWallet(): void {
    const walletKey = process.env.ARWEAVE_WALLET_KEY;
    if (walletKey) {
      try {
        this.wallet = JSON.parse(walletKey);
        console.log("Arweave: Wallet loaded successfully");
      } catch (error) {
        console.error("Arweave: Failed to parse wallet key:", error);
      }
    } else {
      console.warn("Arweave: No wallet configured - uploads will require payment");
    }
  }

  async getWalletBalance(): Promise<string | null> {
    if (!this.wallet) {
      console.warn("Arweave: No wallet configured");
      return null;
    }

    try {
      const address = await this.arweave.wallets.jwkToAddress(this.wallet);
      const winston = await this.arweave.wallets.getBalance(address);
      const ar = this.arweave.ar.winstonToAr(winston);
      return ar;
    } catch (error) {
      console.error("Arweave: Failed to get wallet balance:", error);
      return null;
    }
  }

  async uploadFile(
    fileBuffer: Buffer,
    contentType: string,
    tags: { name: string; value: string }[]
  ): Promise<{ txId: string; url: string } | null> {
    if (!this.wallet) {
      console.warn("Arweave: Cannot upload - no wallet configured");
      return null;
    }

    try {
      // Create transaction
      const transaction = await this.arweave.createTransaction(
        {
          data: fileBuffer,
        },
        this.wallet
      );

      // Add content-type tag
      transaction.addTag("Content-Type", contentType);

      // Add custom tags
      tags.forEach((tag) => {
        transaction.addTag(tag.name, tag.value);
      });

      // Add Solturio platform tags
      transaction.addTag("App-Name", "Solturio");
      transaction.addTag("App-Version", "1.0.0");
      transaction.addTag("Unix-Time", Math.round(Date.now() / 1000).toString());

      // Sign transaction
      await this.arweave.transactions.sign(transaction, this.wallet);

      // Submit transaction
      const response = await this.arweave.transactions.post(transaction);

      if (response.status === 200) {
        const txId = transaction.id;
        return {
          txId,
          url: `https://arweave.net/${txId}`,
        };
      }

      console.error("Arweave: Upload failed with status:", response.status);
      return null;
    } catch (error) {
      console.error("Arweave: Upload failed:", error);
      return null;
    }
  }

  async uploadJSON(
    jsonData: any,
    tags: { name: string; value: string }[]
  ): Promise<{ txId: string; url: string } | null> {
    const jsonBuffer = Buffer.from(JSON.stringify(jsonData));
    return this.uploadFile(jsonBuffer, "application/json", tags);
  }

  async getTransaction(txId: string): Promise<any | null> {
    try {
      const transaction = await this.arweave.transactions.get(txId);
      return transaction;
    } catch (error) {
      console.error(`Arweave: Failed to get transaction ${txId}:`, error);
      return null;
    }
  }

  async getTransactionStatus(txId: string): Promise<any | null> {
    try {
      const status = await this.arweave.transactions.getStatus(txId);
      return status;
    } catch (error) {
      console.error(`Arweave: Failed to get status for ${txId}:`, error);
      return null;
    }
  }

  async getData(txId: string): Promise<string | null> {
    try {
      const transaction = await this.arweave.transactions.get(txId);
      const data = transaction.get("data", { decode: true, string: true });
      return data as string;
    } catch (error) {
      console.error(`Arweave: Failed to get data for ${txId}:`, error);
      return null;
    }
  }

  getGatewayUrl(txId: string): string {
    return `https://arweave.net/${txId}`;
  }

  getSolturioGatewayUrl(txId: string): string {
    // Future: Use Solturio's own Arweave gateway
    return `https://arweave.solturio.app/${txId}`;
  }

  isConfigured(): boolean {
    return this.wallet !== null;
  }

  async estimateCost(dataSize: number): Promise<string | null> {
    try {
      const winston = await this.arweave.transactions.getPrice(dataSize);
      const ar = this.arweave.ar.winstonToAr(winston);
      return ar;
    } catch (error) {
      console.error("Arweave: Failed to estimate cost:", error);
      return null;
    }
  }
}

export const arweaveService = new ArweaveService();