import { WETH_ADDRESS } from './deployments';

// Define base token addresses (from local deployment)
export { WETH_ADDRESS };
export const BASE_TOKENS = [WETH_ADDRESS];

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
  return "Unknown";
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
