// Define base token addresses (Ethereum mainnet)
export const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toLowerCase();
export const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48".toLowerCase();
export const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7".toLowerCase();

// Base tokens array for easy checking
export const BASE_TOKENS = [WETH_ADDRESS, USDC_ADDRESS, USDT_ADDRESS];

/**
 * Checks if a token address is a base token (ETH/USDC/USDT)
 * @param address The token address to check
 * @returns true if the address is a base token, false otherwise
 */
export function isBaseToken(address: string): boolean {
  return BASE_TOKENS.includes(address.toLowerCase());
}

/**
 * Gets name of base token
 * @param address The token address
 * @returns String name of the token or "Unknown" if not a base token
 */
export function getBaseTokenName(address: string): string {
  const lowerAddress = address.toLowerCase();
  if (lowerAddress === WETH_ADDRESS) return "WETH";
  if (lowerAddress === USDC_ADDRESS) return "USDC";
  if (lowerAddress === USDT_ADDRESS) return "USDT";
  return "Unknown";
}

// Keeping the old function for backward compatibility
export function isEthToken(address: string): boolean {
  return address.toLowerCase() === WETH_ADDRESS;
}

/**
 * Normalize token order to ensure base token is always token0
 * @param token0 First token address
 * @param token1 Second token address
 * @returns Object with normalized token order and a flag indicating if order was swapped
 */
export function normalizeTokenOrder(token0: string, token1: string): { 
  baseToken: `0x${string}`; 
  projectToken: `0x${string}`; 
  baseIsToken0: boolean;
} {
  const token0IsBase = isBaseToken(token0);
  const token1IsBase = isBaseToken(token1);
  
  // If only one is a base token, make it token0
  if (token0IsBase && !token1IsBase) {
    return { 
      baseToken: token0 as `0x${string}`, 
      projectToken: token1 as `0x${string}`, 
      baseIsToken0: true 
    };
  }
  
  if (!token0IsBase && token1IsBase) {
    return { 
      baseToken: token1 as `0x${string}`, 
      projectToken: token0 as `0x${string}`, 
      baseIsToken0: false 
    };
  }
  
  // If both or neither are base tokens, maintain original order but flag accordingly
  return { 
    baseToken: (token0IsBase ? token0 : token1) as `0x${string}`, 
    projectToken: (token0IsBase ? token1 : token0) as `0x${string}`,
    baseIsToken0: token0IsBase 
  };
}
