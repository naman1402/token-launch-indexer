// Define base token addresses (from local deployment)
export const WETH_ADDRESS = "0x09635F643e140090A9A8Dcd712eD6285858ceBef";
const MAINNET_WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
// Add your local Anvil testing addresses
export const ANVIL_WETH = "0x09635F643e140090A9A8Dcd712eD6285858ceBef"; 
export const ANVIL_FACTORY = "0xc5a5C42992dECbae36851359345FE25997F5C42d";

export const BASE_TOKENS = [
  WETH_ADDRESS, 
  MAINNET_WETH, 
  ANVIL_WETH,
  // Add other stable tokens if needed
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
  "0xdac17f958d2ee523a2206206994597c13d831ec7"  // USDT
];

/**
 * Checks if a token address is a base token (ETH/USDC/USDT)
 * @param address The token address to check
 * @returns true if the address is a base token, false otherwise
 */
export function isBaseToken(address: string): boolean {
  if (!address) {
    console.log("Warning: isBaseToken called with empty address");
    return false;
  }
  
  // Ensure we're comparing normalized addresses
  const normalizedAddress = address.toLowerCase();
  
  // Filter out any undefined or null values before comparison
  const result = BASE_TOKENS.filter(Boolean).some(baseToken => 
    baseToken && baseToken.toLowerCase() === normalizedAddress);
  
  console.log(`isBaseToken check for ${address}: ${result}`);
  return result;
}

/**
 * Gets name of base token
 * @param address The token address
 * @returns String name of the token or "Unknown" if not a base token
 */
export function getBaseTokenName(address: string): string {
  if (!address) return "Unknown";
  
  const lowerAddress = address.toLowerCase();
  
  if (lowerAddress === WETH_ADDRESS.toLowerCase() || 
      lowerAddress === MAINNET_WETH.toLowerCase() ||
      lowerAddress === ANVIL_WETH.toLowerCase()) {
    return "WETH";
  }
  
  // Add other token name lookups here
  const tokenNames: Record<string, string> = {
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
    "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT"
  };
  
  return tokenNames[lowerAddress] || "Unknown";
}

/**
 * Normalize token order to ensure base token is always token0
 * @param token0 First token address
 * @param token1 Second token address
 * @returns Object with normalized token order and a flag indicating if order was swapped
 */
export function normalizeTokenOrder(token0: string, token1: string) {
  if (!token0 || !token1) {
    console.error("Invalid tokens passed to normalizeTokenOrder:", {token0, token1});
    // Return a safe default
    return {
      baseToken: token0 || "0x0000000000000000000000000000000000000000",
      projectToken: token1 || "0x0000000000000000000000000000000000000000",
      baseIsToken0: true
    };
  }

  const token0IsBase = isBaseToken(token0);
  const token1IsBase = isBaseToken(token1);
  
  console.log(`Token base status - token0(${token0}): ${token0IsBase}, token1(${token1}): ${token1IsBase}`);
  
  if (token0IsBase && !token1IsBase) {
    return { baseToken: token0, projectToken: token1, baseIsToken0: true };
  }
  
  if (!token0IsBase && token1IsBase) {
    return { baseToken: token1, projectToken: token0, baseIsToken0: false };
  }
  
  // Neither is a base token or both are, use token0 as "base"
  return { baseToken: token0, projectToken: token1, baseIsToken0: true };
}
