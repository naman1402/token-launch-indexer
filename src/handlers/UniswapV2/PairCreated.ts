import { ponder } from "ponder:registry"
import { poolsV2, tokens, funding, dummyTable } from "ponder:schema"
import { getTokenMetadata } from "../../utils/getMetadata"
import { isBaseToken, normalizeTokenOrder } from "../../utils/baseTokens"
import { erc20Abi } from "viem"
import { findThreeLevelFunders } from "../../utils/funding"

// Handler for pair creation event
ponder.on("UniswapV2Factory:PairCreated", async ({ event, context }) => {
  try {
    // Basic test: Add entry to dummy table regardless of anything else
    console.log("Attempting to insert into dummy table...");
    await context.db.insert(dummyTable).values({
      id: `dummy-${Date.now()}`,
      name: `Event from block ${event.block.number}`,
      value: Number(event.block.number),
      created_at: Number(event.block.timestamp),
    });
    console.log("Successfully inserted into dummy table!");
  } catch (error) {
    console.error("Failed to insert into dummy table:", error);
  }

  // Extract event data
  const token0 = event.args[0] as `0x${string}`;
  const token1 = event.args[1] as `0x${string}`;
  const pair = event.args[2] as `0x${string}`;
  const blockNumber = Number(event.block.number);
  
  console.log("PairCreated event detected!");
  console.log(`token0: ${token0}`);
  console.log(`token1: ${token1}`);
  console.log(`pair: ${pair}`);

  // Check if either token is a base token (ETH/USDC/USDT)
  const token0IsBase = isBaseToken(token0);
  const token1IsBase = isBaseToken(token1);
  
  // If neither token is a base token, we can skip as we're only interested in base token pairs
  if (!token0IsBase && !token1IsBase) {
    console.log("Neither token is a base token, skipping");
    return;
  }

  // Normalize token order to ensure base token is token0 and project token is token1
  const { baseToken, projectToken, baseIsToken0 } = normalizeTokenOrder(token0, token1);

  // Get token metadata - wrapped in try/catch to prevent failures
  try {
    console.log(`Getting metadata for tokens: ${baseToken} and ${projectToken}`);
    
    const baseTokenMetadata = await getTokenMetadata({
      client: context.client,
      address: baseToken,
    });

    const projectTokenMetadata = await getTokenMetadata({
      client: context.client,
      address: projectToken,
    });

    console.log(`Base token metadata: ${JSON.stringify(baseTokenMetadata)}`);
    console.log(`Project token metadata: ${JSON.stringify(projectTokenMetadata)}`);

    const launchTimestamp = Number(event.block.timestamp);
    const launchBlock = blockNumber;

    // Get total supply of the project token
    let totalSupply = 0n;
    try {
      console.log(`Getting total supply for ${projectToken}`);
      const result = await context.client.readContract({
        address: projectToken,
        abi: erc20Abi,
        functionName: "totalSupply",
      });
      totalSupply = result;
      console.log(`Total supply: ${totalSupply}`);
    } catch (error) {
      console.error(`Error fetching total supply for ${projectToken}:`, error);
    }

    // Insert base token
    console.log(`Inserting base token: ${baseToken}`);
    await context.db.insert(tokens).values({
      address: baseToken, 
      name: baseTokenMetadata.name || "Unknown",
      symbol: baseTokenMetadata.symbol || "UNK",
      creationBlock: launchBlock,
      deployer: event.transaction.from,
      totalSupply: undefined, // We typically don't need to track supply for base tokens
    }).onConflictDoNothing();
    
    // Insert project token
    console.log(`Inserting project token: ${projectToken}`);
    await context.db.insert(tokens).values({
      address: projectToken, 
      name: projectTokenMetadata.name || "Unknown",
      symbol: projectTokenMetadata.symbol || "UNK",
      creationBlock: launchBlock,
      deployer: event.transaction.from,
      totalSupply: totalSupply,
    }).onConflictDoNothing();

    console.log("Successfully inserted token records");

    // Insert pool record - ensuring base token is always token0
    console.log(`Inserting pool record: ${pair}`);
    await context.db.insert(poolsV2).values({
      id: pair,
      token0: baseToken,  // This is now always the base token (WETH/USDC/USDT)
      token1: projectToken, // This is now always the project token
      lpType: "UniswapV2",
      launchBlock: launchBlock,
      launchTimestamp: launchTimestamp,
      launchTxHash: event.transaction.hash,  // Store the transaction hash of the launch
      baseTokenIsToken0: baseIsToken0, // Storing the original order for reference when processing events
    });

    console.log("Successfully inserted pool record");

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
          token: projectToken,
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
          token: projectToken,
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
          token: projectToken,
          level: 3,
          from: funders.level3,
          to: deployer,
          value: 0n,
        });
      }
      
      // If we found any funders, update the token to reflect that
      if (funders.level1 || funders.level2 || funders.level3) {
        await context.db.update(tokens, { address: projectToken })
          .set({ hasFunding: true });
      }
    } catch(e) {
      console.error(`Error finding funders for deployer ${deployer} of token ${projectToken}:`, e);
    }
  } catch (error) {
    console.error("Error processing token data:", error);
  }
});