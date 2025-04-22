import { parseAbiItem } from "abitype";
import { createConfig, factory } from "ponder";
import { http, getAddress, hexToNumber } from "viem";

// Import your deployment broadcast file
import DeploymentInfo from "./testing/broadcast/Deploy.s.sol/31337/run-latest.json";

// Extract address and start block from broadcast file
// const factoryAddress = getAddress(DeploymentInfo.transactions[0]!.contractAddress);
// const startBlock = hexToNumber(`0x${DeploymentInfo.receipts[0]!.blockNumber}`);

// Uniswap V2 Events
const pairCreatedEvent = parseAbiItem(
  "event PairCreated(address indexed token0, address indexed token1, address pair, uint)"
);

const mintEvent = parseAbiItem(
  "event Mint(address indexed sender, uint amount0, uint amount1)"
)

const swapEvent = parseAbiItem(
  "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)"
)

// Uniswap V3 Events
const poolCreatedEvent = parseAbiItem(
  "event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)"
);

const initializeEvent = parseAbiItem(
  "event Initialize(uint160 sqrtPriceX96, int24 tick)"
);

const v3MintEvent = parseAbiItem(
  "event Mint(address sender, address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)"
);

const v3SwapEvent = parseAbiItem(
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
);

export default createConfig({
  networks: {
    anvil: {
      chainId: 31337,
      transport: http("http://0.0.0.0:8545"),
      disableCache: true,
    },
  },
  contracts: {
    // Factory only emits PairCreated
    UniswapV2Factory: {
      network: "anvil",
      abi: [pairCreatedEvent],
      address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", 
      startBlock: 0,  
    },
    // Pair contracts emit Mint, Swap events
    UniswapV2Pair: {
      network: "anvil",
      abi: [mintEvent, swapEvent],
      address: factory({
        address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        event: pairCreatedEvent,
        parameter: "pair",
      }),
      startBlock: 0,
    },
    // V3 Factory only emits PoolCreated
    UniswapV3Factory: {
      network: "anvil",
      abi: [poolCreatedEvent],
      address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      startBlock: 0,
    },
    // V3 Pool contracts emit Initialize, Mint, Swap events
    UniswapV3Pool: {
      network: "anvil",
      abi: [initializeEvent, v3MintEvent, v3SwapEvent],
      address: factory({
        address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
        event: poolCreatedEvent,
        parameter: "pool",
      }),
      startBlock: 0,
    },
  },
});
