import { ponder } from "ponder:registry";
import { poolsV3, tokens, snipers } from "ponder:schema";
import { 
  WETH_ADDRESS,
  isBaseToken 
} from "../../utils/baseTokens";
import {
  isSniper,
  extractBaseTokenAmount, 
  extractProjectTokenAmount,
  calculateSniperVolume
} from "../../utils/sniper";
import {
  isTeamBundleCandidate
} from "../../utils/bundle";
import {
  calculateSupplyPercentage,
  getUniqueAddresses
} from "../../utils/utils";
import { erc20Abi, zeroAddress } from "viem";

// Type definition for sniper to avoid 'any' type
interface SniperRecord {
  id: string;
  pool: string;
  address: string;
  ethAmount: bigint;
  tokenAmount: bigint;
  percentOfSupply: number;
}

// Handle Swap events to track snipers and team bundles in Uniswap V3
ponder.on("UniswapV3Pool:Swap", async ({ event, context }) => {
  const poolAddress = event.log.address;
  const blockNumber = Number(event.block.number);
  const txHash = event.transaction.hash;
  const { sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick } = event.args;
  
  // Skip transactions from/to the zero address or pool itself
  if (recipient.toLowerCase() === zeroAddress || recipient.toLowerCase() === poolAddress.toLowerCase()) {
    return;
  }
  
  // Get pool information
  const pool = await context.db.find(poolsV3, { id: poolAddress });
  
  // If pool doesn't exist, skip
  if (!pool) {
    return;
  }
  
  // In our schema, token0 is the base token and token1 is the project token
  // But we need to account for the original order using baseTokenIsToken0
  const baseTokenAddress = pool.token0;
  const projectTokenAddress = pool.token1;
  const baseIsToken0 = pool.baseTokenIsToken0;

  // V3 swap direction is determined by the sign of amount0 and amount1
  // We need to consider the original token order to correctly identify buys vs sells
  let baseTokenAmount = 0n;
  let projectTokenAmount = 0n;
  
  // Determine if this is a buy or sell, accounting for token order
  const isBuy = baseIsToken0 
    ? (amount0 > 0n && amount1 < 0n)  // Base is token0: sending base, receiving project
    : (amount0 < 0n && amount1 > 0n); // Base is token1: sending project, receiving base
  
  if (isBuy) {
    // User is buying the project token
    baseTokenAmount = baseIsToken0 ? amount0 : amount1;
    projectTokenAmount = baseIsToken0 ? -amount1 : -amount0; // Make positive for easier handling
  } else {
    // Not a buy, we don't track these as snipers
    return;
  }
  
  // CASE 1: SNIPER DETECTION - Transaction in the launch block
  if (isSniper(blockNumber, pool.launchBlock)) {
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
    const sniperId = `${poolAddress.toLowerCase()}-${recipient.toLowerCase()}`;
    
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
        address: recipient,
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
    await context.db.update(poolsV3, { id: poolAddress })
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
    // Update pool with team bundle information
    await context.db.update(poolsV3, { id: poolAddress })
      .set({ teamBundle: true });
    
    // Also mark the token as having a team bundle
    await context.db.update(tokens, { address: projectTokenAddress })
      .set({ hasTeamBundle: true });
  }
});