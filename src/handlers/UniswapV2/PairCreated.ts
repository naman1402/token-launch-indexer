import { ponder } from "ponder:registry"
import { pools, tokens } from "ponder:schema"
import { getTokenMetadata } from "../../utils/getMetadata"
import { isEthToken } from "../../utils/sniper"
import { erc20Abi } from "viem"

// Handler for pair creation event
ponder.on("UniswapV2Factory:PairCreated", async ({ event, context }) => {
  // Extract event data
  const token0 = event.args[0] as `0x${string}`;
  const token1 = event.args[1] as `0x${string}`;
  const pair = event.args[2] as `0x${string}`;
  const blockNumber = Number(event.block.number);

  // Get token metadata
  const token0Metadata = await getTokenMetadata({
    client: context.client,
    address: token0,
  });

  const token1Metadata = await getTokenMetadata({
    client: context.client,
    address: token1,
  });

  const launchTimestamp = Number(event.block.timestamp);
  const launchBlock = blockNumber;

  // Check which token is ETH/WETH
  const token0IsEth = isEthToken(token0);
  const token1IsEth = isEthToken(token1);
  
  // If neither token is ETH/WETH, we can skip as we're only interested in ETH pairs
  // (you can remove this if you want to track all pairs)
  if (!token0IsEth && !token1IsEth) {
    return;
  }

  // Determine which is the token (not ETH)
  const tokenAddress = token0IsEth ? token1 : token0;

  // Get total supply of the token
  let totalSupply = 0n;
  try {
    const result = await context.client.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "totalSupply",
    });
    totalSupply = result;
  } catch (error) {
    console.error(`Error fetching total supply for ${tokenAddress}:`, error);
  }

  // Insert token records
  await context.db.insert(tokens).values({
    address: token0, 
    name: token0Metadata.name,
    symbol: token0Metadata.symbol,
    creationBlock: launchBlock,
    deployer: event.transaction.from,
    totalSupply: token0 === tokenAddress ? totalSupply : undefined,
  });
  
  await context.db.insert(tokens).values({
    address: token1, 
    name: token1Metadata.name,
    symbol: token1Metadata.symbol,
    creationBlock: launchBlock,
    deployer: event.transaction.from,
    totalSupply: token1 === tokenAddress ? totalSupply : undefined,
  });

  // Insert pool record (we'll update with LP info after analyzing the Mint event)
  await context.db.insert(pools).values({
    id: pair,
    token0: token0,
    token1: token1,
    lpType: "UniswapV2",
    launchBlock: launchBlock,
    launchTimestamp: launchTimestamp,
  });
});