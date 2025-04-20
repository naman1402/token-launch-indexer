import { ponder } from "ponder:registry"
import { poolsV2, tokens, funding } from "ponder:schema"
import { getTokenMetadata } from "../../utils/getMetadata"
import { isEthToken } from "../../utils/sniper"
import { erc20Abi } from "viem"
import { containsNodeError } from "viem/utils"
import { trace } from "console"
import { findThreeLevelFunders } from "../../utils/funding"

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
  await context.db.insert(poolsV2).values({
    id: pair,
    token0: token0,
    token1: token1,
    lpType: "UniswapV2",
    launchBlock: launchBlock,
    launchTimestamp: launchTimestamp,
  });

  // Get deployer address
  const deployer = event.transaction.from;
  try {
    console.log(`Finding funders for deployer ${deployer} of token ${tokenAddress}`);
    const funders = await findThreeLevelFunders(deployer, BigInt(launchBlock));
    if (funders.level1) {
      await context.db.insert(funding).values({
        id: `${tokenAddress}-1`,
        token: tokenAddress,
        level: 1,
        from: funders.level1,
        to: deployer,
        value: 0n, // You'd need to fetch the actual value from transaction data
      });
    }

    if (funders.level2) {
      await context.db.insert(funding).values({
        id: `${tokenAddress}-2`,
        token: tokenAddress,
        level: 2,
        from: funders.level2,
        to: deployer,
        value: 0n, // You'd need to fetch the actual value from transaction data
      });
    }

    if (funders.level3) {
      await context.db.insert(funding).values({
        id: `${tokenAddress}-3`,
        token: tokenAddress,
        level: 3,
        from: funders.level3,
        to: deployer,
        value: 0n, // You'd need to fetch the actual value from transaction data
      });
    }
  } catch(e) {
    console.error(`Error finding funders for deployer ${deployer} of token ${tokenAddress}:`, e);
  }
});