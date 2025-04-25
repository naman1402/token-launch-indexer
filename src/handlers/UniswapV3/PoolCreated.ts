import { ponder } from "ponder:registry"
import { poolsV3, tokens, funding } from "ponder:schema"
import { getTokenMetadata } from "../../utils/getMetadata"
import { isBaseToken, normalizeTokenOrder } from "../../utils/baseTokens"
import { erc20Abi } from "viem"
import { findThreeLevelFunders } from "../../utils/funding"

// Handler for pool creation event in Uniswap V3
ponder.on("UniswapV3Factory:PoolCreated", async ({ event, context }) => {
  // Extract event data
  const token0 = event.args.token0 as `0x${string}`;
  const token1 = event.args.token1 as `0x${string}`;
  const pool = event.args.pool as `0x${string}`;
  const fee = Number(event.args.fee);
  const blockNumber = Number(event.block.number);

  // Check if either token is a base token (ETH/USDC/USDT)
  const token0IsBase = isBaseToken(token0);
  const token1IsBase = isBaseToken(token1);
  
  // If neither token is a base token, we can skip as we're only interested in base token pairs
  if (!token0IsBase && !token1IsBase) {
    return;
  }

  // Normalize token order to ensure base token is token0 and project token is token1
  const { baseToken, projectToken, baseIsToken0 } = normalizeTokenOrder(token0, token1);

  // Get token metadata
  const baseTokenMetadata = await getTokenMetadata({
    client: context.client,
    address: baseToken,
  });

  const projectTokenMetadata = await getTokenMetadata({
    client: context.client,
    address: projectToken,
  });

  const launchTimestamp = Number(event.block.timestamp);
  const launchBlock = blockNumber;

  // Get total supply of the project token
  let totalSupply = 0n;
  try {
    const result = await context.client.readContract({
      address: projectToken as `0x${string}`,
      abi: erc20Abi,
      functionName: "totalSupply",
    });
    totalSupply = result;
  } catch (error) {
    console.error(`Error fetching total supply for ${projectToken}:`, error);
  }

  // Insert or update base token record
  const existingBaseToken = await context.db.find(tokens, { address: baseToken as `0x${string}` });
  if (!existingBaseToken) {
    // Insert base token if it doesn't exist
    await context.db.insert(tokens).values({
      address: baseToken as `0x${string}`, 
      name: baseTokenMetadata.name,
      symbol: baseTokenMetadata.symbol,
      creationBlock: launchBlock,
      deployer: event.transaction.from,
      totalSupply: undefined, // We typically don't need to track supply for base tokens
    });
  }
  
  // Insert or update project token record
  const existingProjectToken = await context.db.find(tokens, { address: projectToken as  `0x${string}` });;
  if (existingProjectToken) {
    // Project token exists but we might want to update its total supply
    await context.db.update(tokens, { address: projectToken as  `0x${string}` })
      .set({
        totalSupply: totalSupply,
      });
  } else {
    // Insert project token
    await context.db.insert(tokens).values({
      address: projectToken as `0x${string}`, 
      name: projectTokenMetadata.name,
      symbol: projectTokenMetadata.symbol,
      creationBlock: launchBlock,
      deployer: event.transaction.from,
      totalSupply: totalSupply,
    });
  }

  // Insert pool record - ensuring base token is always token0
  await context.db.insert(poolsV3).values({
    id: pool,
    token0: baseToken as `0x${string}`,  // This is now always the base token (WETH/USDC/USDT)
    token1: projectToken as `0x${string}`, // This is now always the project token
    fee: fee, // V3 specific parameter
    lpType: "UniswapV3",
    launchBlock: launchBlock,
    launchTimestamp: launchTimestamp,
    launchTxHash: event.transaction.hash, // Store the transaction hash of the launch
    baseTokenIsToken0: baseIsToken0, // Track original token order for event processing
  });

  // Get deployer address
  const deployer = event.transaction.from;
  try {
    console.log(`Finding funders for deployer ${deployer} of token ${projectToken}`);
    const funders = await findThreeLevelFunders(deployer, BigInt(launchBlock));
    
    // Create funding entries if funders exist
    if (funders.level1) {
      const fundingId = `${projectToken.toLowerCase()}-1`;
      await context.db.insert(funding).values({
        id: fundingId,
        token: projectToken as `0x${string}`,
        level: 1,
        from: funders.level1,
        to: deployer,
        value: 0n,
      });
    }

    if (funders.level2) {
      const fundingId = `${projectToken.toLowerCase()}-2`;
      await context.db.insert(funding).values({
        id: fundingId,
        token: projectToken as `0x${string}`,
        level: 2,
        from: funders.level2,
        to: deployer,
        value: 0n,
      });
    }

    if (funders.level3) {
      const fundingId = `${projectToken.toLowerCase()}-3`;
      await context.db.insert(funding).values({
        id: fundingId,
        token: projectToken as `0x${string}`,
        level: 3,
        from: funders.level3,
        to: deployer,
        value: 0n,
      });
    }
    
    // If we found any funders, update the token to reflect that
    if (funders.level1 || funders.level2 || funders.level3) {
      await context.db.update(tokens, { address: projectToken as `0x${string}`})
        .set({ hasFunding: true });
    }
  } catch(e) {
    console.error(`Error finding funders for deployer ${deployer} of token ${projectToken}:`, e);
  }
});