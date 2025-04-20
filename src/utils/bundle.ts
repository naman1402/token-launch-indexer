/**
 * Check if transaction is part of a potential team bundle
 * @param blockNumber Block number of the transaction
 * @param launchBlock Launch block of the pool
 * @param bundleThreshold Number of blocks after launch to consider for team bundle
 * @returns boolean indicating if the transaction is part of a potential team bundle
 */
export function isTeamBundleCandidate(
  blockNumber: number,
  launchBlock: number,
  bundleThreshold: number = 5
): boolean {
  // Team bundles are transactions that happen shortly after launch, but not in the launch block itself
  // Usually in the next 1-5 blocks after launch
  return blockNumber > launchBlock && blockNumber <= launchBlock + bundleThreshold;
}

/**
 * Creates a unique ID for a team bundle
 * @param tokenAddress Address of the token
 * @param poolAddress Address of the pool
 * @returns Unique ID for the team bundle
 */
export function createTeamBundleId(tokenAddress: string, poolAddress: string): string {
  return `${tokenAddress.toLowerCase()}-${poolAddress.toLowerCase()}`;
}

/**
 * Calculate bundle span (number of blocks the bundle spans)
 * @param firstBlock First block in the bundle
 * @param lastBlock Last block in the bundle
 * @returns Number of blocks spanned by the bundle
 */
export function calculateBundleBlocks(firstBlock: number, lastBlock: number): bigint {
  return BigInt(Math.max(0, lastBlock - firstBlock + 1));
}
