import { ponder } from "ponder:registry";
import { pools, tokens, snipers } from "ponder:schema";
import { 
  isEthToken, 
  isSniper, 
  extractEthAmount, 
  extractTokenAmount,
  calculateSupplyPercentage,
  calculateSniperVolume,
  getUniqueAddresses,
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

// Handle Swap events to track snipers
ponder.on("UniswapV2Factory:Swap", async ({ event, context }) => {
  const pairAddress = event.log.address;
  const blockNumber = Number(event.block.number);
  const { sender, amount0In, amount1In, amount0Out, amount1Out, to } = event.args;
  
  // Skip transactions from/to the zero address
  if (to.toLowerCase() === zeroAddress || to.toLowerCase() === pairAddress.toLowerCase()) {
    return;
  }
  
  // Get pool information
  const pool = await context.db.find(pools, { id: pairAddress });
  
  // If pool doesn't exist, skip
  if (!pool) {
    return;
  }
  
  // Check if this is a sniper (transaction in the launch block)
  if (!isSniper(blockNumber, pool.launchBlock)) {
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
  
  // Get token's total supply
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
  await context.db.update(pools, { id: pairAddress })
    .set({
      totalSniperVolume: currentEthVolume + ethAmount,
      // Only increment count if this is a new sniper
      totalSnipersCount: wasNewSniper ? currentTokensCount + 1 : currentTokensCount,
      totalSniperSupplyPercent: calculateSupplyPercentage(
        (pool.totalSniperVolume || 0n) + updatedTokenAmount, 
        totalSupply
      ),
    });
}); 