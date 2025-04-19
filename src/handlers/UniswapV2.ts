import { ponder } from "ponder:registry"
import { pools, tokens } from "ponder:schema"
import schema  from "ponder:schema"
import { getTokenMetadata } from "../utils/getMetadata"

ponder.on("UniswapV2Factory:PairCreated", async ({ event, context }) => {
    // event PairCreated(address indexed token0, address indexed token1, address pair, uint)
    // const { token0, token1, pair, blockNumber } = event.args
    const token0 =  event.args[0] as `0x${string}`
    const token1 =  event.args[1] as `0x${string}`
    const pair =  event.args[2] as `0x${string}`
    const blockNumber = Number(event.block.number)

    const token0Metadata = await getTokenMetadata({
        client: context.client,
        address: token0,
    })

    const token1Metadata = await getTokenMetadata({
        client: context.client,
        address: token1,
    })

    const launchTimestamp = Number(event.block.timestamp)
    const launchBlock = blockNumber

    await context.db.insert(schema.tokens).values({
        address: token0, 
        name: token0Metadata.name,
        symbol: token0Metadata.symbol,
        creationBlock: launchBlock,
        deployer: event.transaction.from,
    })
    await context.db.insert(schema.tokens).values({
        address: token1, 
        name: token1Metadata.name,
        symbol: token1Metadata.symbol,
        creationBlock: launchBlock,
        deployer: event.transaction.from,
    })
    await context.db.insert(schema.pools).values({
        id: pair,
        token0: token0,
        token1: token1,
        lpType: "UniswapV2",
        launchBlock: launchBlock,
        launchTimestamp: launchTimestamp,
    })

})