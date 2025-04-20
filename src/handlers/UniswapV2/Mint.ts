import { ponder } from "ponder:registry";
import { poolsV2, tokens } from "ponder:schema";
import { isEthToken, processInitialLp, calculateMarketCap } from "../../utils/sniper";
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
  
  // Determine which token is ETH/WETH
  const token0IsEth = isEthToken(pool.token0);
  const token1IsEth = isEthToken(pool.token1);
  
  // If neither is ETH/WETH, skip
  if (!token0IsEth && !token1IsEth) {
    return;
  }
  
  // Determine which token is non-ETH
  const tokenAddress = token0IsEth ? pool.token1 : pool.token0;
  
  // Extract ETH amount
  const initialLpEth = processInitialLp({
    amount0,
    amount1,
    token0: pool.token0,
    token1: pool.token1,
  });
  
  // If no ETH in the LP, skip
  if (initialLpEth === 0n) {
    return;
  }
  
  // Update pool with initial LP information
  await context.db.update(poolsV2, { id: pairAddress })
    .set({ initialLpEth });
    
  // Get token information to calculate market cap
  const token = await context.db.find(tokens, { address: tokenAddress });
  if (!token) {
    console.error(`Token ${tokenAddress} not found in the database`);
    return;
  }
  
  // If no total supply in the database, fetch it
  let totalSupply = token.totalSupply;
  if (!totalSupply) {
    try {
      const result = await context.client.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "totalSupply",
      });
      totalSupply = result;
    } catch (error) {
      console.error(`Error fetching total supply for ${tokenAddress}:`, error);
      return;
    }
  }
  
  if (!totalSupply) {
    console.error(`Could not determine total supply for ${tokenAddress}`);
    return;
  }
  
  // Determine token amount in the LP
  const tokenAmount = token0IsEth ? amount1 : amount0;
  
  // Calculate market cap
  const marketCap = calculateMarketCap(totalSupply, initialLpEth, tokenAmount);
  
  // Update token with market cap
  await context.db.update(tokens, { address: tokenAddress })
    .set({ 
      totalSupply, // Ensure we have the latest supply
      marketCap 
    });
});

