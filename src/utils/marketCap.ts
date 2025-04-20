/**
 * Calculate market cap based on total supply and initial LP
 * @param totalSupply Total supply of the token
 * @param baseTokenAmount Base token amount in initial LP
 * @param projectTokenAmount Project token amount in initial LP
 * @returns Estimated market cap in base token value
 */
export function calculateMarketCap(
  totalSupply: bigint,
  baseTokenAmount: bigint,
  projectTokenAmount: bigint
): bigint {
  // If either amount is zero, can't calculate
  if (baseTokenAmount === 0n || projectTokenAmount === 0n) {
    return 0n;
  }
  
  // Calculate project token price in base token: base token amount / project token amount
  // Then multiply by total supply to get market cap
  // Use scaling factor to avoid precision loss in integer division
  const scalingFactor = 10000000000n; // 10^10
  const tokenPriceScaled = (baseTokenAmount * scalingFactor) / projectTokenAmount;
  const marketCap = (totalSupply * tokenPriceScaled) / scalingFactor;
  
  return marketCap;
}
