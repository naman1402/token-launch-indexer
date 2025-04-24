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

  // Extract event data using named arguments now that we have full ABIs
  const token0 = event.args.token0;
  const token1 = event.args.token1;
  const pair = event.args.pair;
  const blockNumber = Number(event.block.number);
  
  console.log("PairCreated event detected!");
  console.log(`token0: ${token0}`);
  console.log(`token1: ${token1}`);
  console.log(`pair: ${pair}`);

  // Check if either token is a base token (ETH/USDC/USDT)
  const token0IsBase = isBaseToken(token0);
  const token1IsBase = isBaseToken(token1);
  
  console.log(`Base token check results - token0: ${token0IsBase}, token1: ${token1IsBase}`);
  
  // For testing, temporarily process all pairs
  // Uncomment this if you only want to process pairs with base tokens
  // if (!token0IsBase && !token1IsBase) {
  //   console.log("Neither token is a base token, skipping");
  //   return;
  // }

  try {
    // Normalize token order to ensure base token is token0 and project token is token1
    const { baseToken, projectToken, baseIsToken0 } = normalizeTokenOrder(token0, token1);
    console.log(`Normalized tokens - baseToken: ${baseToken}, projectToken: ${projectToken}`);

    // Get token metadata
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

    // Insert base token
    console.log(`Inserting base token: ${baseToken}`);
    await context.db.insert(tokens).values({
      address: baseToken as `0x${string}`, 
      name: baseTokenMetadata.name || "Unknown",
      symbol: baseTokenMetadata.symbol || "UNK",
      creationBlock: launchBlock,
      deployer: event.transaction.from,
    }).onConflictDoNothing();
    
    // Insert project token
    console.log(`Inserting project token: ${projectToken}`);
    await context.db.insert(tokens).values({
      address: projectToken as `0x${string}`, 
      name: projectTokenMetadata.name || "Unknown",
      symbol: projectTokenMetadata.symbol || "UNK",
      creationBlock: launchBlock,
      deployer: event.transaction.from,
    }).onConflictDoNothing();

    console.log("Successfully inserted token records");

    // Insert pool record
    console.log(`Inserting pool record: ${pair}`);
    await context.db.insert(poolsV2).values({
      id: pair,
      token0: baseToken as `0x${string}`,
      token1: projectToken as `0x${string}`,
      lpType: "UniswapV2",
      launchBlock: launchBlock,
      launchTimestamp: launchTimestamp,
      launchTxHash: event.transaction.hash,
      baseTokenIsToken0: baseIsToken0,
    });

    console.log("Successfully inserted pool record");
    
    // Rest of your handler logic...
  } catch (error) {
    console.error("Error processing token data:", error);
  }
});