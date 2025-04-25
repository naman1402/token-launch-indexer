/**
 * Check if transaction is part of a team bundle
 * @param txHash Transaction hash of the current transaction
 * @param launchTxHash Transaction hash of the launch transaction
 * @returns boolean indicating if the transaction is the launch transaction
 */
export function isTeamBundleCandidate(
  txHash: string,
  launchTxHash: string
): boolean {
  // Team bundle = transaction is the launching transaction
  return txHash.toLowerCase() === launchTxHash.toLowerCase();
}
