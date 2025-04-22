import { parseAbiItem } from "abitype";
import { createConfig, factory } from "ponder";

import { http } from "viem";

import { UniswapV2FactoryABI } from "./abis/UniswapV2FactoryABI";
import { UniswapV3FactoryABI } from "./abis/UniswapV3FactoryABI";
import { mainnet } from "viem/chains";
import path from "path";

import { FACTORY_ADDRESS } from "./src/utils/deployments";
import { timeout } from "hono/timeout";

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
      // transport: http(process.env.ANVIL_RPC_URL),
      transport: http("http://localhost:8545", {
        timeout: 30000,
        retryCount: 5,
        retryDelay: 1000,
      }),
    },
  },
  contracts: {
    UniswapV2Factory: {
      network: "anvil",
      abi: [pairCreatedEvent, mintEvent, swapEvent],
      address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", 
      startBlock: 0,  
    },
  },
});
