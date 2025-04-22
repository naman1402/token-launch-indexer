import { parseAbiItem } from "abitype";
import { createConfig } from "ponder";
import { http, getAddress, hexToNumber } from "viem";

// Import your deployment broadcast file
import DeploymentInfo from "./testing/broadcast/Deploy.s.sol/31337/run-latest.json";

// Extract address and start block from broadcast file
// const factoryAddress = getAddress(DeploymentInfo.transactions[0]!.contractAddress);
// const startBlock = hexToNumber(`0x${DeploymentInfo.receipts[0]!.blockNumber}`);

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
      transport: http("http://0.0.0.0:8545"),
      disableCache: true,
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
