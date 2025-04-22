import { parseAbiItem } from "abitype";
import { createConfig, factory } from "ponder";
import { http } from "viem";

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

export default createConfig({
  networks: {
    anvil: {
      chainId: 31337,
      transport: http("http://0.0.0.0:8545"), // Ensure this is the correct URL for your Anvil node
      pollingInterval: 1000, // Poll every 1 second (optional)
      disableCache: true, // Disable caching for development
    },
  },
  contracts: {
    // Factory only emits PairCreated
    UniswapV2Factory: {
      network: "anvil",
      abi: [pairCreatedEvent],
      address: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788", // Update this if your deployment uses a different address
      startBlock: 0,
    },
    // Pair contracts emit Mint, Swap events
    UniswapV2Pair: {
      network: "anvil",
      abi: [mintEvent, swapEvent],
      address: factory({
        address: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788", // Same as UniswapV2Factory address
        event: pairCreatedEvent,
        parameter: "pair",
      }),
      startBlock: 0,
    },
  },
});