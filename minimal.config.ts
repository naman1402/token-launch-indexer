import { createConfig } from "ponder";
import { http } from "viem";

export default createConfig({
  networks: {
    anvil: {
      chainId: 31337,
      transport: http("http://127.0.0.1:8545"),
    },
  },
  contracts: {
    UniswapV2Factory: {
      network: "anvil",
      abi: [
        // PairCreated event
        {
          name: "PairCreated",
          type: "event",
          inputs: [
            { name: "token0", type: "address", indexed: true },
            { name: "token1", type: "address", indexed: true },
            { name: "pair", type: "address", indexed: false },
            { name: "unused", type: "uint256", indexed: false }
          ]
        },
        // Mint event
        {
          name: "Mint",
          type: "event",
          inputs: [
            { name: "sender", type: "address", indexed: true },
            { name: "amount0", type: "uint256", indexed: false },
            { name: "amount1", type: "uint256", indexed: false }
          ]
        },
        // Swap event
        {
          name: "Swap",
          type: "event",
          inputs: [
            { name: "sender", type: "address", indexed: true },
            { name: "amount0In", type: "uint256", indexed: false },
            { name: "amount1In", type: "uint256", indexed: false },
            { name: "amount0Out", type: "uint256", indexed: false },
            { name: "amount1Out", type: "uint256", indexed: false },
            { name: "to", type: "address", indexed: true }
          ]
        }
      ],
      address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      startBlock: 0,
    },
  },
});