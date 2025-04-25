import { ponder } from "ponder:registry";
import { poolsV3, tokens } from "ponder:schema";
import { processInitialLp } from "../../utils/sniper";
import { calculateMarketCap } from "../../utils/marketCap";
import { erc20Abi } from "viem";

// Handler for Initialize events to track initial LP in Uniswap V3
ponder.on("UniswapV3Pool:Initialize", async ({ event, context }) => {
  const poolAddress = event.log.address;
  const blockNumber = Number(event.block.number);
  const sqrtPriceX96 = event.args.sqrtPriceX96;
  
  // Get pool information
  const pool = await context.db.find(poolsV3, { id: poolAddress });
  
  // If pool doesn't exist or this isn't the launch block, skip
  if (!pool || blockNumber !== pool.launchBlock) {
    return;
  }
  
  // For V3 pools, the initial LP amount will be updated by the first Mint event
  // We're just marking that initialization happened here
  console.log(`V3 pool ${poolAddress} initialized with sqrtPriceX96: ${sqrtPriceX96}`);
});