import { parseAbiItem } from "abitype";
import { createConfig, factory } from "ponder";
import { http } from "viem";
import { uniswapV2PairABI } from "./abis/UniswapV2PairABI";
import { uniswapV2FactoryABI } from "./abis/UniswapV2FactoryABI";
import { uniswapV3FactoryABI } from "./abis/UniswapV3FactoryABI";
import { uniswapV3PoolABI } from "./abis/UniswapV3PoolABI";

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
      address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      startBlock: 0,
    },
    // Pair contracts using full ABI with factory pattern
    UniswapV2Pair: {
      network: "anvil",
      abi: uniswapV2PairABI,
      address: factory({
        address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        event: parseAbiItem("event PairCreated(address indexed token0, address indexed token1, address pair, uint)"),
        parameter: "pair",
      }),
      startBlock: 0,
    },
    // Include V3 contracts for minimal config as well
    UniswapV3Factory: {
      network: "anvil",
      abi: uniswapV3FactoryABI,
      address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      startBlock: 0,
    },
    UniswapV3Pool: {
      network: "anvil",
      abi: uniswapV3PoolABI,
      address: factory({
        address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
        event: parseAbiItem("event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)"),
        parameter: "pool",
      }),
      startBlock: 0,
    },
  },
});