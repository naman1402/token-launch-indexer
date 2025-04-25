import { ponder } from "ponder:registry";
import { poolsV2, tokens, snipers } from "ponder:schema";
import { 
  WETH_ADDRESS,
  BASE_TOKENS,
  isBaseToken 
} from "../../utils/baseTokens";
import {
  isSniper,
  extractBaseTokenAmount, 
  extractProjectTokenAmount,
  calculateSniperVolume,
  processInitialLp
} from "../../utils/sniper";
import {
  isTeamBundleCandidate
} from "../../utils/bundle";
import {
  calculateSupplyPercentage,
  getUniqueAddresses
} from "../../utils/utils";
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
ponder.on("UniswapV2Pair:Swap", async ({ event, context }) => {
  const poolAddress = event.log.address;
  const blockNumber = Number(event.block.number);
  const txHash = event.transaction.hash;
  const { sender, amount0In, amount1In, amount0Out, amount1Out, to } = event.args;
  
  console.log(`Swap event detected in pool: ${poolAddress}`);
  
  // Skip transactions from/to the zero address or pool itself
  if (to.toLowerCase() === zeroAddress || to.toLowerCase() === poolAddress.toLowerCase()) {
    console.log("Transaction to zero address or pool itself, skipping");
    return;
  }
  
  // Get pool information
  const pool = await context.db.find(poolsV2, { id: poolAddress });
  
  // If pool doesn't exist, skip
  if (!pool) {
    console.log(`Pool not found: ${poolAddress}`);
    return;
  }
  
  // In our schema, token0 is the base token and token1 is the project token
  // But we need to account for the original order using baseTokenIsToken0
  const baseTokenAddress = pool.token0;
  const projectTokenAddress = pool.token1;

  // Determine if this is a buy or sell, accounting for token order
  const isBuy = pool.baseTokenIsToken0 
    ? (amount0In > 0n && amount1Out > 0n)  // Base is token0: sending base, receiving project
    : (amount1In > 0n && amount0Out > 0n); // Base is token1: sending project, receiving base
  
  if (isBuy) {
    // User is buying the project token
    const baseTokenAmount = extractBaseTokenAmount(amount0In, amount1In, pool.baseTokenIsToken0);
    const projectTokenAmount = extractProjectTokenAmount(amount0Out, amount1Out, pool.baseTokenIsToken0);
    
    // CASE 1: SNIPER DETECTION - Transaction in the launch block
    if (isSniper(blockNumber, pool.launchBlock)) {
      console.log("Sniper detected!");
      // Process as a sniper transaction
      let totalSupply = 0n;
      try {
        // Try to get the token's total supply from the database first
        const token = await context.db.find(tokens, { address: projectTokenAddress });
        
        if (token && token.totalSupply) {
          totalSupply = token.totalSupply;
        } else {
          // If not available, fetch it from the blockchain
          const result = await context.client.readContract({
            address: projectTokenAddress,
            abi: erc20Abi,
            functionName: "totalSupply",
          });
          
          totalSupply = result;
          
          // Update token with total supply
          if (token) {
            await context.db.update(tokens, { address: projectTokenAddress })
              .set({ totalSupply });
          }
        }
      } catch (error) {
        console.error(`Error fetching total supply:`, error);
        return;
      }
      
      // Calculate percentage of supply
      const percentOfSupply = calculateSupplyPercentage(projectTokenAmount, totalSupply);
      
      // Create unique ID for this sniper
      const sniperId = `${poolAddress.toLowerCase()}-${to.toLowerCase()}`;
      
      // Check if sniper already exists
      const existingSniper = await context.db.find(snipers, { id: sniperId });
      
      if (existingSniper) {
        // Update existing sniper
        await context.db.update(snipers, { id: sniperId })
          .set({
            ethAmount: existingSniper.ethAmount + baseTokenAmount,
            tokenAmount: existingSniper.tokenAmount + projectTokenAmount,
            percentOfSupply: calculateSupplyPercentage(
              existingSniper.tokenAmount + projectTokenAmount, 
              totalSupply
            ),
          });
      } else {
        // Insert new sniper
        await context.db.insert(snipers).values({
          id: sniperId,
          pool: poolAddress,
          address: to,
          ethAmount: baseTokenAmount,
          tokenAmount: projectTokenAmount,
          percentOfSupply,
        });
      }
      
      // Update the pool stats with the incremental change
      // Get current stats from the pool
      const currentBaseVolume = pool.totalSniperVolume || 0n;
      const currentSnipersCount = pool.totalSnipersCount || 0;
      const wasNewSniper = !existingSniper;
      
      // Add the existing sniper's amounts if it exists
      let updatedTokenAmount = projectTokenAmount;
      if (existingSniper) {
        updatedTokenAmount += existingSniper.tokenAmount;
      }
      
      // Update pool with snipers info
      await context.db.update(poolsV2, { id: poolAddress })
        .set({
          totalSniperVolume: currentBaseVolume + baseTokenAmount,
          // Only increment count if this is a new sniper
          totalSnipersCount: wasNewSniper ? currentSnipersCount + 1 : currentSnipersCount,
          totalSniperSupplyPercent: calculateSupplyPercentage(
            (pool.totalSniperVolume || 0n) + updatedTokenAmount, 
            totalSupply
          ),
        });
    }
    // CASE 2: TEAM BUNDLE DETECTION - Transaction is the launch transaction
    else if (isTeamBundleCandidate(txHash, pool.launchTxHash)) {
      console.log("Team bundle detected!");
      // Update pool with team bundle information
      await context.db.update(poolsV2, { id: poolAddress })
        .set({ teamBundle: true });
      
      // Also mark the token as having a team bundle
      await context.db.update(tokens, { address: projectTokenAddress })
        .set({ hasTeamBundle: true });
    }
  }
});