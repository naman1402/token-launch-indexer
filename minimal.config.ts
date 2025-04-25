import { parseAbiItem } from "abitype";
import { createConfig, factory } from "ponder";
import { http } from "viem";
import { uniswapV2PairABI } from "./abis/UniswapV2PairABI";
import { uniswapV2FactoryABI } from "./abis/UniswapV2FactoryABI";
import { uniswapV3FactoryABI } from "./abis/UniswapV3FactoryABI";
import { uniswapV3PoolABI } from "./abis/UniswapV3PoolABI";

// Import utility function to get deployed addresses
import { getContractAddresses } from "./src/utils/getDeployedAddresses";

// Get the latest deployed contract addresses
const addresses = getContractAddresses();

export default createConfig({
  networks: {
    anvil: {
      chainId: 31337,
      transport: http("http://127.0.0.1:8545"),
      pollingInterval: 1000,
      disableCache: true,
    },
  },
  contracts: {
    // Factory using full ABI
    UniswapV2Factory: {
      network: "anvil",
      abi: uniswapV2FactoryABI,
      address: addresses.UNISWAP_V2_FACTORY_ADDRESS,
      startBlock: 0,
    },
    // Pair contracts using full ABI with factory pattern
    UniswapV2Pair: {
      network: "anvil",
      abi: uniswapV2PairABI,
      address: factory({
        address: addresses.UNISWAP_V2_FACTORY_ADDRESS,
        event: parseAbiItem("event PairCreated(address indexed token0, address indexed token1, address pair, uint)"),
        parameter: "pair",
      }),
      startBlock: 0,
    },
    // Include V3 contracts for minimal config as well
    UniswapV3Factory: {
      network: "anvil",
      abi: uniswapV3FactoryABI,
      address: addresses.UNISWAP_V3_FACTORY_ADDRESS,
      startBlock: 0,
    },
    UniswapV3Pool: {
      network: "anvil",
      abi: uniswapV3PoolABI,
      address: factory({
        address: addresses.UNISWAP_V3_FACTORY_ADDRESS,
        event: parseAbiItem("event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)"),
        parameter: "pool",
      }),
      startBlock: 0,
    },
  },
});