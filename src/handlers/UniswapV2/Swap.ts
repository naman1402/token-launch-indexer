import { ponder } from "ponder:registry";
import { poolsV2, tokens, snipers, teamBundles } from "ponder:schema";
import { 
  isEthToken, 
  isSniper,
  isTeamBundleCandidate,
  extractEthAmount, 
  extractTokenAmount,
  calculateSupplyPercentage,
  calculateSniperVolume,
  getUniqueAddresses,
  createTeamBundleId,
  calculateBundleBlocks,
  WETH_ADDRESS
} from "../../utils/sniper";
import { erc20Abi, zeroAddress } from "viem";
import { eq } from "drizzle-orm";

// Type definition for sniper to avoid 'any' type
interface SniperRecord {
  id: string;
  pool: string;
  address: string;
  ethAmount: bigint;
  tokenAmount: bigint;
  percentOfSupply: number;
}

// Handle Swap events to track snipers and team bundles
ponder.on("UniswapV2Factory:Swap", async ({ event, context }) => {
  const pairAddress = event.log.address;
  const blockNumber = Number(event.block.number);
  const txHash = event.transaction.hash;
  const { sender, amount0In, amount1In, amount0Out, amount1Out, to } = event.args;
  
  // Skip transactions from/to the zero address or pool itself
  if (to.toLowerCase() === zeroAddress || to.toLowerCase() === pairAddress.toLowerCase()) {
    return;
  }
  
  // Get pool information
  const pool = await context.db.find(poolsV2, { id: pairAddress });
  
  // If pool doesn't exist, skip
  if (!pool) {
    return;
  }
  
  // Determine which token is ETH
  const token0IsEth = isEthToken(pool.token0);
  const token1IsEth = isEthToken(pool.token1);
  
  // If neither is ETH/WETH, skip
  if (!token0IsEth && !token1IsEth) {
    return;
  }
  
  // Determine which is the token (not ETH)
  const tokenAddress = token0IsEth ? pool.token1 : pool.token0;

  // Extract ETH and token values
  const ethAmount = extractEthAmount(
    amount0In, amount1In, amount0Out, amount1Out, token0IsEth
  );
  
  const tokenAmount = extractTokenAmount(
    amount0In, amount1In, amount0Out, amount1Out, token0IsEth
  );
  
  // CASE 1: SNIPER DETECTION - Transaction in the launch block
  if (isSniper(blockNumber, pool.launchBlock)) {
    // Process as a sniper transaction
    let totalSupply = 0n;
    try {
      // Try to get the token's total supply from the database first
      const token = await context.db.find(tokens, { address: tokenAddress });
      
      if (token && token.totalSupply) {
        totalSupply = token.totalSupply;
      } else {
        // If not available, fetch it from the blockchain
        const result = await context.client.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "totalSupply",
        });
        
        totalSupply = result;
        
        // Update token with total supply
        if (token) {
          await context.db.update(tokens, { address: tokenAddress })
            .set({ totalSupply });
        }
      }
    } catch (error) {
      console.error(`Error fetching total supply:`, error);
      return;
    }
    
    // Calculate percentage of supply
    const percentOfSupply = calculateSupplyPercentage(tokenAmount, totalSupply);
    
    // Create unique ID for this sniper
    const sniperId = `${pairAddress.toLowerCase()}-${to.toLowerCase()}`;
    
    // Check if sniper already exists
    const existingSniper = await context.db.find(snipers, { id: sniperId });
    
    if (existingSniper) {
      // Update existing sniper
      await context.db.update(snipers, { id: sniperId })
        .set({
          ethAmount: existingSniper.ethAmount + ethAmount,
          tokenAmount: existingSniper.tokenAmount + tokenAmount,
          percentOfSupply: calculateSupplyPercentage(
            existingSniper.tokenAmount + tokenAmount, 
            totalSupply
          ),
        });
    } else {
      // Insert new sniper
      await context.db.insert(snipers).values({
        id: sniperId,
        pool: pairAddress,
        address: to,
        ethAmount,
        tokenAmount,
        percentOfSupply,
      });
    }
    
    // Instead of trying to fetch all snipers, let's use our utilities with the current sniper
    // This avoids the database query that's causing issues
    let updatedEthAmount = ethAmount;
    let updatedTokenAmount = tokenAmount;
    
    // Add the existing sniper's amounts if it exists
    if (existingSniper) {
      updatedEthAmount += existingSniper.ethAmount;
      updatedTokenAmount += existingSniper.tokenAmount;
    }
    
    // Update the pool stats with the incremental change
    // Get current stats from the pool
    const currentEthVolume = pool.totalSniperVolume || 0n;
    const currentTokensCount = pool.totalSnipersCount || 0;
    const wasNewSniper = !existingSniper;
    
    // Update pool with snipers info
    await context.db.update(poolsV2, { id: pairAddress })
      .set({
        totalSniperVolume: currentEthVolume + ethAmount,
        // Only increment count if this is a new sniper
        totalSnipersCount: wasNewSniper ? currentTokensCount + 1 : currentTokensCount,
        totalSniperSupplyPercent: calculateSupplyPercentage(
          (pool.totalSniperVolume || 0n) + updatedTokenAmount, 
          totalSupply
        ),
      });
  }
  // CASE 2: TEAM BUNDLE DETECTION - Transaction shortly after launch block 
  else if (isTeamBundleCandidate(blockNumber, pool.launchBlock)) {
    // Skip if team bundle already detected for this pool
    if (pool.teamBundleDetected) {
      return;
    }
    
    // Create a unique ID for this team bundle
    const teamBundleId = createTeamBundleId(tokenAddress, pairAddress);
    
    // Check if team bundle record already exists
    let teamBundle = await context.db.find(teamBundles, { id: teamBundleId });
    
    // Record transaction data
    if (teamBundle) {
      // Update existing team bundle record
      const lastBlock = Math.max(teamBundle.lastBlock, blockNumber);
      const bundleBlocks = calculateBundleBlocks(teamBundle.firstBlock, lastBlock);
      
      await context.db.update(teamBundles, { id: teamBundleId })
        .set({
          txCount: teamBundle.txCount + 1,
          lastBlock,
          bundleBlocks,
        });
    } else {
      // Create new team bundle record
      await context.db.insert(teamBundles).values({
        id: teamBundleId,
        token: tokenAddress,
        pool: pairAddress,
        bundleBlocks: 1n,
        txCount: 1,
        firstBlock: blockNumber,
        lastBlock: blockNumber,
        bundleHash: txHash,
      });
      
      // Also mark the token as having a team bundle
      await context.db.update(tokens, { address: tokenAddress })
        .set({ hasTeamBundle: true });
    }
    
    // Update pool with team bundle information
    await context.db.update(poolsV2, { id: pairAddress })
      .set({ 
        teamBundleDetected: true,
        teamBundleBlocks: calculateBundleBlocks(
          teamBundle ? teamBundle.firstBlock : blockNumber,
          teamBundle ? Math.max(teamBundle.lastBlock, blockNumber) : blockNumber
        ),
        teamBundleTxCount: teamBundle ? teamBundle.txCount + 1 : 1
      });
  }
}); 