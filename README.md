# 🚀 Token Launch Indexer

<div align="center">
  <img src="https://img.shields.io/badge/built%20with-Ponder-purple" alt="Built with Ponder">
  <img src="https://img.shields.io/badge/powered%20by-TypeScript-blue" alt="Powered by TypeScript">
  <img src="https://img.shields.io/badge/Uniswap-V2%20%26%20V3-pink" alt="Uniswap V2 & V3">
</div>

<br />

This project indexes newly launched tokens on Uniswap, tracking their initial liquidity, sniper activity, funding graphs, and team bundle detection. It provides a comprehensive suite of metrics to analyze the health and behavior of token launches.

## 🔍 Features

- **Token Tracking**: Indexes metadata, total supply, and market cap
- **Liquidity Analysis**: Monitors initial LP provision and liquidity depth
- **Sniper Detection**: Identifies and tracks addresses that buy in the launch block
- **Team Bundles**: Detects suspicious transaction patterns in the launch block
- **Funding Graph**: Maps the flow of funds leading to token deployment
- **API Endpoints**: Provides easy access to all indexed data

## 🏗️ Project Structure

### Schema (`ponder.schema.ts`)

The database schema includes the following tables:

```
tokens       - Token metadata, supply, and market cap
poolsV2      - UniswapV2 pool data and launch metrics
poolsV3      - UniswapV3 pool data (future expansion)
snipers      - Tracks addresses, volume, and token acquisition
funding      - Maps ETH flow leading to token deployment
dummyTable   - For testing database connectivity
```

### Handlers

Event handlers are organized by protocol version and event type:

#### UniswapV2
- `PairCreated.ts`: Detects new token pair creation, extracts token data
- `Mint.ts`: Tracks initial liquidity provision to pairs
- `Swap.ts`: Analyzes trading activity, detects snipers and team bundles

#### UniswapV3 (Support in progress)
- `PoolCreated.ts`: Detects new V3 pool creation
- `Initialize.ts`: Handles pool initialization events
- `Mint.ts`: Tracks liquidity position creation
- `Swap.ts`: Analyzes V3 swap activity

### API (`src/api/index.ts`)

RESTful endpoints to query indexed data:
- `/tokens`: List all indexed tokens
- `/token/:address`: Get details for specific token
- `/pools`: List all indexed pools
- `/pool/:id`: Get details for specific pool
- `/snipers/:poolId`: Get sniper data for a pool
- `/funding/:tokenAddress`: View funding graph for a token
- `/dashboard`: Get aggregate statistics
- `/launch-summary/:tokenAddress`: Comprehensive token launch data

### Utilities

- `baseTokens.ts`: Manages base token detection (WETH, stablecoins)
- `sniper.ts`: Algorithms for sniper detection and analysis
- `funding.ts`: Tools to trace funding paths
- `bundle.ts`: Team bundle detection heuristics
- `getMetadata.ts`: Fetches token metadata from contracts
- `marketCap.ts`: Calculates market capitalization
- `utils.ts`: General helper functions

## 🛠️ Tech Stack

- **[Ponder](https://ponder.sh/)**: Blockchain indexing framework
- **TypeScript**: Type-safe development
- **Hono**: API routing
- **Viem**: Ethereum interactions
- **SQLite**: Database (via PGlite in Ponder)
- **Forge/Anvil**: Local blockchain testing

## 🚀 Getting Started

### Prerequisites
- Node.js (>= 16)
- pnpm or npm
- Foundry (for local testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/token-launch-indexer.git
cd token-launch-indexer

# Install dependencies
pnpm install
```

### Local Development with Anvil

1. Start a local Ethereum node with Anvil:

```bash
anvil
```

2. Deploy the testing contracts:

```bash
cd testing
forge script script/Deploy.s.sol --broadcast --rpc-url http://localhost:8545
```

3. Run the indexer in development mode:

```bash
pnpm ponder dev --config minimal.config.ts
```

The indexer will now track events from your locally deployed Uniswap V2 infrastructure.

### Mainnet Indexing

To index data from Ethereum mainnet:

1. Set up your environment variables:

```bash
# Create .env file
echo "PONDER_RPC_URL_1=YOUR_ETHEREUM_RPC_URL" > .env
```

2. Update the configuration in `ponder.config.ts` with appropriate start blocks.

3. Run the indexer:

```bash
pnpm ponder dev
```

### Production Deployment

For production environments:

```bash
pnpm ponder build
pnpm ponder start
```

## 📊 Analyzing Data

The indexer exposes data through various API endpoints:

- **Web Interface**: http://localhost:42069/
- **Dashboard**: http://localhost:42069/dashboard
- **GraphQL Playground**: http://localhost:42069/graphql

## 🧪 Testing

```bash
# Run tests
pnpm test

# Test with a specific scenario
forge script testing/script/Deploy.s.sol:DeployWithNormalLaunch --broadcast --rpc-url http://localhost:8545
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.