## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

-   **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
-   **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
-   **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
-   **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

# Feature Factory Testing Environment

This directory contains a complete test environment for Feature Factory, including local deployment of:
- Base tokens (WETH, USDC, USDT)
- Uniswap V2 infrastructure (Factory and Router)
- Token Factory for creating test tokens
- Initial liquidity pools

## Structure

```
testing/
├── src/
│   ├── tokens/               # Token implementations
│   ├── helper/              # Helper contracts and constants
│   └── interfaces/          # Contract interfaces
└── scripts/                # Deployment scripts
```

## Local Testing Setup

1. Deploy everything at once:
```bash
forge script script/Deploy.s.sol --broadcast --rpc-url localhost
```

Or deploy step by step:

2. Deploy base tokens first:
```bash
forge script script/00_DeployBaseTokens.s.sol --broadcast --rpc-url localhost
```

3. Deploy Uniswap V2:
```bash
forge script script/01_DeployUniswapV2.s.sol --broadcast --rpc-url localhost
```

4. Deploy token factory:
```bash
forge script script/02_DeployTokenFactory.s.sol --broadcast --rpc-url localhost
```

5. Create initial liquidity pools:
```bash
forge script script/03_CreateLiquidityPools.s.sol --broadcast --rpc-url localhost
```

## Configuration

All deployment constants and addresses are managed by the `Constants.sol` contract. This includes:
- Initial token supplies
- Token decimals
- Initial liquidity amounts
- Deployed contract addresses

The first deployment will create this contract. Subsequent script runs will use the existing deployment if you provide its address via the CONSTANTS environment variable:

```bash
export CONSTANTS=<deployed_constants_address>
forge script script/SomeScript.s.sol --broadcast --rpc-url localhost
```
