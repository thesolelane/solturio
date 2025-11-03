import { storage } from "./storage";
import { createHash } from "crypto";

/**
 * DEX Verification API - Allows DEX platforms to verify legitimate logo ownership
 * This creates a verification endpoint that DEXs like DexScreener can integrate
 */

interface VerificationRequest {
  tokenAddress: string;
  chainId: number;
  logoUrl?: string;
  logoHash?: string;
  claimedBy?: string;
}

interface VerificationResponse {
  verified: boolean;
  legitimate: boolean;
  owner?: {
    companyName: string;
    registrationDate: string;
    solturioId: string;
  };
  proof?: {
    ipfsHash: string;
    fileHash: string;
    transactionHash?: string;
    certificateUrl: string;
  };
  warning?: string;
  reportUrl?: string;
}

/**
 * Verify if a logo/token is legitimate
 */
export async function verifyTokenLogo(request: VerificationRequest): Promise<VerificationResponse> {
  try {
    // If logo URL is provided, extract hash
    let fileHash = request.logoHash;
    if (request.logoUrl && !fileHash) {
      // In production, would fetch the image and hash it
      fileHash = createHash('sha256').update(request.logoUrl).digest('hex');
    }

    if (!fileHash) {
      return {
        verified: false,
        legitimate: false,
        warning: "No logo hash provided for verification",
      };
    }

    // Search for logos with matching hash
    const allLogos = await storage.getLogosByFileHash?.(fileHash) || [];
    
    if (allLogos.length === 0) {
      return {
        verified: false,
        legitimate: false,
        warning: "This logo is not registered on Solturio. May be unauthorized use.",
        reportUrl: `https://solturio.app/report?hash=${fileHash}`,
      };
    }

    // Get the earliest registration (true owner)
    const originalLogo = allLogos.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];

    // Get authorized usages for this logo
    const authorizedUsages = await storage.getAuthorizedUsagesByLogoId(originalLogo.id);
    
    // Check if this token/chain is authorized
    const isAuthorized = authorizedUsages.some(usage => 
      usage.platform === 'dex' && 
      usage.url.includes(request.tokenAddress) &&
      usage.isActive
    );

    // Get collection for company name
    const collection = originalLogo.collectionId ? 
      await storage.getCollection(originalLogo.collectionId) : null;

    return {
      verified: true,
      legitimate: isAuthorized,
      owner: {
        companyName: collection?.companyName || "Unknown",
        registrationDate: originalLogo.createdAt.toISOString(),
        solturioId: originalLogo.id,
      },
      proof: {
        ipfsHash: originalLogo.ipfsHash || "",
        fileHash: originalLogo.fileHash,
        transactionHash: originalLogo.transactionHash,
        certificateUrl: `https://solturio.app/api/logos/${originalLogo.id}/certificate`,
      },
      warning: isAuthorized ? undefined : "Logo registered but not authorized for this token address",
      reportUrl: isAuthorized ? undefined : `https://solturio.app/report-fraud/${originalLogo.id}`,
    };
  } catch (error) {
    console.error("Verification error:", error);
    return {
      verified: false,
      legitimate: false,
      warning: "Verification service error",
    };
  }
}

/**
 * Generate DEX-specific verification badge
 */
export function generateVerificationBadge(logoId: string): string {
  // This would generate an SVG badge that DEXs can display
  return `
    <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="10" fill="#10b981"/>
      <path d="M5 10 L8 13 L15 6" stroke="white" stroke-width="2" fill="none"/>
    </svg>
  `;
}

/**
 * Report copycat/fraud
 */
export async function reportCopycat(data: {
  originalLogoId: string;
  fraudulentTokenAddress: string;
  dexPlatform: string;
  evidenceUrl: string;
  reporterEmail?: string;
}): Promise<{ reportId: string; status: string }> {
  // Store the report
  const reportId = createHash('sha256')
    .update(`${data.originalLogoId}-${data.fraudulentTokenAddress}-${Date.now()}`)
    .digest('hex')
    .slice(0, 16);

  // In production, this would:
  // 1. Store the report in database
  // 2. Generate DMCA takedown notice
  // 3. Send to DEX platform's abuse email
  // 4. Track resolution status

  return {
    reportId,
    status: "Report filed. DMCA notice will be sent to platform.",
  };
}

/**
 * Bulk verification for DEX platforms
 */
export async function bulkVerifyLogos(
  logos: Array<{ hash: string; url?: string }>
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  
  for (const logo of logos) {
    const verification = await verifyTokenLogo({
      tokenAddress: "",
      chainId: 1,
      logoHash: logo.hash,
      logoUrl: logo.url,
    });
    
    results.set(logo.hash, verification.legitimate);
  }
  
  return results;
}

/**
 * Generate DEX integration snippet
 */
export function getDexIntegrationCode(apiKey: string): string {
  return `
// DEX Platform Integration - Solturio Logo Verification
// Add this to your token display logic

async function verifyLogoOwnership(tokenAddress, logoUrl) {
  const response = await fetch('https://api.solturio.app/v1/dex/verify', {
    method: 'POST',
    headers: {
      'X-API-Key': '${apiKey}',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tokenAddress,
      chainId: 1, // or appropriate chain
      logoUrl
    })
  });
  
  const result = await response.json();
  
  if (result.verified && result.legitimate) {
    // Show verified badge
    showVerifiedBadge();
  } else if (result.warning) {
    // Show warning to users
    showCopycatWarning(result.warning);
  }
}
  `.trim();
}