import { ponder } from "ponder:registry";
import { poolsV2, tokens } from "ponder:schema";
import { processInitialLp } from "../../utils/sniper";
import { calculateMarketCap } from "../../utils/marketCap";
import { erc20Abi } from "viem";

// Handle Mint events to track initial LP
ponder.on("UniswapV2Pair:Mint", async ({ event, context }) => {
  const poolAddress = event.log.address;
  const blockNumber = Number(event.block.number);
  const { sender, amount0, amount1 } = event.args;
  
  console.log(`Mint event detected in pool: ${poolAddress}`);
  console.log(`amount0: ${amount0}, amount1: ${amount1}, sender: ${sender}`);
  
  // Get pool information
  const pool = await context.db.find(poolsV2, { id: poolAddress });
  
  // If pool doesn't exist or this isn't the launch block, skip
  if (!pool || blockNumber !== pool.launchBlock) {
    console.log(`Pool not found or not launch block. Pool exists: ${!!pool}, Block: ${blockNumber}, Launch block: ${pool?.launchBlock}`);
    return;
  }
  
  // If pool already has initialLpEth set, skip (only capture the first mint)
  if (pool.initialLpEth && pool.initialLpEth > 0n) {
    console.log(`Pool already has initial LP set: ${pool.initialLpEth}`);
    return;
  }
  
  // Account for the original token order using baseTokenIsToken0
  const initialBaseAmount = processInitialLp({
    amount0,
    amount1,
    token0: pool.baseTokenIsToken0 ? pool.token0 : pool.token1,
    token1: pool.baseTokenIsToken0 ? pool.token1 : pool.token0,
  });
  
  // If no base token in the LP, skip
  if (initialBaseAmount === 0n) {
    console.log("No base token in LP, skipping");
    return;
  }
  
  // Update pool with initial LP information
  console.log(`Setting initial LP amount: ${initialBaseAmount}`);
  await context.db.update(poolsV2, { id: poolAddress })
    .set({ initialLpEth: initialBaseAmount });
  
  // Project token is always token1 in our normalized schema
  const projectTokenAddress = pool.token1;

  // Get token information to calculate market cap
  const token = await context.db.find(tokens, { address: projectTokenAddress });
  if (!token) {
    console.error(`Token ${projectTokenAddress} not found in the database`);
    return;
  }
  
  // If no total supply in the database, fetch it
  let totalSupply = token.totalSupply;
  if (!totalSupply) {
    try {
      console.log(`Fetching total supply for ${projectTokenAddress}`);
      const result = await context.client.readContract({
        address: projectTokenAddress,
        abi: erc20Abi,
        functionName: "totalSupply",
      });
      totalSupply = result;
      console.log(`Total supply: ${totalSupply}`);
    } catch (error) {
      console.error(`Error fetching total supply for ${projectTokenAddress}:`, error);
      return;
    }
  }
  
  if (!totalSupply) {
    console.error(`Could not determine total supply for ${projectTokenAddress}`);
    return;
  }
  
  // For calculating market cap, consider the original token order
  const tokenAmount = pool.baseTokenIsToken0 ? amount1 : amount0;
  
  // Calculate market cap
  console.log(`Calculating market cap with totalSupply: ${totalSupply}, initialBaseAmount: ${initialBaseAmount}, tokenAmount: ${tokenAmount}`);
  const marketCap = calculateMarketCap(totalSupply, initialBaseAmount, tokenAmount);
  
  // Update token with market cap
  console.log(`Updating token with market cap: ${marketCap}`);
  await context.db.update(tokens, { address: projectTokenAddress })
    .set({ 
      totalSupply, // Ensure we have the latest supply
      marketCap 
    });
});

