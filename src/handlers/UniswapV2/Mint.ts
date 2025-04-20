import { ponder } from "ponder:registry";
import { poolsV2 } from "ponder:schema";
import { isEthToken, processInitialLp } from "../../utils/sniper";

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
});

