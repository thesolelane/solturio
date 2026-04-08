/**
 * Price Oracle Service
 * Fetches token prices from decentralized sources (Jupiter, Raydium)
 * REGULATORY: Uses decentralized price feeds, not centralized oracles
 */

import { TOKEN_MINTS, getCurrentSubscriptionPricing } from "@shared/pricing";

interface TokenPrice {
  symbol: string;
  priceUsd: number;
  source: string;
  timestamp: Date;
}

interface PriceCache {
  [symbol: string]: TokenPrice;
}

// Cache prices for 60 seconds to avoid rate limiting
const priceCache: PriceCache = {};
const CACHE_TTL_MS = 60000;

/**
 * Fetch price from Jupiter Price API
 */
async function fetchJupiterPrice(mintAddress: string): Promise<number | null> {
  try {
    const response = await fetch(`https://price.jup.ag/v6/price?ids=${mintAddress}`);
    if (!response.ok) return null;

    const data = await response.json();
    const priceData = data.data?.[mintAddress];
    return priceData?.price ?? null;
  } catch (error) {
    console.error("Jupiter price fetch error:", error);
    return null;
  }
}

/**
 * Get token price with caching
 */
export async function getTokenPrice(symbol: string): Promise<TokenPrice | null> {
  const cached = priceCache[symbol];
  if (cached && Date.now() - cached.timestamp.getTime() < CACHE_TTL_MS) {
    return cached;
  }

  const mintAddress = TOKEN_MINTS[symbol as keyof typeof TOKEN_MINTS];
  if (!mintAddress) {
    console.error(`Unknown token symbol: ${symbol}`);
    return null;
  }

  // For SOL, use wrapped SOL address
  const price = await fetchJupiterPrice(mintAddress);
  if (price === null) return null;

  const tokenPrice: TokenPrice = {
    symbol,
    priceUsd: price,
    source: "jupiter",
    timestamp: new Date(),
  };

  priceCache[symbol] = tokenPrice;
  return tokenPrice;
}

/**
 * Get SOL price in USD
 */
export async function getSolPrice(): Promise<number> {
  const price = await getTokenPrice("SOL");
  return price?.priceUsd ?? 150; // Fallback to reasonable estimate
}

/**
 * Get CATH price in USD
 */
export async function getCathPrice(): Promise<number> {
  const price = await getTokenPrice("CATH");
  return price?.priceUsd ?? 0.001; // Fallback to reasonable estimate
}

/**
 * Calculate $CATH amount needed for subscription
 * Based on SOL equivalent and current prices
 */
export async function calculateCathForSubscription(): Promise<{
  cathAmount: number;
  solEquivalent: number;
  solPriceUsd: number;
  cathPriceUsd: number;
  usdValue: number;
  isPromo: boolean;
}> {
  const pricing = getCurrentSubscriptionPricing();
  const solPrice = await getSolPrice();
  const cathPrice = await getCathPrice();

  // Calculate USD value of SOL equivalent
  const usdValue = pricing.solEquivalent * solPrice;

  // Calculate CATH needed
  const cathAmount = cathPrice > 0 ? usdValue / cathPrice : 0;

  return {
    cathAmount: Math.ceil(cathAmount), // Round up to whole tokens
    solEquivalent: pricing.solEquivalent,
    solPriceUsd: solPrice,
    cathPriceUsd: cathPrice,
    usdValue,
    isPromo: pricing === getCurrentSubscriptionPricing(),
  };
}

/**
 * Get all cached prices
 */
export function getAllCachedPrices(): PriceCache {
  return { ...priceCache };
}

/**
 * Clear price cache
 */
export function clearPriceCache(): void {
  Object.keys(priceCache).forEach((key) => delete priceCache[key]);
}
