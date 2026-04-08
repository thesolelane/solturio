// Solturio Verification Assets - IPFS stored branding elements

export const VERIFICATION_ASSETS = {
  // Gold check badge - overlayed on verified images (lower-left corner)
  // Transparent PNG version for proper compositing
  badge: {
    name: "solturio_badge_transparent.png",
    cid: "QmdcbA6ciG3rasjpwm57kwYJ51tAB3wadDV4S48tuJaQwg",
    ipfsUrl: "https://gateway.pinata.cloud/ipfs/QmdcbA6ciG3rasjpwm57kwYJ51tAB3wadDV4S48tuJaQwg",
    description:
      "Verification badge for minted/verified images - indicates affiliation with correct contract address",
    placement: "lower-left",
    format: "png",
    transparent: true,
  },
  // Solturio branding/hero image
  branding: {
    name: "solturio_branding.png",
    cid: "bafybeihcznd4isjix3z2dgxccmxsbibv3aboonyoyo6r7vws44zmtomgk4",
    ipfsUrl:
      "https://gateway.pinata.cloud/ipfs/bafybeihcznd4isjix3z2dgxccmxsbibv3aboonyoyo6r7vws44zmtomgk4",
    description: "Solturio branding image for hero sections and promotional use",
    format: "png",
  },
} as const;

// Get IPFS gateway URL for an asset
export function getAssetUrl(cid: string, gateway: "pinata" | "ipfs.io" = "pinata"): string {
  if (gateway === "pinata") {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
  return `https://ipfs.io/ipfs/${cid}`;
}

// Generate verified image URL (image with badge overlay)
// Creators must use this IPFS link to show verification
export function getVerifiedImageUrl(
  imageCid: string,
  badgeCid: string = VERIFICATION_ASSETS.badge.cid
): string {
  // This could be used to generate a composite image URL
  // For now, returns the metadata that would be needed
  return JSON.stringify({
    image: `ipfs://${imageCid}`,
    badge: `ipfs://${badgeCid}`,
    verified: true,
  });
}
