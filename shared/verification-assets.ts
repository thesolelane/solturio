// Solturio Verification Assets - IPFS stored branding elements

export const VERIFICATION_ASSETS = {
  // Gold check badge - overlayed on verified images (lower-left corner)
  badge: {
    name: 'solturio_badge_goldcheck.svg',
    cid: 'bafybeidi3atbeaep4gzq5nirfocvnhwdcrrqp42vhreei7tk7cvrm4fjq4',
    fileId: '019b2871-9157-733f-bba4-81992b8c102b',
    ipfsUrl: 'https://gateway.pinata.cloud/ipfs/bafybeidi3atbeaep4gzq5nirfocvnhwdcrrqp42vhreei7tk7cvrm4fjq4',
    description: 'Verification badge for minted/verified images - indicates affiliation with correct contract address',
    placement: 'lower-left',
  },
} as const;

// Get IPFS gateway URL for an asset
export function getAssetUrl(cid: string, gateway: 'pinata' | 'ipfs.io' = 'pinata'): string {
  if (gateway === 'pinata') {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
  return `https://ipfs.io/ipfs/${cid}`;
}

// Generate verified image URL (image with badge overlay)
// Creators must use this IPFS link to show verification
export function getVerifiedImageUrl(imageCid: string, badgeCid: string = VERIFICATION_ASSETS.badge.cid): string {
  // This could be used to generate a composite image URL
  // For now, returns the metadata that would be needed
  return JSON.stringify({
    image: `ipfs://${imageCid}`,
    badge: `ipfs://${badgeCid}`,
    verified: true,
  });
}
