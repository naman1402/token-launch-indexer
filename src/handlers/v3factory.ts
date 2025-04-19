// src/handlers/uniswapV3.ts
import { ponder } from "ponder:registry";
import { ethers } from "ethers";
import { erc20Abi } from "../../abis/ERC20ABI";

// Handle PoolCreated events from Uniswap V3 Factory
ponder.on("UniswapV3Factory:PoolCreated", async ({ event, context }) => {
  const { db } = context;
  const { token0, token1, fee, pool: poolAddress } = event.args;

  console.log(`New V3 pool detected: ${poolAddress}`);
  console.log(`Token0: ${token0}, Token1: ${token1}, Fee: ${fee}`);

  // Get or create token0
  await createOrUpdateToken(token0, context);
  
  // Get or create token1
  await createOrUpdateToken(token1, context);

  // Create the pool entry
  await db.Pool.create({
    id: poolAddress.toLowerCase(),
    data: {
      token0: token0.toLowerCase(),
      token1: token1.toLowerCase(),
      lpType: `UniswapV3_${fee}`, // Store the fee tier in the LP type
      launchBlock: Number(event.blockNumber),
      launchTimestamp: Number(event.block.timestamp),
    },
  });
});

// Helper function to create or update a token with metadata
async function createOrUpdateToken(
  tokenAddress: string, 
  context: any
): Promise<void> {
  const { db, client } = context;
  const address = tokenAddress.toLowerCase();
  
  // Check if token already exists
  const existingToken = await db.Token.findUnique({ id: address });
  if (existingToken) {
    console.log(`Token ${address} already indexed.`);
    return;
  }

  // Create contract instance
  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, client);
  
  try {
    // Fetch token metadata
    const [name, symbol, decimalsResult] = await Promise.all([
      tokenContract.name().catch(() => "Unknown"),
      tokenContract.symbol().catch(() => "UNKNOWN"),
      tokenContract.decimals().catch(() => 18),
    ]);

    // Create token record
    await db.Token.create({
      id: address,
      data: {
        name,
        symbol,
        decimals: Number(decimalsResult),
      },
    });
    
    console.log(`Indexed token: ${symbol} (${address})`);
  } catch (error) {
    console.error(`Error indexing token ${address}:`, error);
    
    // Create token with minimal information if metadata fetch fails
    await db.Token.create({
      id: address,
      data: {
        name: "Unknown",
        symbol: "UNKNOWN",
        decimals: 18,
      },
    });
  }
}