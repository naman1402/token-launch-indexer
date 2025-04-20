import { isBaseToken } from "./baseTokens";

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
 * Extract base token amount from swap event based on token positions
 * @param amount0In Amount of token0 input
 * @param amount1In Amount of token1 input
 * @param amount0Out Amount of token0 output
 * @param amount1Out Amount of token1 output
 * @param baseIsToken0 Whether base token is token0 (true) or token1 (false)
 * @returns Base token amount involved in the swap
 */
export function extractBaseTokenAmount(
  amount0In: bigint,
  amount1In: bigint,
  amount0Out: bigint,
  amount1Out: bigint,
  baseIsToken0: boolean
): bigint {
  if (baseIsToken0) {
    // If base token is token0, then base token amount is either token0 in (buying token) or token1 out (selling token)
    return amount0In > 0n ? amount0In : amount1Out;
  } else {
    // If base token is token1, then base token amount is either token1 in (buying token) or token0 out (selling token)
    return amount1In > 0n ? amount1In : amount0Out;
  }
}

/**
 * Extract project token amount from swap event based on token positions
 * @param amount0In Amount of token0 input
 * @param amount1In Amount of token1 input
 * @param amount0Out Amount of token0 output
 * @param amount1Out Amount of token1 output
 * @param baseIsToken0 Whether base token is token0 (true) or token1 (false)
 * @returns Project token amount involved in the swap
 */
export function extractProjectTokenAmount(
  amount0In: bigint,
  amount1In: bigint,
  amount0Out: bigint,
  amount1Out: bigint,
  baseIsToken0: boolean
): bigint {
  if (baseIsToken0) {
    // If base token is token0, then project token amount is either token1 in (selling token) or token0 out (buying token)
    return amount1In > 0n ? amount1In : amount0Out;
  } else {
    // If base token is token1, then project token amount is either token0 in (selling token) or token1 out (buying token)
    return amount0In > 0n ? amount0In : amount1Out;
  }
}

/**
 * Calculate total base token and project token volume from multiple swaps
 * @param swaps Array of swaps with baseTokenAmount and projectTokenAmount
 * @returns Object with totalBaseToken and totalProjectTokens
 */
export function calculateSniperVolume(swaps: Array<{ baseTokenAmount: bigint; projectTokenAmount: bigint }>): {
  totalBaseToken: bigint;
  totalProjectTokens: bigint;
} {
  return swaps.reduce(
    (acc, swap) => ({
      totalBaseToken: acc.totalBaseToken + swap.baseTokenAmount,
      totalProjectTokens: acc.totalProjectTokens + swap.projectTokenAmount,
    }),
    { totalBaseToken: 0n, totalProjectTokens: 0n }
  );
}

/**
 * Process initial LP information from Mint event
 * @param amount0 Amount of token0 added to the pool
 * @param amount1 Amount of token1 added to the pool
 * @param token0 Address of token0
 * @param token1 Address of token1
 * @returns The base token amount added to the pool
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
  const token0IsBase = isBaseToken(token0);
  const token1IsBase = isBaseToken(token1);
  
  if (!token0IsBase && !token1IsBase) {
    return 0n;
  }
  
  return token0IsBase ? amount0 : amount1;
}

