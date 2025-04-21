import { parseAbiItem } from "abitype";
import { createConfig, factory } from "ponder";

import { http } from "viem";

import { UniswapV2FactoryABI } from "./abis/UniswapV2FactoryABI";
import { UniswapV3FactoryABI } from "./abis/UniswapV3FactoryABI";
import { mainnet } from "viem/chains";
import path from "path";

const pairCreatedEvent = parseAbiItem(
  "event PairCreated(address indexed token0, address indexed token1, address pair, uint)"
);

const poolCreatedEvent = parseAbiItem(
  "event PoolCreated(address indexed token0, address indexed token1, uint24 fee, int24 tickSpacing, address pool)"
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
      transport: http("http://localhost:8545"),

    },
  },
  contracts: {
    UniswapV2Factory: {
      network: "anvil",
      abi: [pairCreatedEvent, mintEvent, swapEvent],
      address: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // This address might need to change based on your local deployment
      startBlock: 0, // Start from block 0 for local testing
    },
    UniswapV3Factory: {
      network: "anvil",
      abi: [poolCreatedEvent],
      address: "0x1F98431c8aD98523631AE4a59f267346ea31F984", // This address might need to change based on your local deployment
      startBlock: 0, // Start from block 0 for local testing
    }
  },
});
