/**
 * Get a list of unique addresses
 * @param addresses Array of addresses
 * @returns Array of unique lowercase addresses
 */
export function getUniqueAddresses(addresses: string[]): string[] {
  return [...new Set(addresses.map(addr => addr.toLowerCase()))];
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
