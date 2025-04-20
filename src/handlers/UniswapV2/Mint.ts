import { ponder } from "ponder:registry";
import { poolsV2, tokens } from "ponder:schema";
import { processInitialLp } from "../../utils/sniper";
import { calculateMarketCap } from "../../utils/marketCap";
import { erc20Abi } from "viem";

// Handle Mint events to track initial LP
ponder.on("UniswapV2Factory:Mint", async ({ event, context }) => {
  const pairAddress = event.log.address;
  const blockNumber = Number(event.block.number);
  const { sender, amount0, amount1 } = event.args;
  
  // Get pool record
  const pool = await context.db.find(poolsV2, { id: pairAddress });
  
  // If pool doesn't exist or this isn't the launch block, skip
  if (!pool || blockNumber !== pool.launchBlock) {
    return;
  }
  
  // If pool already has initialLpEth set, skip (only capture the first mint)
  if (pool.initialLpEth && pool.initialLpEth > 0n) {
    return;
  }
  
  // Determine base token amount (could be ETH, USDC, or USDT)
  // Note: token0 is now always the base token in our schema, but we need to account
  // for the original order in the blockchain using baseTokenIsToken0
  const initialBaseAmount = processInitialLp({
    amount0,
    amount1,
    token0: pool.baseTokenIsToken0 ? pool.token0 : pool.token1,
    token1: pool.baseTokenIsToken0 ? pool.token1 : pool.token0,
  });
  
  // If no base token in the LP, skip
  if (initialBaseAmount === 0n) {
    return;
  }
  
  // Update pool with initial LP information
  await context.db.update(poolsV2, { id: pairAddress })
    .set({ initialLpEth: initialBaseAmount });
    
  // The project token is always token1 in our normalized schema
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
      const result = await context.client.readContract({
        address: projectTokenAddress,
        abi: erc20Abi,
        functionName: "totalSupply",
      });
      totalSupply = result;
    } catch (error) {
      console.error(`Error fetching total supply for ${projectTokenAddress}:`, error);
      return;
    }
  }
  
  if (!totalSupply) {
    console.error(`Could not determine total supply for ${projectTokenAddress}`);
    return;
  }
  
  // Determine token amount in the LP
  const tokenAmount = pool.baseTokenIsToken0 ? amount1 : amount0;
  
  // Calculate market cap
  const marketCap = calculateMarketCap(totalSupply, initialBaseAmount, tokenAmount);
  
  // Update token with market cap
  await context.db.update(tokens, { address: projectTokenAddress })
    .set({ 
      totalSupply, // Ensure we have the latest supply
      marketCap 
    });
});

