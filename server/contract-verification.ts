import { storage } from "./storage";
import { createHash } from "crypto";

/**
 * Contract Address Verification System
 * Ties logos to specific contract addresses with gold verification for pre-launch registrations
 */

export interface ContractBinding {
  logoId: string;
  contractAddress: string;
  chainId: number;
  bindingDate: Date;
  verificationLevel: 'gold' | 'silver' | 'standard';
  prelaunchRegistration: boolean;
  ipfsProofUrl: string;
}

export interface VerificationStatus {
  hasGoldCheck: boolean;
  contractAddress?: string;
  registrationDate: Date;
  launchDate?: Date;
  daysBeforeLaunch?: number;
  verificationProof: string;
}

/**
 * Bind a logo to a contract address
 * Gold check if registered before contract deployment
 */
export async function bindLogoToContract(params: {
  logoId: string;
  contractAddress: string;
  chainId: number;
  deploymentDate: Date;
  deploymentTxHash?: string;
}): Promise<ContractBinding> {
  const { logoId, contractAddress, chainId, deploymentDate, deploymentTxHash } = params;
  
  // Get logo registration details
  const logo = await storage.getLogoById(logoId);
  if (!logo) {
    throw new Error("Logo not found");
  }

  // Determine verification level based on timing
  const registrationDate = new Date(logo.createdAt);
  const isPrelaunch = registrationDate < deploymentDate;
  const daysBefore = Math.floor((deploymentDate.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24));

  let verificationLevel: 'gold' | 'silver' | 'standard';
  if (isPrelaunch && daysBefore > 7) {
    verificationLevel = 'gold'; // Registered 7+ days before launch
  } else if (isPrelaunch) {
    verificationLevel = 'silver'; // Registered before launch but < 7 days
  } else {
    verificationLevel = 'standard'; // Registered after launch
  }

  // Create binding record
  const binding: ContractBinding = {
    logoId,
    contractAddress: contractAddress.toLowerCase(),
    chainId,
    bindingDate: new Date(),
    verificationLevel,
    prelaunchRegistration: isPrelaunch,
    ipfsProofUrl: logo.ipfsHash ? `https://ipfs.io/ipfs/${logo.ipfsHash}` : '',
  };

  // Store in database (would be implemented in storage.ts)
  await storage.createContractBinding?.(binding);

  // If gold verification, generate certificate
  if (verificationLevel === 'gold') {
    await generateGoldCertificate(logo, contractAddress, deploymentDate);
  }

  return binding;
}

/**
 * Check if a logo/contract combo has gold verification
 */
export async function checkGoldVerification(
  contractAddress: string,
  chainId: number
): Promise<VerificationStatus | null> {
  // Get binding for this contract
  const binding = await storage.getContractBinding?.(contractAddress.toLowerCase(), chainId);
  if (!binding) {
    return null;
  }

  const logo = await storage.getLogoById(binding.logoId);
  if (!logo) {
    return null;
  }

  return {
    hasGoldCheck: binding.verificationLevel === 'gold',
    contractAddress: binding.contractAddress,
    registrationDate: logo.createdAt,
    launchDate: binding.bindingDate,
    daysBeforeLaunch: binding.prelaunchRegistration ? 
      Math.floor((binding.bindingDate.getTime() - logo.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 
      undefined,
    verificationProof: `https://solturio.app/verify/contract/${contractAddress}`,
  };
}

/**
 * Generate gold verification certificate
 */
async function generateGoldCertificate(
  logo: any,
  contractAddress: string,
  deploymentDate: Date
): Promise<string> {
  const certificateData = {
    logoId: logo.id,
    fileName: logo.fileName,
    fileHash: logo.fileHash,
    ipfsHash: logo.ipfsHash,
    registrationDate: logo.createdAt,
    contractAddress,
    deploymentDate,
    verificationLevel: 'GOLD',
    certificateId: createHash('sha256')
      .update(`${logo.id}-${contractAddress}-gold`)
      .digest('hex')
      .slice(0, 16),
  };

  // In production, this would generate a PDF certificate
  // and store it on IPFS
  return JSON.stringify(certificateData);
}

/**
 * Generate embeddable verification widget
 */
export function generateVerificationWidget(
  contractAddress: string,
  verificationLevel: 'gold' | 'silver' | 'standard'
): string {
  const colors = {
    gold: '#FFD700',
    silver: '#C0C0C0',
    standard: '#CD7F32',
  };

  const badges = {
    gold: '✓ Gold Verified',
    silver: '✓ Silver Verified',
    standard: '✓ Verified',
  };

  return `
    <!-- Solturio Verification Widget -->
    <div id="solturio-verify-${contractAddress}" style="display: inline-flex; align-items: center; padding: 4px 8px; background: ${colors[verificationLevel]}20; border: 1px solid ${colors[verificationLevel]}; border-radius: 4px;">
      <svg width="16" height="16" style="margin-right: 4px;">
        <circle cx="8" cy="8" r="8" fill="${colors[verificationLevel]}"/>
        <path d="M4 8 L7 11 L12 5" stroke="white" stroke-width="2" fill="none"/>
      </svg>
      <span style="font-size: 12px; font-weight: bold; color: ${colors[verificationLevel]};">
        ${badges[verificationLevel]}
      </span>
    </div>
    <script>
      // Auto-verify on load
      fetch('https://api.solturio.app/v1/contract/verify/${contractAddress}')
        .then(r => r.json())
        .then(data => {
          if (data.verified) {
            document.getElementById('solturio-verify-${contractAddress}').style.display = 'inline-flex';
          }
        });
    </script>
  `;
}

/**
 * Overlay gold checkmark on IPFS images automatically
 */
export function generateIPFSOverlayScript(): string {
  return `
    // Solturio Gold Check Overlay
    // Add this script to automatically overlay gold checks on verified IPFS images
    
    (function() {
      // Find all images from IPFS
      const ipfsImages = document.querySelectorAll('img[src*="ipfs.io"], img[src*="gateway.pinata.cloud"]');
      
      ipfsImages.forEach(async (img) => {
        // Extract IPFS hash from URL
        const match = img.src.match(/ipfs\\/([a-zA-Z0-9]+)/);
        if (!match) return;
        
        const ipfsHash = match[1];
        
        // Check verification status
        const response = await fetch(\`https://api.solturio.app/v1/ipfs/verify/\${ipfsHash}\`);
        const data = await response.json();
        
        if (data.hasGoldCheck) {
          // Create wrapper div
          const wrapper = document.createElement('div');
          wrapper.style.position = 'relative';
          wrapper.style.display = 'inline-block';
          
          // Move image into wrapper
          img.parentNode.insertBefore(wrapper, img);
          wrapper.appendChild(img);
          
          // Add gold checkmark overlay
          const checkmark = document.createElement('div');
          checkmark.innerHTML = \`
            <svg width="24" height="24" style="position: absolute; top: 4px; right: 4px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
              <circle cx="12" cy="12" r="12" fill="#FFD700" stroke="#FFF" stroke-width="2"/>
              <path d="M6 12 L10 16 L18 8" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          \`;
          checkmark.style.position = 'absolute';
          checkmark.style.top = '4px';
          checkmark.style.right = '4px';
          checkmark.style.pointerEvents = 'none';
          checkmark.title = 'Solturio Gold Verified - Pre-launch Registration';
          
          wrapper.appendChild(checkmark);
        }
      });
    })();
  `.trim();
}

/**
 * Batch verify multiple contract/logo pairs
 */
export async function batchVerifyContracts(
  contracts: Array<{ address: string; chainId: number }>
): Promise<Map<string, VerificationStatus>> {
  const results = new Map<string, VerificationStatus>();
  
  for (const contract of contracts) {
    const status = await checkGoldVerification(contract.address, contract.chainId);
    if (status) {
      results.set(contract.address, status);
    }
  }
  
  return results;
}

/**
 * Generate verification badge for DEX display
 */
export function generateDEXBadge(verification: VerificationStatus): string {
  if (!verification.hasGoldCheck) {
    return '';
  }

  const daysBefore = verification.daysBeforeLaunch || 0;
  const badgeText = daysBefore > 30 ? 
    `Gold ✓ (${daysBefore}d pre-launch)` : 
    `Gold ✓ Pre-launch`;

  return `
    <div class="solturio-gold-badge" style="
      display: inline-flex;
      align-items: center;
      padding: 2px 6px;
      background: linear-gradient(135deg, #FFD700, #FFA500);
      color: white;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      margin-left: 4px;
    ">
      <svg width="12" height="12" style="margin-right: 2px;">
        <path d="M2 6 L5 9 L10 3" stroke="white" stroke-width="2" fill="none"/>
      </svg>
      ${badgeText}
    </div>
  `;
}