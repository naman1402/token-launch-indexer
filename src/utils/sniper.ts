import { zeroAddress } from "viem";

// Define the WETH address constant (Ethereum mainnet)
export const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toLowerCase();

/**
 * Checks if a token address is ETH (WETH)
 * @param address The token address to check
 * @returns true if the address is WETH, false otherwise
 */
export function isEthToken(address: string): boolean {
  return address.toLowerCase() === WETH_ADDRESS;
}

/**
 * Checks if a transaction is a sniper (happened in the launch block)
 * @param transactionBlock Block number of the transaction
 * @param launchBlock Launch block number of the pool
 * @returns true if the transaction is a sniper, false otherwise
 */
export function isSniper(transactionBlock: number, launchBlock: number): boolean {
  return transactionBlock === launchBlock;
}

/**
 * Extract ETH amount from swap event based on token positions
 * @param amount0In Amount of token0 input
 * @param amount1In Amount of token1 input
 * @param amount0Out Amount of token0 output
 * @param amount1Out Amount of token1 output
 * @param ethIsToken0 Whether ETH is token0 (true) or token1 (false)
 * @returns ETH amount involved in the swap
 */
export function extractEthAmount(
  amount0In: bigint,
  amount1In: bigint,
  amount0Out: bigint,
  amount1Out: bigint,
  ethIsToken0: boolean
): bigint {
  if (ethIsToken0) {
    // If ETH is token0, then ETH amount is either token0 in (buying token) or token1 out (selling token)
    return amount0In > 0n ? amount0In : amount1Out;
  } else {
    // If ETH is token1, then ETH amount is either token1 in (buying token) or token0 out (selling token)
    return amount1In > 0n ? amount1In : amount0Out;
  }
}

/**
 * Extract token amount from swap event based on token positions
 * @param amount0In Amount of token0 input
 * @param amount1In Amount of token1 input
 * @param amount0Out Amount of token0 output
 * @param amount1Out Amount of token1 output
 * @param ethIsToken0 Whether ETH is token0 (true) or token1 (false)
 * @returns Token amount involved in the swap
 */
export function extractTokenAmount(
  amount0In: bigint,
  amount1In: bigint,
  amount0Out: bigint,
  amount1Out: bigint,
  ethIsToken0: boolean
): bigint {
  if (ethIsToken0) {
    // If ETH is token0, then token amount is either token1 in (selling token) or token0 out (buying token)
    return amount1In > 0n ? amount1In : amount0Out;
  } else {
    // If ETH is token1, then token amount is either token0 in (selling token) or token1 out (buying token)
    return amount0In > 0n ? amount0In : amount1Out;
  }
}

/**
 * Calculate percentage of supply
 * @param amount Token amount
 * @param totalSupply Total supply of the token
 * @returns Percentage rounded to 2 decimal places
 */
export function calculateSupplyPercentage(amount: bigint, totalSupply: bigint): number {
  if (totalSupply === 0n) return 0;
  
  const percent = (Number(amount) / Number(totalSupply)) * 100;
  return Math.round(percent * 100) / 100; // rounded to 2 decimal places
}

/**
 * Calculate total ETH and token volume from multiple swaps
 * @param swaps Array of swaps with ethAmount and tokenAmount
 * @returns Object with totalEth and totalTokens
 */
export function calculateSniperVolume(swaps: Array<{ ethAmount: bigint; tokenAmount: bigint }>): {
  totalEth: bigint;
  totalTokens: bigint;
} {
  return swaps.reduce(
    (acc, swap) => ({
      totalEth: acc.totalEth + swap.ethAmount,
      totalTokens: acc.totalTokens + swap.tokenAmount,
    }),
    { totalEth: 0n, totalTokens: 0n }
  );
}

/**
 * Get a list of unique addresses
 * @param addresses Array of addresses
 * @returns Array of unique lowercase addresses
 */
export function getUniqueAddresses(addresses: string[]): string[] {
  return [...new Set(addresses.map(addr => addr.toLowerCase()))];
}

/**
 * Process initial LP information from Mint event
 * @param amount0 Amount of token0 added to the pool
 * @param amount1 Amount of token1 added to the pool
 * @param token0 Address of token0
 * @param token1 Address of token1
 * @returns The ETH amount added to the pool
 */
export function processInitialLp({
  amount0,
  amount1,
  token0,
  token1,
}: {
  amount0: bigint;
  amount1: bigint;
  token0: string;
  token1: string;
}): bigint {
  const token0IsEth = isEthToken(token0);
  const token1IsEth = isEthToken(token1);
  
  if (!token0IsEth && !token1IsEth) {
    return 0n;
  }
  
  return token0IsEth ? amount0 : amount1;
}

