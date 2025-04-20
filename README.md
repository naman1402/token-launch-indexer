# Token Launch Indexer

This project indexes newly launched tokens on Uniswap, tracking their initial liquidity, sniper activity, and other metrics.

## Project Structure

The codebase is organized as follows:

### Schema

`ponder.schema.ts` defines the database schema with the following tables:
- `tokens`: Stores token metadata and total supply
- `pools`: Stores pool information, initial LP, and sniper statistics 
- `snipers`: Tracks individual sniper addresses and their activity

### Handlers

There are two approaches for handling events:

#### Option 1: Consolidated Handlers

In this approach, all related events are handled in a single file:
- `src/handlers/UniswapV2.ts`: Handles the `PairCreated` event
- `src/handlers/UniswapV2Pair.ts`: Handles `Mint` and `Swap` events for UniswapV2 pairs

#### Option 2: Separated Event Handlers

Alternatively, you can separate handlers by event type:
- `src/handlers/UniswapV2Factory.ts`: For factory events (PairCreated)
- `src/handlers/UniswapV2PairMint.ts`: For LP provision events (Mint)
- `src/handlers/UniswapV2PairSwap.ts`: For swap events (Swap)

### Utilities

- `src/utils/sniper.ts`: Contains utilities for tracking sniper activity
- `src/utils/getMetadata.ts`: Fetches token metadata

## Implementing the Handlers

Due to issues with the current Ponder API and event type definitions, there are a few options:

1. **Fix the config.ts file** to properly include the UniswapV2Pair factory pattern
2. **Use a dynamic approach** where you create UnsiwapV2Pair contract instances in the PairCreated handler

## Recommendations

Since you mentioned not to change the config.ts file, I recommend the following approach:

1. Use the UniswapV2.ts handler as implemented to track pair creation
2. Create a utility function to handle Mint and Swap events by listening to those events through transaction logs rather than using direct Ponder event handlers

## Metrics Tracked

1. **Initial LP**
   - ETH amount provided as initial liquidity

2. **Snipers**
   - Addresses that bought in the same block as launch
   - Total ETH volume from snipers
   - Percentage of token supply acquired by snipers
   - Count of unique snipers

## Usage

To properly implement this system:

1. The `ponder.config.ts` file needs to be updated to include the UniswapV2Pair contract with the factory pattern (already done)
2. Use the updated sniper utility functions to process swap events
3. Implement the handlers following either the consolidated or separated approach 